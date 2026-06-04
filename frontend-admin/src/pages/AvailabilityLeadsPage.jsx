import { useEffect, useMemo, useState } from 'react';

import { AdminLayout } from '../components/AdminLayout';
import { getAvailabilityLeads, updateAvailabilityLead } from '../services/api';

const STATUS_LABELS = {
  waiting: 'Aguardando',
  ready: 'Pronto para avisar',
  notified: 'Avisado',
  converted: 'Convertido',
  archived: 'Arquivado',
};

function formatDate(value) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function leadStock(lead) {
  return Number(lead.variant?.stock ?? lead.product?.stock ?? 0);
}

function leadStatus(lead) {
  if (lead.status === 'waiting' && leadStock(lead) > 0) {
    return 'ready';
  }

  return lead.status || 'waiting';
}

function contactChannel(lead) {
  if (lead.preferredContact) {
    return lead.preferredContact === 'whatsapp' ? 'WhatsApp' : 'E-mail';
  }

  if (lead.customer?.notifyWhatsApp || lead.phone) {
    return 'WhatsApp';
  }

  return 'E-mail';
}

function whatsappUrl(lead) {
  const phone = String(lead.phone || lead.customer?.phone || '').replace(/\D/g, '');

  if (!phone) {
    return '';
  }

  const productName = [lead.product?.name, lead.variant?.name].filter(Boolean).join(' - ');
  const message = encodeURIComponent(
    `Ola, ${lead.name}. O produto ${productName} voltou ao estoque. Posso te ajudar com a compra?`,
  );

  return `https://wa.me/55${phone.replace(/^55/, '')}?text=${message}`;
}

function groupKey(lead) {
  return `${lead.product?.id || 'removed'}:${lead.variant?.id || 'product'}`;
}

function buildProductGroups(leads) {
  const groups = new Map();

  leads.forEach((lead) => {
    const key = groupKey(lead);
    const currentGroup = groups.get(key) || {
      key,
      product: lead.product,
      variant: lead.variant,
      leads: [],
    };

    currentGroup.leads.push(lead);
    groups.set(key, currentGroup);
  });

  return Array.from(groups.values()).sort((a, b) => {
    const aReady = a.leads.filter((lead) => leadStatus(lead) === 'ready').length;
    const bReady = b.leads.filter((lead) => leadStatus(lead) === 'ready').length;

    if (aReady !== bReady) {
      return bReady - aReady;
    }

    return b.leads.length - a.leads.length;
  });
}

