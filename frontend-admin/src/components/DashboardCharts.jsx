import { formatCurrency, formatPercent, pluralize } from '../lib/formatters';

const BAR_COLORS = {
  danger: '#9f3a3a',
  warning: '#a76f1d',
  success: '#62a278',
  accent: '#475569',
  neutral: '#94a3b8',
};

export function DashboardCharts({ summary }) {
  const orderStatusMax = Math.max(...summary.orderStatusDistribution.map((item) => item.value), 0);
  const timelineMax = Math.max(...summary.last7DaysTimeline.map((item) => item.orders), 0);
  const categoryStockMax = Math.max(...summary.topCategoriesByStock.map((item) => item.stock), 0);

  return (
    <>
      <section className="dashboard-grid dashboard-grid-analytics">
        <article className="panel dashboard-card dashboard-card-wide">
          <div className="section-heading dashboard-heading">
            <div>
              <h3>Alertas operacionais</h3>
              <p className="table-summary">O que precisa de atenção agora.</p>
            </div>
          </div>

          <div className="dashboard-insights-list dashboard-alerts-grid">
            {(summary.operationalAlerts || []).map((alert, index) => (
              <div key={`${alert.title}-${index}`} className={`dashboard-alert is-${alert.tone}`}>
                <strong>{alert.title}</strong>
                <p>{alert.message}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel dashboard-card">
          <div className="section-heading dashboard-heading">
            <div>
              <h3>Pedidos por status</h3>
              <p className="table-summary">Onde os pedidos estão travando.</p>
            </div>
          </div>

          {summary.orderStatusDistribution.some((item) => item.value > 0) ? (
            <div className="bars-chart">
              {summary.orderStatusDistribution.map((item) => (
                <div key={item.label} className="bar-card">
                  <div className="bar-copy">
                    <strong>{item.label}</strong>
                    <span>{pluralize(item.value, 'pedido')}</span>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${orderStatusMax ? Math.max((item.value / orderStatusMax) * 100, item.value ? 10 : 0) : 0}%`,
                        background: BAR_COLORS[item.tone] || BAR_COLORS.neutral,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-copy dashboard-empty">Ainda não há pedidos para analisar.</p>
          )}
        </article>

        <article className="panel dashboard-card">
          <div className="section-heading dashboard-heading">
            <div>
              <h3>Fluxo dos últimos 7 dias</h3>
              <p className="table-summary">Pedidos criados, pagos, pendentes e cancelados.</p>
            </div>
          </div>

          {summary.last7DaysTimeline.some((item) => item.orders || item.paidRevenue) ? (
            <div className="timeline-card timeline-card-compact">
              <div className="timeline-bars-simple">
                {summary.last7DaysTimeline.map((item) => (
                  <div key={item.label} className="timeline-day-card">
                    <div className="timeline-day-bars">
                      <span
                        className="timeline-day-bar is-total"
                        style={{
                          height: `${timelineMax ? Math.max((item.orders / timelineMax) * 100, item.orders ? 12 : 0) : 0}%`,
                        }}
                        title={`${item.orders} pedido(s)`}
                      />
                      <span
                        className="timeline-day-bar is-paid"
                        style={{
                          height: `${timelineMax ? Math.max((item.paidOrders / timelineMax) * 100, item.paidOrders ? 12 : 0) : 0}%`,
                        }}
                        title={`${item.paidOrders || 0} pago(s)`}
                      />
                      <span
                        className="timeline-day-bar is-pending"
                        style={{
                          height: `${timelineMax ? Math.max((item.pendingOrders / timelineMax) * 100, item.pendingOrders ? 12 : 0) : 0}%`,
                        }}
                        title={`${item.pendingOrders || 0} pendente(s)`}
                      />
                      <span
                        className="timeline-day-bar is-canceled"
                        style={{
                          height: `${timelineMax ? Math.max((item.canceledOrders / timelineMax) * 100, item.canceledOrders ? 12 : 0) : 0}%`,
                        }}
                        title={`${item.canceledOrders || 0} cancelado(s)`}
                      />
                    </div>
                    <strong>{item.weekday}</strong>
                    <small>{formatCurrency(item.paidRevenue)}</small>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="empty-copy dashboard-empty">
              Ainda não há movimentação suficiente nos últimos 7 dias.
            </p>
          )}
        </article>

        <article className="panel dashboard-card dashboard-card-wide">
          <div className="section-heading dashboard-heading">
            <div>
              <h3>Estoque por categoria</h3>
              <p className="table-summary">Produtos e unidades concentrados por categoria.</p>
            </div>
          </div>

          {summary.topCategoriesByStock.length ? (
            <div className="bars-chart">
              {summary.topCategoriesByStock.map((item) => (
                <div key={item.label} className="bar-card">
                  <div className="bar-copy">
                    <strong>{item.label}</strong>
                    <span>
                      {pluralize(item.products, 'produto')} | {pluralize(item.stock, 'unidade')}
                    </span>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill is-warning"
                      style={{
                        width: `${categoryStockMax ? Math.max((item.stock / categoryStockMax) * 100, item.stock ? 10 : 0) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-copy dashboard-empty">Sem categorias suficientes para comparar.</p>
          )}
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid-analytics">
        <article className="panel dashboard-card dashboard-card-wide">
          <div className="section-heading dashboard-heading">
            <div>
              <h3>Funil comercial</h3>
              <p className="table-summary">Do cadastro até o pedido entregue.</p>
            </div>
          </div>

          <div className="funnel-chart funnel-chart-horizontal">
            {summary.conversionStages.map((stage, index) => {
              const previousPercent = stage.previousValue ? (stage.value / stage.previousValue) * 100 : 0;
              const basePercent = stage.baseValue ? (stage.value / stage.baseValue) * 100 : 0;

              return (
                <div key={stage.label} className={`funnel-step is-${stage.tone}`}>
                  <span>{index + 1}</span>
                  <strong>{stage.label}</strong>
                  <small>
                    {Number(stage.value || 0).toLocaleString('pt-BR')} | {formatPercent(previousPercent)} da etapa anterior
                  </small>
                  <small>{formatPercent(basePercent)} do início</small>
                </div>
              );
            })}
          </div>
        </article>

        <article className="panel dashboard-card dashboard-card-wide">
          <div className="section-heading dashboard-heading">
            <div>
              <h3>Estoque e categorias</h3>
              <p className="table-summary">Leitura objetiva do catálogo e da reposição.</p>
            </div>
          </div>

          <div className="dashboard-insights-grid dashboard-inventory-grid">
            {summary.stockByBand.map((item) => (
              <div key={item.label} className="dashboard-insight-card">
                <span className="stat-label">{item.label}</span>
                <strong>{pluralize(item.value, 'produto')}</strong>
                <small>{item.tone === 'success' ? 'Sem ação imediata' : 'Revisar estoque'}</small>
              </div>
            ))}
            <div className="dashboard-insight-card">
              <span className="stat-label">Categorias cadastradas</span>
              <strong>{summary.totalCategories || 0}</strong>
              <small>
                {summary.categoriesWithProducts || 0} com produtos e {summary.emptyCategories || 0} vazias
              </small>
            </div>
            <div className="dashboard-insight-card">
              <span className="stat-label">Maior categoria por produtos</span>
              <strong>{summary.categoryWithMostProducts?.label || 'Sem dados'}</strong>
              <small>{pluralize(summary.categoryWithMostProducts?.value || 0, 'produto')}</small>
            </div>
            <div className="dashboard-insight-card">
              <span className="stat-label">Maior categoria por estoque</span>
              <strong>{summary.categoryWithMostStock?.label || 'Sem dados'}</strong>
              <small>{pluralize(summary.categoryWithMostStock?.stock || 0, 'unidade')}</small>
            </div>
          </div>
        </article>

        <article className="panel dashboard-card dashboard-card-wide">
          <div className="section-heading dashboard-heading">
            <div>
              <h3>Análise automática do período</h3>
              <p className="table-summary">Leitura gerencial gerada a partir dos dados reais.</p>
            </div>
          </div>

          <div className="dashboard-analysis-copy">
            <p>{summary.automaticAnalysisText || 'Nenhum alerta crítico encontrado no momento.'}</p>
          </div>

          <div className="dashboard-insights-list dashboard-insights-list-compact">
            {(summary.automaticInsights || []).map((insight, index) => (
              <div key={`${insight.title}-${index}`} className={`dashboard-alert is-${insight.tone}`}>
                <strong>{insight.title}</strong>
                <p>{insight.message}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}
