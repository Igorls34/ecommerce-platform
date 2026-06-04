import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { AdminLayout } from '../components/AdminLayout';
import { DashboardCharts } from '../components/DashboardCharts';
import { StatsGrid } from '../components/StatsGrid';
import {
  buildDashboardSummary,
  classifyDashboardStock,
  getFriendlyOrderStatus,
  getOrderActionLabel,
  normalizeDashboardSummary,
} from '../lib/dashboard';
import { formatCurrency, formatDateBR } from '../lib/formatters';
import { getCategories, getCustomers, getDashboard, getOrders, getProducts } from '../services/api';

export function DashboardPage() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    getDashboard()
      .then((dashboardData) => {
        if (!active) {
          return;
        }

        setProducts(dashboardData.recentProducts || []);
        setOrders(dashboardData.recentOrders || []);
        setCustomers([]);
        setCategories([]);
        setDashboardSummary(normalizeDashboardSummary(dashboardData.summary));
      })
      .catch(() => {
        Promise.all([getProducts(), getOrders(), getCustomers(), getCategories()])
          .then(([productsData, ordersData, customersData, categoriesData]) => {
            if (!active) {
              return;
            }

            setProducts(productsData);
            setOrders(ordersData);
            setCustomers(customersData);
            setCategories(categoriesData);
          })
          .catch((requestError) => {
            if (active) {
              setError(requestError.message || 'Não foi possível carregar o dashboard.');
            }
          });
      });

    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(
    () =>
      dashboardSummary ||
      buildDashboardSummary({
        products,
        orders,
        customers,
        categories,
      }),
    [dashboardSummary, products, orders, customers, categories],
  );
  const recentProducts = useMemo(
    () => [...products].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 5),
    [products],
  );
  const recentOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 5);
  }, [orders]);
  const lowStockProducts = useMemo(
    () =>
      [...products]
        .filter((product) => Number(product.stock || 0) <= 10)
        .sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0))
        .slice(0, 5),
    [products],
  );

  function handleGeneratePdf() {
    const previousTitle = document.title;
    document.title = `relatorio-dashboard-${new Date().toISOString().slice(0, 10)}`;
    window.print();
    window.setTimeout(() => {
      document.title = previousTitle;
    }, 500);
  }

  return (
    <AdminLayout
      title="Dashboard Administrativo"
      subtitle="Visão geral da loja"
      actions={
        <>
          <select className="admin-filter-select" value="all" aria-label="Filtro de período" disabled>
            <option value="all">Todo o período</option>
          </select>
          <button type="button" className="button button-secondary" onClick={handleGeneratePdf}>
            Gerar PDF completo
          </button>
          <Link className="button button-primary" to="/produtos/novo">
            Novo Produto
          </Link>
        </>
      }
    >
      {error ? <div className="panel feedback feedback-error">{error}</div> : null}
      <section className="dashboard-print-cover">
        <p className="eyebrow">Relatório do sistema</p>
        <h1>Dashboard Administrativo</h1>
        <span>
          Gerado em{' '}
          {new Intl.DateTimeFormat('pt-BR', {
            dateStyle: 'full',
            timeStyle: 'short',
          }).format(new Date())}
        </span>
      </section>

      <StatsGrid summary={summary} />
      <div className="dashboard-screen-summary">
        <DashboardCharts summary={summary} />
      </div>
      <div className="dashboard-print-details">
        <DashboardCharts summary={summary} />
      </div>

      <section className="dashboard-bottom-grid">
        <section className="panel table-panel">
          <div className="section-heading">
            <div>
              <h3>Pedidos recentes</h3>
            </div>
          </div>

          {recentOrders.length ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Data</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Ação recomendada</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td>{order.customer?.name || 'Cliente não informado'}</td>
                    <td>{formatDateBR(order.createdAt)}</td>
                    <td>{formatCurrency(order.total)}</td>
                    <td>{getFriendlyOrderStatus(order.status)}</td>
                    <td>{getOrderActionLabel(order)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-copy">Nenhum pedido registrado ainda.</p>
          )}
        </section>

        <section className="panel table-panel">
          <div className="section-heading">
            <div>
              <h3>Produtos recentes</h3>
            </div>
          </div>

          {recentProducts.length ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Categoria</th>
                  <th>Preço</th>
                  <th>Estoque</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {recentProducts.map((product) => (
                  <tr key={product.id}>
                    <td>#{product.id}</td>
                    <td>{product.name || 'Produto sem nome'}</td>
                    <td>{product.category?.name || 'Sem categoria'}</td>
                    <td>{formatCurrency(product.price)}</td>
                    <td>{Number(product.stock || 0).toLocaleString('pt-BR')}</td>
                    <td>{classifyDashboardStock(product.stock)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-copy">Nenhum produto cadastrado ainda.</p>
          )}
        </section>

        <section className="panel table-panel dashboard-card-wide">
          <div className="section-heading">
            <div>
              <h3>Produtos com estoque baixo</h3>
            </div>
          </div>

          {lowStockProducts.length ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Categoria</th>
                  <th>Estoque</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.map((product) => (
                  <tr key={product.id}>
                    <td>#{product.id}</td>
                    <td>{product.name || 'Produto sem nome'}</td>
                    <td>{product.category?.name || 'Sem categoria'}</td>
                    <td>{Number(product.stock || 0).toLocaleString('pt-BR')}</td>
                    <td>{classifyDashboardStock(product.stock)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-copy">Nenhum produto em alerta de estoque no momento.</p>
          )}
        </section>
      </section>
    </AdminLayout>
  );
}
