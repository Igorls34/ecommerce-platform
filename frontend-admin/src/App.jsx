import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const AdminLayout = lazy(() => import('./components/AdminLayout'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const ProductFormPage = lazy(() => import('./pages/ProductFormPage'));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

const Loading = () => (
  <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 300 }}>
    <div className="spinner-border" role="status" />
  </div>
);

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/entrar" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AdminLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/pedidos" element={<OrdersPage />} />
          <Route path="/pedidos/:orderId" element={<OrderDetailPage />} />
          <Route path="/produtos" element={<ProductsPage />} />
          <Route path="/produtos/novo" element={<ProductFormPage />} />
          <Route path="/produtos/:id" element={<ProductFormPage />} />
          <Route path="/categorias" element={<CategoriesPage />} />
          <Route path="/configuracoes" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/entrar" replace />} />
      </Routes>
    </Suspense>
  );
}