export function AvailabilityLeadsPage() {
  const [leads, setLeads] = useState([]);
  const [filter, setFilter] = useState('active');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busyLeadId, setBusyLeadId] = useState(null);

  useEffect(() => {
    getAvailabilityLeads()
      .then((data) => {
        setLeads(data);
        setError('');
      })
      .catch((requestError) => {
        setError(requestError.message || 'Não foi possível carregar os avisos.');
      });
  }, []);

  const filteredLeads = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return leads.filter((lead) => {
      const status = leadStatus(lead);
      const matchesFilter =
        filter === 'all' ||
        (filter === 'active' && !['converted', 'archived'].includes(status)) ||
        status === filter;
      const searchable = [
        lead.name,
        lead.email,
        lead.phone,
        lead.product?.name,
        lead.variant?.name,
        lead.product?.category?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesFilter && (!normalizedSearch || searchable.includes(normalizedSearch));
    });
  }, [filter, leads, search]);

  const groups = useMemo(() => buildProductGroups(filteredLeads), [filteredLeads]);

  const stats = useMemo(() => {
    const ready = leads.filter((lead) => leadStatus(lead) === 'ready').length;
    const waiting = leads.filter((lead) => leadStatus(lead) === 'waiting').length;
    const active = leads.filter((lead) => !['converted', 'archived'].includes(leadStatus(lead))).length;
    const products = new Set(leads.map(groupKey)).size;

    return { ready, waiting, active, products };
  }, [leads]);

  async function changeLeadStatus(lead, status) {
    setBusyLeadId(lead.id);
    setFeedback('');

    try {
      const updatedLead = await updateAvailabilityLead(lead.id, { status });
      setLeads((current) =>
        current.map((currentLead) => (currentLead.id === updatedLead.id ? updatedLead : currentLead)),
      );
      setFeedback(`Aviso de ${lead.name} atualizado para "${STATUS_LABELS[status]}".`);
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível atualizar o aviso.');
    } finally {
      setBusyLeadId(null);
    }
  }

  async function copyContact(lead) {
    const text = [lead.name, lead.email, lead.phone].filter(Boolean).join(' | ');

    try {
      await navigator.clipboard.writeText(text);
      setFeedback('Contato copiado.');
    } catch {
      setFeedback(text);
    }
  }

  return (
    <AdminLayout title="Avisos de disponibilidade" subtitle="Demanda por produtos sem estoque">
      {error ? <div className="panel feedback feedback-error">{error}</div> : null}
      {feedback ? <div className="panel feedback feedback-success">{feedback}</div> : null}

      <section className="panel page-summary">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Lista de espera</p>
            <h3>Produtos com clientes esperando reposicao</h3>
          </div>
        </div>

        <div className="page-summary__body">
          <div className="availability-stats">
            <article>
              <span>Ativos</span>
              <strong>{stats.active}</strong>
            </article>
            <article>
              <span>Prontos</span>
              <strong>{stats.ready}</strong>
            </article>
            <article>
              <span>Aguardando</span>
              <strong>{stats.waiting}</strong>
            </article>
            <article>
              <span>Produtos</span>
              <strong>{stats.products}</strong>
            </article>
          </div>
        </div>
      </section>

      <section className="panel page-summary">
        <input
          className="search-input"
          placeholder="Buscar cliente, produto, e-mail ou telefone"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select
          className="orders-filter-select"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="active">Ativos</option>
          <option value="ready">Prontos para avisar</option>
          <option value="waiting">Aguardando estoque</option>
          <option value="notified">Avisados</option>
          <option value="converted">Convertidos</option>
          <option value="archived">Arquivados</option>
          <option value="all">Todos</option>
        </select>
      </section>

      <section className="availability-groups">
        {groups.length ? (
          groups.map((group) => {
            const productName = group.product?.name || 'Produto removido';
            const variantName = group.variant?.name || '';
            const stock = Number(group.variant?.stock ?? group.product?.stock ?? 0);
            const readyCount = group.leads.filter((lead) => leadStatus(lead) === 'ready').length;

            return (
              <article className="panel availability-group" key={group.key}>
                <div className="availability-group-head">
                  <div>
                    <p className="eyebrow">{group.product?.category?.name || 'Sem categoria'}</p>
                    <h3>{variantName ? `${productName} - ${variantName}` : productName}</h3>
                    <span>
                      {group.leads.length} interessado(s) · estoque atual: {stock}
                    </span>
                  </div>
                  <span className={`pill availability-status${readyCount ? ' is-ready' : ''}`}>
                    {readyCount ? `${readyCount} pronto(s)` : 'aguardando'}
                  </span>
                </div>

                <div className="availability-lead-list">
                  {group.leads.map((lead) => {
                    const status = leadStatus(lead);
                    const phone = lead.phone || lead.customer?.phone || '';
                    const whatsapp = whatsappUrl(lead);

                    return (
                      <div className="availability-lead-row" key={lead.id}>
                        <div className="availability-contact">
                          <strong>{lead.name}</strong>
                          <span>{lead.email}</span>
                          <small>
                            {phone || 'Sem telefone'} · {contactChannel(lead)} · recebido em{' '}
                            {formatDate(lead.createdAt)}
                          </small>
                        </div>

                        <span className={`pill availability-status is-${status}`}>
                          {STATUS_LABELS[status] || STATUS_LABELS.waiting}
                        </span>

                        <div className="availability-actions">
                          <a className="button button-secondary" href={`mailto:${lead.email}`}>
                            E-mail
                          </a>
                          {whatsapp ? (
                            <a
                              className="button button-secondary"
                              href={whatsapp}
                              target="_blank"
                              rel="noreferrer"
                            >
                              WhatsApp
                            </a>
                          ) : null}
                          <button
                            type="button"
                            className="button button-secondary"
                            onClick={() => copyContact(lead)}
                          >
                            Copiar
                          </button>
                          <button
                            type="button"
                            className="button button-primary"
                            disabled={busyLeadId === lead.id}
                            onClick={() => changeLeadStatus(lead, 'notified')}
                          >
                            Avisado
                          </button>
                          <button
                            type="button"
                            className="button button-secondary"
                            disabled={busyLeadId === lead.id}
                            onClick={() => changeLeadStatus(lead, 'converted')}
                          >
                            Comprou
                          </button>
                          <button
                            type="button"
                            className="button button-secondary"
                            disabled={busyLeadId === lead.id}
                            onClick={() => changeLeadStatus(lead, 'archived')}
                          >
                            Arquivar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })
        ) : (
          <div className="panel empty-state">
            Nenhum aviso encontrado para este filtro.
          </div>
        )}
      </section>
    </AdminLayout>
  );
}
