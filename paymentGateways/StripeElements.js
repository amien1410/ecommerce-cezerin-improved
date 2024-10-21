// StripeElements.js

import stripePackage from 'stripe';
import OrdersService from '../services/orders/orders';
import OrderTransactionsService from '../services/orders/orderTransactions';

/**
 * Gets the payment form settings for Stripe.
 * @param {Object} options - Options containing payment details.
 * @returns {Promise<Object>} The payment form settings.
 */
const getPaymentFormSettings = (options) => {
	const { order, gatewaySettings } = options;

	if (!order || !order.id) {
		return Promise.reject(new Error('Invalid order information.'));
	}
	if (!gatewaySettings || !gatewaySettings.public_key) {
		return Promise.reject(new Error('Gateway settings are incomplete.'));
	}

	const formSettings = {
		order_id: order.id,
		amount: order.grand_total, // Ensure this is passed correctly
		currency: order.currency || 'USD', // Provide a default currency if not specified
		email: order.email,
		public_key: gatewaySettings.public_key,
	};

	return Promise.resolve(formSettings);
};

/**
 * Processes the payment for an order using Stripe.
 * @param {Object} params - The parameters containing order and gateway settings.
 * @returns {Promise<boolean>} True if payment succeeded, false otherwise.
 */
const processOrderPayment = async ({ order, gatewaySettings, settings }) => {
	if (!order || !order.id) {
		throw new Error('Invalid order information.');
	}

	if (!gatewaySettings || !gatewaySettings.secret_key) {
		throw new Error('Gateway settings are incomplete.');
	}

	try {
		const stripe = stripePackage(gatewaySettings.secret_key);
		const charge = await stripe.charges.create({
			amount: order.grand_total * 100, // Ensure amount is in cents
			currency: settings.currency_code,
			description: `Order #${order.number}`,
			statement_descriptor: `Order #${order.number}`,
			metadata: {
				order_id: order.id,
			},
			source: order.payment_token,
		});

		const paymentSucceeded = charge.status === 'succeeded' || charge.paid === true;

		if (paymentSucceeded) {
			await OrdersService.updateOrder(order.id, {
				paid: true,
				date_paid: new Date(),
			});
		}

		await OrderTransactionsService.addTransaction(order.id, {
			transaction_id: charge.id,
			amount: charge.amount / 100, // Convert back to original amount
			currency: charge.currency,
			status: charge.status,
			details: charge.outcome.seller_message,
			success: paymentSucceeded,
		});

		return paymentSucceeded;
	} catch (err) {
		console.error('Payment processing error:', err);
		return false;
	}
};

export default {
	getPaymentFormSettings,
	processOrderPayment,
};
