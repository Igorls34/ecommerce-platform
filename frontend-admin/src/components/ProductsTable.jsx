import { resolveAssetUrl } from '../lib/assets';
import { formatCurrency } from '../lib/formatters';

function getPaginationPages(currentPage, totalPages) {
  const visiblePages = 5;
  const firstPage = Math.max(1, Math.min(currentPage - 2, totalPages - visiblePages + 1));
  const lastPage = Math.min(totalPages, firstPage + visiblePages - 1);

  return Array.from({ length: lastPage - firstPage + 1 }, (_, index) => firstPage + index);
}

export function ProductsTable({ products, pagination, onEdit, onDelete }) {
  if (!products.length) {
    return (
      <div className="panel empty-state">
        <h3>Nenhum produto encontrado.</h3>
        <p>Ajuste os filtros ou cadastre um novo item para continuar o catálogo.</p>
      </div>
    );
  }

  const totalItems = pagination?.totalItems ?? products.length;
  const totalPages = pagination?.totalPages ?? 1;
  const currentPage = pagination?.currentPage ?? 1;
  const pageSize = pagination?.pageSize ?? products.length;
  const startItem = totalItems ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  const pages = getPaginationPages(currentPage, totalPages);

  return (
    <div className="panel table-panel products-table-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Catálogo</p>
          <h3>Produtos cadastrados</h3>
        </div>
        <div className="table-summary">
          {startItem}-{endItem} de {totalItems} item(ns)
        </div>
      </div>

      <div className="products-card-grid">
        {products.map((product) => {
          const stock = Number(product.stock || 0);
          const stockLabel =
            stock <= 0 ? 'Sem estoque' : stock <= 3 ? 'Baixo estoque' : 'Em estoque';
          const stockClassName = stock <= 0 ? 'is-out-stock' : stock <= 3 ? 'is-low-stock' : '';
          const displayImageUrl = resolveAssetUrl(
            product.imageUrl || product.images?.[0]?.imageUrl || '',
          );

          return (
            <article key={product.id} className="product-admin-card">
              <div className="product-admin-media">
                {displayImageUrl ? (
                  <img src={displayImageUrl} alt={product.name} />
                ) : (
                  <div className="product-admin-media-empty">
                    <span>Sem imagem</span>
                  </div>
                )}
              </div>

              <div className="product-admin-body">
                <div className="product-admin-head">
                  <div className="product-admin-title">
                    <span className="product-admin-id">#{product.id}</span>
                    <h4>{product.name}</h4>
                  </div>
                  <span className="pill category-badge">
                    {product.category?.name || 'Sem categoria'}
                  </span>
                </div>

                <p className="product-admin-description">
                  {product.description || 'Sem descrição cadastrada.'}
                </p>

                <div className="product-admin-metrics">
                  <div>
                    <span>Preco</span>
                    <strong>{formatCurrency(product.price)}</strong>
                  </div>
                  <div className={stockClassName}>
                    <span>{stockLabel}</span>
                    <strong>{stock}</strong>
                  </div>
                  <div>
                    <span>Visível</span>
                    <strong>{product.visible !== false ? 'Sim' : 'Não'}</strong>
                  </div>
                </div>
              </div>

              <div className="product-admin-actions">
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => onEdit(product)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="button button-danger"
                  onClick={() => onDelete(product)}
                >
                  Excluir
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {pagination && totalPages > 1 ? (
        <nav className="pagination-bar" aria-label="Paginação de produtos">
          <button
            type="button"
            className="pagination-button"
            disabled={currentPage === 1}
            onClick={() => pagination.onPageChange(currentPage - 1)}
          >
            Anterior
          </button>

          <div className="pagination-pages">
            {pages.map((page) => (
              <button
                key={page}
                type="button"
                className={`pagination-page${page === currentPage ? ' is-active' : ''}`}
                aria-current={page === currentPage ? 'page' : undefined}
                onClick={() => pagination.onPageChange(page)}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="pagination-button"
            disabled={currentPage === totalPages}
            onClick={() => pagination.onPageChange(currentPage + 1)}
          >
            Próxima
          </button>
        </nav>
      ) : null}
    </div>
  );
}
