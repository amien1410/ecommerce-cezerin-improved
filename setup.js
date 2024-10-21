import winston from 'winston';
import url from 'url';
import { MongoClient } from 'mongodb';
import logger from './lib/logger';
import settings from './lib/settings';

const mongodbConnection = settings.mongodbServerUrl;
const mongoPathName = url.parse(mongodbConnection).pathname;
const dbName = mongoPathName.substring(mongoPathName.lastIndexOf('/') + 1);

const CONNECT_OPTIONS = {
  useNewUrlParser: true,
  useUnifiedTopology: true // Use Unified Topology for newer MongoDB drivers
};

const DEFAULT_LANGUAGE = 'english';

// Helper function to log errors
const handleError = (message, error) => {
  winston.error(`${message}: ${error.message || error}`);
};

// Insert a page if it doesn't already exist
const addPage = async (db, pageObject) => {
  try {
    const count = await db.collection('pages').countDocuments({ slug: pageObject.slug });
    if (count === 0) {
      await db.collection('pages').insertOne(pageObject);
      winston.info(`- Added page: /${pageObject.slug}`);
    }
  } catch (error) {
    handleError('Error adding page', error);
  }
};

// Add predefined pages
const addAllPages = async (db) => {
  const pages = [
    { slug: '', meta_title: 'Home', enabled: true, is_system: true },
    { slug: 'checkout', meta_title: 'Checkout', enabled: true, is_system: true },
    { slug: 'checkout-success', meta_title: 'Thank You!', enabled: true, is_system: true },
    { slug: 'about', meta_title: 'About us', enabled: true, is_system: false }
  ];

  await Promise.all(pages.map(page => addPage(db, page)));
};

// Add product categories and products if none exist
const addAllProducts = async (db) => {
  try {
    const productCategoriesCount = await db.collection('productCategories').countDocuments({});
    const productsCount = await db.collection('products').countDocuments({});
    
    if (productCategoriesCount === 0 && productsCount === 0) {
      // Using `bulkWrite` for optimized batch inserts
      const categories = [
        { name: 'Category A', slug: 'category-a', parent_id: null, enabled: true },
        { name: 'Category B', slug: 'category-b', parent_id: null, enabled: true },
        { name: 'Category C', slug: 'category-c', parent_id: null, enabled: true }
      ];

      const { insertedIds: categoryIds } = await db.collection('productCategories').insertMany(categories);
      
      const subcategories = [
        { name: 'Subcategory 1', slug: 'category-a-1', parent_id: categoryIds[0], enabled: true },
        { name: 'Subcategory 2', slug: 'category-a-2', parent_id: categoryIds[0], enabled: true },
        { name: 'Subcategory 3', slug: 'category-a-3', parent_id: categoryIds[0], enabled: true }
      ];

      await db.collection('productCategories').insertMany(subcategories);

      const products = [
        {
          name: 'Product A',
          slug: 'product-a',
          category_id: categoryIds[0],
          regular_price: 950,
          stock_quantity: 1,
          enabled: true,
          discontinued: false,
          attributes: [{ name: 'Brand', value: 'Brand A' }, { name: 'Size', value: 'M' }]
        },
        {
          name: 'Product B',
          slug: 'product-b',
          category_id: categoryIds[0],
          regular_price: 1250,
          stock_quantity: 1,
          enabled: true,
          discontinued: false,
          attributes: [{ name: 'Brand', value: 'Brand B' }, { name: 'Size', value: 'L' }]
        }
      ];

      await db.collection('products').insertMany(products);
      winston.info('- Added products and categories');
    }
  } catch (error) {
    handleError('Error adding products', error);
  }
};

