// paymentGateways/index.js

import OrdersService from '../services/orders/orders';
import SettingsService from '../services/settings/settings';
import PaymentGatewaysService from '../services/settings/paymentGateways';
import PayPalCheckout from './PayPalCheckout';
import LiqPay from './LiqPay';
import StripeElements from './StripeElements';
import RazorpayCheckout from './RazorpayCheckout';

/**
 * Fetches payment options for a given order ID.
 * @param {string} orderId - The ID of the order.
 * @returns {Promise<Object>} The payment options.
 */
const getOptions = async (orderId) => {
	const [order, settings] = await Promise.all([
		OrdersService.getSingleOrder(orderId),
		SettingsService.getSettings(),
	]);

	if (!order || !order.payment_method_id) {
		throw new Error('Order not found or payment method ID is missing.');
	}

	const gatewaySettings = await PaymentGatewaysService.getGateway(order.payment_method_gateway);
	return {
		gateway: order.payment_method_gateway,
		gatewaySettings,
		order,
		amount: order.grand_total,
		currency: settings.currency_code,
	};
};

/**
 * Retrieves the payment form settings based on the order ID.
 * @param {string} orderId - The ID of the order.
 * @returns {Promise<Object>} The payment form settings.
 */
const getPaymentFormSettings = async (orderId) => {
	const options = await getOptions(orderId);
	switch (options.gateway) {
		case 'paypal-checkout':
			return PayPalCheckout.getPaymentFormSettings(options);
		case 'liqpay':
			return LiqPay.getPaymentFormSettings(options);
		case 'stripe-elements':
			return StripeElements.getPaymentFormSettings(options);
		case 'razorpay-checkout':
			return RazorpayCheckout.getPaymentFormSettings(options);
		default:
			throw new Error('Invalid gateway');
	}
};

/**
 * Handles payment notifications for a specific gateway.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {string} gateway - The payment gateway identifier.
 * @returns {Promise<void>}
 */
const paymentNotification = async (req, res, gateway) => {
	const gatewaySettings = await PaymentGatewaysService.getGateway(gateway);
	const options = {
		gateway,
		gatewaySettings,
		req,
		res,
	};

	switch (gateway) {
		case 'paypal-checkout':
			return PayPalCheckout.paymentNotification(options);
		case 'liqpay':
			return LiqPay.paymentNotification(options);
		default:
			throw new Error('Invalid gateway');
	}
};

/**
 * Processes the payment for an order.
 * @param {Object} order - The order object.
 * @returns {Promise<boolean>} True if the payment was processed.
 */
const processOrderPayment = async (order) => {
	if (order.paid) {
		return true;
	}

	const gateway = order.payment_method_gateway;
	const gatewaySettings = await PaymentGatewaysService.getGateway(gateway);
	const settings = await SettingsService.getSettings();

	switch (gateway) {
		case 'stripe-elements':
			return StripeElements.processOrderPayment({
				order,
				gatewaySettings,
				settings,
			});
		default:
			throw new Error('Invalid gateway');
	}
};

export default {
	getPaymentFormSettings,
	paymentNotification,
	processOrderPayment,
};
