import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';

import { AdminLayout } from '../components/AdminLayout';
import { useConfirmDialog } from '../components/ConfirmDialog';
import { deleteCustomer, getCustomers } from '../services/api';

function formatDate(value) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function csvCell(value) {
  const normalizedValue = value === null || value === undefined ? '' : String(value);
  return `"${normalizedValue.replace(/"/g, '""')}"`;
}

function formatLeadSource(value) {
  const source = String(value || '')
    .trim()
    .toLowerCase();

  const labels = {
    google: 'Google',
    store_register: 'Cadastro da loja',
    store_form: 'Formulario da loja',
    checkout: 'Checkout da loja',
    loja: 'Loja',
    store: 'Loja',
  };

  return labels[source] || (source ? source.replace(/_/g, ' ') : 'Loja');
}

function downloadCsv(customers) {
  const headers = [
    'ID',
    'Nome',
    'Email',
    'Telefone',
    'Origem',
    'Marketing',
    'Pedidos',
    'Ultimo login',
    'Criado em',
  ];
  const rows = customers.map((customer) => [
    customer.id,
    customer.name,
    customer.email,
    customer.phone || '',
    formatLeadSource(customer.leadSource),
    customer.marketingOptIn ? 'sim' : 'não',
    customer._count?.orders || 0,
    formatDate(customer.lastLoginAt),
    formatDate(customer.createdAt),
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `clientes-captados-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const { confirm, confirmDialog } = useConfirmDialog();

  useEffect(() => {
    getCustomers()
      .then((data) => {
        setCustomers(data);
        setError('');
      })
      .catch((requestError) => {
        setError(requestError.message || 'Não foi possível carregar os clientes.');
      });
  }, []);

  async function handleDeleteCustomer(customer) {
    const orderCount = customer._count?.orders || 0;

    if (orderCount > 0) {
      setError('Não é possível excluir cliente com pedidos vinculados.');
      return;
    }

    const confirmed = await confirm({
      title: 'Excluir cliente?',
      message: `${customer.name} será removido da lista de clientes. Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    });

    if (!confirmed) {
      return;
    }

    setDeletingId(customer.id);
    setError('');
    setFeedback('');

    try {
      await deleteCustomer(customer.id);
      setCustomers((current) => current.filter((item) => item.id !== customer.id));
      setFeedback('Cliente excluído com sucesso.');
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível excluir o cliente.');
    } finally {
      setDeletingId(null);
    }
  }

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return customers;
    }

    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(normalizedQuery) ||
        customer.email.toLowerCase().includes(normalizedQuery),
    );
  }, [customers, query]);

  const googleCustomers = useMemo(
    () => customers.filter((customer) => customer.leadSource === 'google').length,
    [customers],
  );

  return (
    <AdminLayout
      title="Clientes"
      subtitle="Leads captados"
      actions={
        <>
          <div className="search-shell">
            <span className="search-icon">Buscar</span>
            <input
              aria-label="Buscar clientes"
              className="search-input"
              placeholder="Buscar clientes..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <button
            type="button"
            className="button button-secondary"
            disabled={!filteredCustomers.length}
            onClick={() => downloadCsv(filteredCustomers)}
          >
            Exportar CSV
          </button>
        </>
      }
    >
      {error ? <div className="panel feedback feedback-error">{error}</div> : null}
      {feedback ? <div className="panel feedback feedback-success">{feedback}</div> : null}
      {confirmDialog}

      <section className="page-summary--split">
        <article className="panel page-summary__card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Base de clientes</p>
              <h3>{customers.length} contato(s)</h3>
            </div>
          </div>
          <div className="page-summary__body">
            <p className="page-summary__text">
              Clientes captados pela loja e prontos para relacionamento.
            </p>
          </div>
        </article>

        <article className="panel page-summary__card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Origem Google</p>
              <h3>{googleCustomers} cadastro(s)</h3>
            </div>
          </div>
          <div className="page-summary__body">
            <p className="page-summary__text">Entradas feitas pelo login Google da loja.</p>
          </div>
        </article>
      </section>

      <section className="panel table-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Relacionamento</p>
            <h3>Clientes cadastrados</h3>
          </div>
          <div className="table-summary">{filteredCustomers.length} registro(s)</div>
        </div>

        {filteredCustomers.length ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contato</th>
                <th>Origem</th>
                <th>Marketing</th>
                <th>Pedidos</th>
                <th>Ultimo login</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <div className="customer-cell">
                      {customer.avatarUrl ? (
                        <img src={customer.avatarUrl} alt={customer.name} />
                      ) : null}
                      <div>
                        <span className="product-title">{customer.name}</span>
                        <span className="product-meta">#{customer.id}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="product-cell">
                      <a className="inline-text-link" href={`mailto:${customer.email}`}>
                        {customer.email}
                      </a>
                      <span className="product-meta">{customer.phone || 'Sem telefone'}</span>
                    </div>
                  </td>
                  <td>
                    <span className="pill category-badge">
                      {formatLeadSource(customer.leadSource)}
                    </span>
                  </td>
                  <td>{customer.marketingOptIn ? 'Sim' : 'Não'}</td>
                  <td>{customer._count?.orders || 0}</td>
                  <td>{formatDate(customer.lastLoginAt || customer.createdAt)}</td>
                  <td>
                    <div className="table-actions">
                      <Link className="button button-secondary table-action-link" to={`/clientes/${customer.id}`}>
                        Ver
                      </Link>
                      {(customer._count?.orders || 0) > 0 ? (
                        <span className="button button-unavailable table-action-link">
                          Excluir bloqueado
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="button button-danger table-action-link"
                          disabled={deletingId === customer.id}
                          onClick={() => handleDeleteCustomer(customer)}
                        >
                          {deletingId === customer.id ? 'Excluindo...' : 'Excluir'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-copy empty-state">Nenhum cliente encontrado.</p>
        )}
      </section>
    </AdminLayout>
  );
}
