import { Router } from 'express';

import { createAvailabilityLead } from '../../controllers/AvailabilityLeadController';
import { getStoreCategories } from '../../controllers/CategoryController';
import {
  getStoreCustomerAvailabilityLeads,
  getStoreCustomerOrders,
  getStoreCustomerProfile,
  updateStoreCustomerDefaultAddress,
} from '../../controllers/CustomerAccountController';
import {
  completeTestStoreOrderPayment,
  createStoreOrder,
  getStoreOrderById,
  getStoreOrderPayment,
  getStoreOrderByTrackingToken,
} from '../../controllers/OrderController';
import { getCatalogProducts, getStoreProductById } from '../../controllers/ProductController';
import { calculateShipping } from '../../controllers/ShippingController';
import { getSitemap } from '../../controllers/SitemapController';
import {
  confirmStorePasswordReset,
  loginStoreCustomer,
  registerStoreCustomer,
  requestStorePasswordReset,
} from '../../controllers/StoreAuthController';
import { authLimiter, generalApiLimiter } from '../../middlewares/rateLimiter';

const storeRoutes = Router();

storeRoutes.use(generalApiLimiter);

storeRoutes.post('/auth/register', authLimiter, registerStoreCustomer);
storeRoutes.post('/auth/login', authLimiter, loginStoreCustomer);
storeRoutes.post('/auth/password-reset/request', authLimiter, requestStorePasswordReset);
storeRoutes.post('/auth/password-reset/confirm', authLimiter, confirmStorePasswordReset);
storeRoutes.post('/orders', authLimiter, createStoreOrder);
storeRoutes.get('/me', getStoreCustomerProfile);
storeRoutes.put('/me/address', updateStoreCustomerDefaultAddress);
storeRoutes.get('/me/orders', getStoreCustomerOrders);
storeRoutes.get('/me/availability-leads', getStoreCustomerAvailabilityLeads);
storeRoutes.get('/categories', getStoreCategories);
storeRoutes.get('/products', getCatalogProducts);
storeRoutes.get('/products/:id', getStoreProductById);
storeRoutes.post('/products/:productId/availability-leads', createAvailabilityLead);
storeRoutes.post('/shipping/calculate', calculateShipping);
storeRoutes.post('/orders', createStoreOrder);
storeRoutes.get('/orders/tracking/:token', getStoreOrderByTrackingToken);
storeRoutes.get('/orders/:id/payment', getStoreOrderPayment);
storeRoutes.post('/orders/:id/complete-test-payment', completeTestStoreOrderPayment);
storeRoutes.get('/orders/:id', getStoreOrderById);
storeRoutes.get('/sitemap.xml', getSitemap);

export { storeRoutes };
