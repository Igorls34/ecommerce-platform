import { Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from './components/ProtectedRoute';
import { ToastProvider } from './components/ToastProvider';
import { AvailabilityLeadsPage } from './pages/AvailabilityLeadsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { CategoryFormPage } from './pages/CategoryFormPage';
import { CustomersPage } from './pages/CustomersPage';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { OrdersPage } from './pages/OrdersPage';
import { ProductFormPage } from './pages/ProductFormPage';
import { ProductsPage } from './pages/ProductsPage';

export default function App() {
  return (
    <ToastProvider>
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/categorias"
        element={
          <ProtectedRoute>
            <CategoriesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/categorias/nova"
        element={
          <ProtectedRoute>
            <CategoryFormPage mode="create" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/categorias/:categoryId/editar"
        element={
          <ProtectedRoute>
            <CategoryFormPage mode="edit" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/avisos"
        element={
          <ProtectedRoute>
            <AvailabilityLeadsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clientes"
        element={
          <ProtectedRoute>
            <CustomersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clientes/:customerId"
        element={
          <ProtectedRoute>
            <CustomerDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pedidos"
        element={
          <ProtectedRoute>
            <OrdersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pedidos/:orderId"
        element={
          <ProtectedRoute>
            <OrderDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/produtos"
        element={
          <ProtectedRoute>
            <ProductsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/produtos/novo"
        element={
          <ProtectedRoute>
            <ProductFormPage mode="create" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/produtos/:productId/editar"
        element={
          <ProtectedRoute>
            <ProductFormPage mode="edit" />
          </ProtectedRoute>
        }
      />
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <NotFoundPage />
          </ProtectedRoute>
        }
      />
    </Routes>
    </ToastProvider>
  );
}
