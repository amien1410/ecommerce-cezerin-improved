import express from 'express';
import jwt from 'jsonwebtoken';
import CezerinClient from 'cezerin-client';
import axios from 'axios';
import serverSettings from './lib/settings';
import CategoriesService from './services/products/productCategories';

const ajaxRouter = express.Router();

const TOKEN_PAYLOAD = { email: 'store', scopes: ['admin'] };
const STORE_ACCESS_TOKEN = jwt.sign(TOKEN_PAYLOAD, serverSettings.jwtSecretKey);

const api = new CezerinClient({
	apiBaseUrl: serverSettings.apiBaseUrl,
	apiToken: STORE_ACCESS_TOKEN
});

const DEFAULT_CACHE_CONTROL = 'public, max-age=60';
const PRODUCTS_CACHE_CONTROL = 'public, max-age=60';
const PRODUCT_DETAILS_CACHE_CONTROL = 'public, max-age=60';

const getCartCookieOptions = (isHttps) => ({
	maxAge: 24 * 60 * 60 * 1000, // 24 hours
	httpOnly: true,
	signed: true,
	secure: isHttps,
	sameSite: 'strict'
});

const getIP = (req) => {
	let ip = req.get('x-forwarded-for') || req.ip;
	if (ip.includes(',')) ip = ip.split(', ')[0];
	if (ip.includes('::ffff:')) ip = ip.replace('::ffff:', '');
	return ip;
};

const getUserAgent = (req) => req.get('user-agent');

const getVariantFromProduct = (product, variantId) => {
	return product.variants?.find(variant => variant.id.toString() === variantId.toString()) || null;
};

const fillCartItemWithProductData = (products, cartItem) => {
	const product = products.find(p => p.id === cartItem.product_id);
	if (product) {
		cartItem.image_url = product.images?.[0]?.url || null;
		cartItem.path = product.path;
		cartItem.stock_backorder = product.stock_backorder;
		cartItem.stock_preorder = product.stock_preorder;
		cartItem.stock_quantity = cartItem.variant_id ? 
			getVariantFromProduct(product, cartItem.variant_id)?.stock_quantity || 0 
			: product.stock_quantity;
	}
	return cartItem;
};

const fillCartItems = async (cartResponse) => {
	let cart = cartResponse.json;
	if (cart?.items?.length) {
		const productIds = cart.items.map(item => item.product_id);
		const { json } = await api.products.list({
			ids: productIds,
			fields: 'images,enabled,stock_quantity,variants,path,stock_backorder,stock_preorder'
		});
		cart.items = cart.items.map(cartItem => fillCartItemWithProductData(json.data, cartItem));
	}
	return cartResponse;
};

// Middleware to handle async/await errors
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

ajaxRouter.get('/product_categories', asyncHandler(async (req, res) => {
	const data = await CategoriesService.getCategories(req.query);
	res.send(data);
}));

ajaxRouter.get('/products', asyncHandler(async (req, res) => {
	const filter = { ...req.query, enabled: true };
	const { status, json } = await api.products.list(filter);
	res.status(status).header('Cache-Control', PRODUCTS_CACHE_CONTROL).send(json);
}));

ajaxRouter.get('/products/:id', asyncHandler(async (req, res) => {
	const { status, json } = await api.products.retrieve(req.params.id);
	res.status(status).header('Cache-Control', PRODUCT_DETAILS_CACHE_CONTROL).send(json);
}));

// Centralize cart retrieval logic
const retrieveCart = async (req) => {
	const order_id = req.signedCookies.order_id;
	if (!order_id) return null;
	const cartResponse = await api.orders.retrieve(order_id);
	return fillCartItems(cartResponse);
};

ajaxRouter.get('/cart', asyncHandler(async (req, res) => {
	const cartResponse = await retrieveCart(req);
	if (cartResponse) {
		const { status, json } = cartResponse;
		json.browser = undefined;
		res.status(status).send(json);
	} else {
		res.end();
	}
}));

ajaxRouter.post('/cart/items', asyncHandler(async (req, res) => {
	const isHttps = req.protocol === 'https';
	const CART_COOKIE_OPTIONS = getCartCookieOptions(isHttps);
	const order_id = req.signedCookies.order_id;
	const item = req.body;

	if (order_id) {
		const cartResponse = await api.orders.items.create(order_id, item);
		const filledCart = await fillCartItems(cartResponse);
		res.status(filledCart.status).send(filledCart.json);
	} else {
		let orderDraft = {
			draft: true,
			referrer_url: req.signedCookies.referrer_url,
			landing_url: req.signedCookies.landing_url,
			browser: {
				ip: getIP(req),
				user_agent: getUserAgent(req)
			},
			shipping_address: {}
		};

		const { json: storeSettings } = await api.settings.retrieve();
		Object.assign(orderDraft.shipping_address, {
			country: storeSettings.default_shipping_country,
			state: storeSettings.default_shipping_state,
			city: storeSettings.default_shipping_city
		});

		const { json: orderResponse } = await api.orders.create(orderDraft);
		const orderId = orderResponse.id;

		res.cookie('order_id', orderId, CART_COOKIE_OPTIONS);
		const cartResponse = await api.orders.items.create(orderId, item);
		const filledCart = await fillCartItems(cartResponse);
		res.status(filledCart.status).send(filledCart.json);
	}
}));

ajaxRouter.delete('/cart/items/:item_id', asyncHandler(async (req, res) => {
	const { order_id } = req.signedCookies;
	const { item_id } = req.params;
	if (order_id && item_id) {
		const cartResponse = await api.orders.items.delete(order_id, item_id);
		const filledCart = await fillCartItems(cartResponse);
		res.status(filledCart.status).send(filledCart.json);
	} else {
		res.end();
	}
}));

// Additional endpoints...

export default ajaxRouter;
