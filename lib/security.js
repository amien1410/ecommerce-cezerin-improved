// security.js

import jwt from 'jsonwebtoken';
import expressJwt from 'express-jwt';
import settings from './settings';
import SecurityTokensService from '../services/security/tokens';

// Configuration constants
const DEVELOPER_MODE = settings.developerMode === true;
const SET_TOKEN_AS_REVOKEN_ON_EXCEPTION = true;

// Paths that can be accessed without authentication
const PATHS_WITH_OPEN_ACCESS = [
	'/api/v1/authorize',
	/\/api\/v1\/notifications/i,
	/\/ajax\//i,
	'/api/v1/sign_up',
	'/api/v1/sign_in',
	'/api/v1/sign_in_social',
	'/api/v1/stripe',
	'/api/v1/devices',
	'/api/v1/push-notification'
];

// Defined scopes for access control
const scope = {
	ADMIN: 'admin',
	DASHBOARD: 'dashboard',
	READ_PRODUCTS: 'read:products',
	WRITE_PRODUCTS: 'write:products',
	READ_PRODUCT_CATEGORIES: 'read:product_categories',
	WRITE_PRODUCT_CATEGORIES: 'write:product_categories',
	READ_ORDERS: 'read:orders',
	WRITE_ORDERS: 'write:orders',
	READ_CUSTOMERS: 'read:customers',
	WRITE_CUSTOMERS: 'write:customers',
	READ_CUSTOMER_GROUPS: 'read:customer_groups',
	WRITE_CUSTOMER_GROUPS: 'write:customer_groups',
	READ_PAGES: 'read:pages',
	WRITE_PAGES: 'write:pages',
	READ_ORDER_STATUSES: 'read:order_statuses',
	WRITE_ORDER_STATUSES: 'write:order_statuses',
	READ_THEME: 'read:theme',
	WRITE_THEME: 'write:theme',
	READ_SITEMAP: 'read:sitemap',
	READ_SHIPPING_METHODS: 'read:shipping_methods',
	WRITE_SHIPPING_METHODS: 'write:shipping_methods',
	READ_PAYMENT_METHODS: 'read:payment_methods',
	WRITE_PAYMENT_METHODS: 'write:payment_methods',
	READ_SETTINGS: 'read:settings',
	WRITE_SETTINGS: 'write:settings',
	READ_FILES: 'read:files',
	WRITE_FILES: 'write:files'
};

// Middleware to check user scopes
const checkUserScope = (requiredScope, req, res, next) => {
	if (DEVELOPER_MODE) {
		next();
	} else if (
		req.user?.scopes?.length > 0 &&
		(req.user.scopes.includes(scope.ADMIN) || req.user.scopes.includes(requiredScope))
	) {
		next();
	} else {
		res.status(403).send({ error: true, message: 'Forbidden' });
	}
};

// Token verification function
const verifyToken = token => {
	return new Promise((resolve, reject) => {
		jwt.verify(token, settings.jwtSecretKey, (err, decoded) => {
			if (err) {
				reject(err);
			} else {
				// Token is valid, but may need to check blacklist
				resolve(decoded);
			}
		});
	});
};

// Callback to check if the token is in the blacklist
const checkTokenInBlacklistCallback = async (req, payload, done) => {
	try {
		const jti = payload.jti;
		const blacklist = await SecurityTokensService.getTokensBlacklist();
		const tokenIsRevoked = blacklist.includes(jti);
		done(null, tokenIsRevoked);
	} catch (e) {
		done(e, SET_TOKEN_AS_REVOKEN_ON_EXCEPTION);
	}
};

// Middleware application function
const applyMiddleware = app => {
	if (!DEVELOPER_MODE) {
		app.use(
			expressJwt({
				secret: settings.jwtSecretKey,
				isRevoked: checkTokenInBlacklistCallback
			}).unless({ path: PATHS_WITH_OPEN_ACCESS })
		);
	}
};

// Function to get Access-Control-Allow-Origin setting
const getAccessControlAllowOrigin = () => settings.storeBaseUrl || '*';

// Exporting security module functionalities
export default {
	checkUserScope,
	scope,
	verifyToken,
	applyMiddleware,
	getAccessControlAllowOrigin,
	DEVELOPER_MODE
};