// Add email templates if they don't exist
const addEmailTemplates = async (db) => {
  try {
    const emailTemplatesCount = await db.collection('emailTemplates').countDocuments({ name: 'order_confirmation' });
    if (emailTemplatesCount === 0) {
      const emailTemplate = {
        name: 'order_confirmation',
        subject: 'Order confirmation',
        body: `
          <div>
            <b>Order number</b>: {{number}}<br/>
            <b>Shipping method</b>: {{shipping_method}}<br/>
            <b>Payment method</b>: {{payment_method}}<br/>
            <b>Shipping to</b>: {{shipping_address.full_name}}<br/>
            {{#each items}}<br/>Item: {{name}}, Price: ${{price}}<br/>{{/each}}<br/>
            <b>Grand total</b>: ${{grand_total}}<br/>
          </div>`
      };
      
      await db.collection('emailTemplates').insertOne(emailTemplate);
      winston.info('- Added email template: order_confirmation');
    }
  } catch (error) {
    handleError('Error adding email templates', error);
  }
};

// Add shipping methods if they don't exist
const addShippingMethods = async (db) => {
  try {
    const shippingMethodsCount = await db.collection('shippingMethods').countDocuments({});
    if (shippingMethodsCount === 0) {
      await db.collection('shippingMethods').insertOne({
        name: 'Shipping method A',
        enabled: true,
        conditions: { countries: [], states: [], cities: [], subtotal_min: 0, subtotal_max: 0, weight_total_min: 0, weight_total_max: 0 }
      });
      winston.info('- Added shipping method: Shipping method A');
    }
  } catch (error) {
    handleError('Error adding shipping methods', error);
  }
};

// Add payment methods if they don't exist
const addPaymentMethods = async (db) => {
  try {
    const paymentMethodsCount = await db.collection('paymentMethods').countDocuments({});
    if (paymentMethodsCount === 0) {
      await db.collection('paymentMethods').insertOne({
        name: 'PayPal',
        enabled: true,
        conditions: { countries: [], shipping_method_ids: [], subtotal_min: 0, subtotal_max: 0 }
      });
      winston.info('- Added payment method: PayPal');
    }
  } catch (error) {
    handleError('Error adding payment methods', error);
  }
};

// Create index helper
const createIndex = async (db, collectionName, fields, options = {}) => {
  try {
    await db.collection(collectionName).createIndex(fields, options);
    winston.info(`- Created index on ${collectionName}: ${JSON.stringify(fields)}`);
  } catch (error) {
    handleError(`Error creating index on ${collectionName}`, error);
  }
};

// Create indexes for collections
const createAllIndexes = async (db) => {
  try {
    const collectionsToIndex = [
      { name: 'pages', indexes: [{ enabled: 1 }, { slug: 1 }] },
      { name: 'productCategories', indexes: [{ enabled: 1 }, { slug: 1 }] },
      { name: 'products', indexes: [{ slug: 1 }, { enabled: 1 }, { category_id: 1 }, { 'attributes.name': 1, 'attributes.value': 1 }] },
      { name: 'customers', indexes: [{ group_id: 1 }, { email: 1 }, { mobile: 1 }] },
      { name: 'orders', indexes: [{ draft: 1 }, { number: 1 }, { customer_id: 1 }, { email: 1 }, { mobile: 1 }] }
    ];

    for (const collection of collectionsToIndex) {
      const existingIndexes = await db.collection(collection.name).listIndexes().toArray();
      if (existingIndexes.length === 1) {
        await Promise.all(collection.indexes.map(index => createIndex(db, collection.name, index)));
      }
    }
  } catch (error) {
    handleError('Error creating indexes', error);
  }
};

// Initialize MongoDB connection and run all setup tasks
const initializeDatabase = async () => {
  try {
    const client = await MongoClient.connect(mongodbConnection, CONNECT_OPTIONS);
    const db = client.db(dbName);
    
    await Promise.all([
      addAllPages(db),
      addAllProducts(db),
      addEmailTemplates(db),
      addShippingMethods(db),
      addPaymentMethods(db),
      createAllIndexes(db)
    ]);

    winston.info('Database setup complete.');
    client.close();
  } catch (error) {
    handleError('Error initializing database', error);
  }
};

// Start the setup process
initializeDatabase();
