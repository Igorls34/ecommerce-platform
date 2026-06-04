import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const AdminLayout = lazy(() => import('./components/AdminLayout').then(m => ({ default: m.AdminLayout })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ProductsPage = lazy(() => import('./pages/ProductsPage').then(m => ({ default: m.ProductsPage })));
const ProductFormPage = lazy(() => import('./pages/ProductFormPage').then(m => ({ default: m.ProductFormPage })));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage').then(m => ({ default: m.CategoriesPage })));
const OrdersPage = lazy(() => import('./pages/OrdersPage').then(m => ({ default: m.OrdersPage })));
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage').then(m => ({ default: m.OrderDetailPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));

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
