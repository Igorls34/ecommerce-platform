import { Router } from 'express';

import { getAdminNotifications } from '../../controllers/AdminNotificationController';
import { getAdminDashboard } from '../../controllers/AdminDashboardController';
import {
  checkoutAdminOrderShippingLabel,
  confirmAdminOrderPayment,
  createAdminOrderShippingLabel,
  createFullAdminOrderShippingLabel,
  generateAdminOrderShippingLabel,
  getAdminOrderById,
  getAdminOrders,
  printAdminOrderShippingLabel,
  updateAdminOrderDetails,
  updateAdminOrderStatus,
} from '../../controllers/AdminOrderController';
import { loginAdmin } from '../../controllers/AuthController';
import {
  getAvailabilityLeads,
  updateAvailabilityLead,
} from '../../controllers/AvailabilityLeadController';
import {
  createCategory,
  deleteCategory,
  getAllCategories,
  updateCategory,
} from '../../controllers/CategoryController';
import {
  deleteAdminCustomer,
  getAdminCustomerById,
  getAdminCustomers,
  updateAdminCustomer,
} from '../../controllers/CustomerController';
import {
  getFiscalIntegrationStatus,
  getOrderFiscalDocuments,
  issueOrderFiscalDocument,
  prepareOrderFiscalDocument,
  syncOrderFiscalDocument,
} from '../../controllers/FiscalController';
import {
  getMelhorEnvioAccount,
  getMelhorEnvioBalance,
} from '../../controllers/MelhorEnvioController';
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
  updateProduct,
} from '../../controllers/ProductController';
import {
  getStoreSettings,
  updateStoreSettings,
} from '../../controllers/SettingsController';
import { uploadProductImage } from '../../controllers/UploadController';
import { authenticateAdmin } from '../../middlewares/authenticateAdmin';
import { loginRateLimiter } from '../../middlewares/rateLimiter';
import { upload } from '../../middlewares/upload';

const adminRoutes = Router();

adminRoutes.post('/login', loginRateLimiter, loginAdmin);
adminRoutes.use(authenticateAdmin);

adminRoutes.post('/upload-image', upload.single('image'), uploadProductImage);
adminRoutes.get('/dashboard', getAdminDashboard);
adminRoutes.get('/notifications', getAdminNotifications);
adminRoutes.get('/fiscal/status', getFiscalIntegrationStatus);
adminRoutes.get('/melhor-envio/account', getMelhorEnvioAccount);
adminRoutes.get('/melhor-envio/balance', getMelhorEnvioBalance);
adminRoutes.get('/availability-leads', getAvailabilityLeads);
adminRoutes.patch('/availability-leads/:id', updateAvailabilityLead);
adminRoutes.put('/availability-leads/:id', updateAvailabilityLead);
adminRoutes.get('/customers', getAdminCustomers);
adminRoutes.get('/customers/:id', getAdminCustomerById);
adminRoutes.put('/customers/:id', updateAdminCustomer);
adminRoutes.delete('/customers/:id', deleteAdminCustomer);
adminRoutes.get('/orders', getAdminOrders);
adminRoutes.put('/orders/:id/details', updateAdminOrderDetails);
adminRoutes.put('/orders/:id/status', updateAdminOrderStatus);
adminRoutes.post('/orders/:id/confirm-payment', confirmAdminOrderPayment);
adminRoutes.post('/orders/:id/shipping-label/full', createFullAdminOrderShippingLabel);
adminRoutes.post('/orders/:id/shipping-label/cart', createAdminOrderShippingLabel);
adminRoutes.post('/orders/:id/shipping-label/checkout', checkoutAdminOrderShippingLabel);
adminRoutes.post('/orders/:id/shipping-label/generate', generateAdminOrderShippingLabel);
adminRoutes.post('/orders/:id/shipping-label/print', printAdminOrderShippingLabel);
adminRoutes.get('/orders/:id/fiscal-documents', getOrderFiscalDocuments);
adminRoutes.post('/orders/:id/fiscal-documents/prepare', prepareOrderFiscalDocument);
adminRoutes.post('/orders/:id/fiscal-documents/issue', issueOrderFiscalDocument);
adminRoutes.post('/orders/:id/fiscal-documents/:documentId/sync', syncOrderFiscalDocument);
adminRoutes.get('/orders/:id', getAdminOrderById);
adminRoutes.get('/categories', getAllCategories);
adminRoutes.post('/categories', createCategory);
adminRoutes.put('/categories/:id', updateCategory);
adminRoutes.delete('/categories/:id', deleteCategory);
adminRoutes.get('/products', getAllProducts);
adminRoutes.get('/products/:id', getProductById);
adminRoutes.post('/products', upload.single('image'), createProduct);
adminRoutes.put('/products/:id', upload.single('image'), updateProduct);
adminRoutes.delete('/products/:id', deleteProduct);
adminRoutes.get('/settings', getStoreSettings);
adminRoutes.put('/settings', updateStoreSettings);

export { adminRoutes };
