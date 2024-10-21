import express from 'express';

// Importing all route classes
import ProductsRoute from './routes/products';
import ProductCategoriesRoute from './routes/productCategories';
import SitemapRoute from './routes/sitemap';
import ThemeRoute from './routes/theme';
import CustomersRoute from './routes/customers';
import CustomerGroupsRoute from './routes/customerGroups';
import OrdersRoute from './routes/orders';
import OrderStatusesRoute from './routes/orderStatuses';
import ShippingMethodsRoute from './routes/shippingMethods';
import PaymentMethodsRoute from './routes/paymentMethods';
import PaymentGatewaysRoute from './routes/paymentGateways';
import SettingsRoute from './routes/settings';
import PagesRoute from './routes/pages';
import SecurityTokensRoute from './routes/tokens';
import NotificationsRoute from './routes/notifications';
import RedirectsRoute from './routes/redirects';
import FilesRoute from './routes/files';
import AppsRoute from './routes/apps';
import WebhooksRoute from './routes/webhooks';
import DevicesRoute from './routes/devices';

const apiRouter = express.Router();

// Route initialization factory function
const initRoutes = (router) => {
  new ProductsRoute(router);
  new ProductCategoriesRoute(router);
  new SitemapRoute(router);
  new ThemeRoute(router);
  new CustomersRoute(router);
  new CustomerGroupsRoute(router);
  new OrdersRoute(router);
  new OrderStatusesRoute(router);
  new ShippingMethodsRoute(router);
  new PaymentMethodsRoute(router);
  new PaymentGatewaysRoute(router);
  new SettingsRoute(router);
  new PagesRoute(router);
  new SecurityTokensRoute(router);
  new NotificationsRoute(router);
  new RedirectsRoute(router);
  new FilesRoute(router);
  new AppsRoute(router);
  new WebhooksRoute(router);
  new DevicesRoute(router);
};

// Initialize all routes
initRoutes(apiRouter);

export default apiRouter;
