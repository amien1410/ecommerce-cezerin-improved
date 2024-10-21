// LiqPay.js

import crypto from 'crypto';
import OrdersService from '../services/orders/orders';
import OrderTransactionsService from '../services/orders/orderTransactions';

/**
 * Gets the payment form settings for LiqPay.
 * @param {Object} options - Options containing payment details.
 * @returns {Promise<Object>} The payment form settings.
 */
const getPaymentFormSettings = (options) => {
	const { gateway, gatewaySettings, order, amount, currency } = options;

	const params = {
		sandbox: '0',
		action: 'pay',
		version: '3',
		amount,
		currency,
		description: `Order: ${order.number}`,
		order_id: order.id,
		public_key: gatewaySettings.public_key,
		language: gatewaySettings.language,
		server_url: gatewaySettings.server_url,
	};

	const form = getForm(params, gatewaySettings.private_key);

	return Promise.resolve({
		data: form.data,
		signature: form.signature,
		language: gatewaySettings.language,
	});
};

/**
 * Handles payment notifications from LiqPay.
 * @param {Object} options - Options for processing the payment notification.
 */
const paymentNotification = async (options) => {
	const { req, res } = options;
	const params = req.body;
	const dataStr = Buffer.from(params.data, 'base64').toString();
	const data = JSON.parse(dataStr);

	// Respond immediately to the notification
	res.status(200).end();

	const sign = getHashFromString(
		options.gatewaySettings.private_key + params.data + options.gatewaySettings.private_key
	);
	const signatureValid = sign === params.signature;
	const paymentSuccess = data.status === 'success';
	const orderId = data.order_id;

	if (signatureValid && paymentSuccess) {
		await OrdersService.updateOrder(orderId, {
			paid: true,
			date_paid: new Date(),
		});
		await OrderTransactionsService.addTransaction(orderId, {
			transaction_id: data.transaction_id,
			amount: data.amount,
			currency: data.currency,
			status: data.status,
			details: `${data.paytype}, ${data.sender_card_mask2}`,
			success: true,
		});
	} else {
		// Log the failure for further investigation
		console.error('Payment notification failed:', { signatureValid, paymentSuccess });
	}
};

/**
 * Generates the payment form for LiqPay.
 * @param {Object} params - Parameters for the payment form.
 * @param {string} private_key - The private key for LiqPay.
 * @returns {Object} The generated form data and signature.
 */
const getForm = (params, private_key) => {
	const validatedParams = getFormParams(params);
	const data = Buffer.from(JSON.stringify(validatedParams)).toString('base64');
	const signature = getHashFromString(private_key + data + private_key);

	return {
		data,
		signature,
	};
};

/**
 * Validates form parameters for LiqPay.
 * @param {Object} params - The parameters to validate.
 * @returns {Object} The validated parameters.
 * @throws Will throw an error if required parameters are missing.
 */
const getFormParams = (params) => {
	if (!params.version) throw new Error('Version is required.');
	if (!params.amount) throw new Error('Amount is required.');
	if (!params.currency) throw new Error('Currency is required.');
	if (!params.description) throw new Error('Description is required.');

	return params;
};

/**
 * Creates a SHA-1 hash from a string and encodes it in base64.
 * @param {string} str - The input string.
 * @returns {string} The resulting base64-encoded hash.
 */
const getHashFromString = (str) => {
	const sha1 = crypto.createHash('sha1');
	sha1.update(str);
	return sha1.digest('base64');
};

export default {
	getPaymentFormSettings,
	paymentNotification,
};
