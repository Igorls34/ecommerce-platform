import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AdminLayout } from '../components/AdminLayout';
import { useConfirmDialog } from '../components/ConfirmDialog';
import { ProductsTable } from '../components/ProductsTable';
import { deleteProduct, getCategories, getProducts } from '../services/api';

const PRODUCTS_PER_PAGE = 10;

export function ProductsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState('');
  const { confirm, confirmDialog } = useConfirmDialog();

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, categoryFilter, stockFilter, sortBy]);

  async function loadProducts() {
    try {
      const data = await getProducts();
      setProducts(data);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível carregar os produtos.');
    }
  }

  async function loadCategories() {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch {
      setCategories([]);
    }
  }

  async function handleDelete(product) {
    const confirmed = await confirm({
      title: 'Excluir produto?',
      message: `O produto "${product.name}" será removido do catálogo.`,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteProduct(product.id);
      await loadProducts();
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível excluir o produto.');
    }
  }

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return products
      .filter((product) => {
        if (!normalizedQuery) {
          return true;
        }

        const searchableText = [product.name, product.description, product.category?.name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchableText.includes(normalizedQuery);
      })
      .filter((product) => {
        if (categoryFilter === 'all') {
          return true;
        }

        return Number(product.categoryId) === Number(categoryFilter);
      })
      .filter((product) => {
        const stock = Number(product.stock || 0);

        if (stockFilter === 'low') {
          return stock <= 3;
        }

        if (stockFilter === 'out') {
          return stock <= 0;
        }

        if (stockFilter === 'missing-image') {
          return !product.imageUrl;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR');
        }

        if (sortBy === 'stock') {
          return Number(a.stock || 0) - Number(b.stock || 0);
        }

        if (sortBy === 'price-desc') {
          return Number(b.price || 0) - Number(a.price || 0);
        }

        if (sortBy === 'price-asc') {
          return Number(a.price || 0) - Number(b.price || 0);
        }

        return Number(b.id || 0) - Number(a.id || 0);
      });
  }, [products, query, categoryFilter, stockFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const effectivePage = Math.min(currentPage, totalPages);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (effectivePage - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
  }, [filteredProducts, effectivePage]);

  const pagination = {
    currentPage: effectivePage,
    pageSize: PRODUCTS_PER_PAGE,
    totalItems: filteredProducts.length,
    totalPages,
    onPageChange: setCurrentPage,
  };

  return (
    <AdminLayout
      title="Produtos"
      subtitle="Catálogo administrativo"
      actions={
        <>
          <div className="search-shell">
            <span className="search-icon" aria-hidden="true">
              Buscar
            </span>
            <input
              aria-label="Buscar produtos"
              className="search-input"
              placeholder="Nome, descrição ou categoria"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <select
            aria-label="Filtrar produtos por categoria"
            className="admin-filter-select"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="all">Todas as categorias</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrar produtos por estoque"
            className="admin-filter-select"
            value={stockFilter}
            onChange={(event) => setStockFilter(event.target.value)}
          >
            <option value="all">Todos os estoques</option>
            <option value="low">Baixo estoque</option>
            <option value="out">Sem estoque</option>
            <option value="missing-image">Sem imagem</option>
          </select>
          <select
            aria-label="Ordenar produtos"
            className="admin-filter-select"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
          >
            <option value="recent">Mais recentes</option>
            <option value="name">Nome</option>
            <option value="stock">Menor estoque</option>
            <option value="price-desc">Maior preço</option>
            <option value="price-asc">Menor preço</option>
          </select>
          <Link className="button button-primary" to="/produtos/novo">
            Novo Produto
          </Link>
        </>
      }
    >
      {confirmDialog}
      {error ? <div className="panel feedback feedback-error">{error}</div> : null}

      <ProductsTable
        products={paginatedProducts}
        pagination={pagination}
        onEdit={(product) => navigate(`/produtos/${product.id}/editar`)}
        onDelete={handleDelete}
      />
    </AdminLayout>
  );
}
