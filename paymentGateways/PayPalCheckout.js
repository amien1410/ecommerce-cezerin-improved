// PayPalCheckout.js

import https from 'https';
import qs from 'query-string';
import OrdersService from '../services/orders/orders';
import OrderTransactionsService from '../services/orders/orderTransactions';

const SANDBOX_URL = 'www.sandbox.paypal.com';
const REGULAR_URL = 'www.paypal.com';

/**
 * Gets the payment form settings for PayPal.
 * @param {Object} options - Options containing payment details.
 * @returns {Promise<Object>} The payment form settings.
 */
const getPaymentFormSettings = (options) => {
	const { order, amount, currency, gatewaySettings } = options;

	const formSettings = {
		order_id: order.id,
		amount,
		currency,
		env: gatewaySettings.env,
		client: gatewaySettings.client,
		size: gatewaySettings.size,
		shape: gatewaySettings.shape,
		color: gatewaySettings.color,
		notify_url: gatewaySettings.notify_url,
	};

	return Promise.resolve(formSettings);
};

/**
 * Handles payment notifications from PayPal.
 * @param {Object} options - Options for processing the payment notification.
 */
const paymentNotification = (options) => {
	const { req, res } = options;
	const params = req.body;
	const orderId = params.custom;
	const paymentCompleted = params.payment_status === 'Completed';

	// Respond to PayPal immediately
	res.status(200).end();

	verify(params)
		.then(() => {
			if (paymentCompleted) {
				return handlePaymentSuccess(orderId, params);
			}
		})
		.catch((error) => {
			console.error('Payment notification verification failed:', error);
		});
};

/**
 * Handles successful payment processing.
 * @param {string} orderId - The ID of the order.
 * @param {Object} params - The parameters received from PayPal.
 */
const handlePaymentSuccess = async (orderId, params) => {
	try {
		await OrdersService.updateOrder(orderId, {
			paid: true,
			date_paid: new Date(),
		});
		await OrderTransactionsService.addTransaction(orderId, {
			transaction_id: params.txn_id,
			amount: params.mc_gross,
			currency: params.mc_currency,
			status: params.payment_status,
			details: `${params.first_name} ${params.last_name}, ${params.payer_email}`,
			success: true,
		});
	} catch (error) {
		console.error('Error processing successful payment:', error);
	}
};

/**
 * Verifies the payment notification parameters with PayPal.
 * @param {Object} params - The parameters to verify.
 * @returns {Promise<string>} Verification result.
 */
const verify = (params) => {
	return new Promise((resolve, reject) => {
		if (!params || Object.keys(params).length === 0) {
			return reject('Params are empty');
		}

		params.cmd = '_notify-validate';
		const body = qs.stringify(params);

		const req_options = {
			host: params.test_ipn ? SANDBOX_URL : REGULAR_URL,
			method: 'POST',
			path: '/cgi-bin/webscr',
			headers: { 'Content-Length': body.length },
		};

		if (params.test_ipn && !params.allow_sandbox) {
			return reject('Sandbox is disabled, but test_ipn was received');
		}

		const req = https.request(req_options, (res) => {
			let data = [];

			res.on('data', (chunk) => {
				data.push(chunk);
			});

			res.on('end', () => {
				const response = data.join('');
				if (response === 'VERIFIED') {
					return resolve(response);
				} else {
					return reject('IPN Verification status: ' + response);
				}
			});
		});

		req.write(body);
		req.on('error', (error) => {
			reject('Request error: ' + error.message);
		});
		req.end();
	});
};

export default {
	getPaymentFormSettings,
	paymentNotification,
};
