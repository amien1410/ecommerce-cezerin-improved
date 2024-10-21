// RazorPayCheckout.js

/**
 * Gets the payment form settings for Razorpay.
 * @param {Object} options - Options containing payment details.
 * @returns {Promise<Object>} The payment form settings.
 */
const getPaymentFormSettings = (options) => {
	const { order, amount, currency, gatewaySettings } = options;

	if (!order || !order.id) {
		return Promise.reject(new Error('Invalid order information.'));
	}
	if (!amount || typeof amount !== 'number') {
		return Promise.reject(new Error('Invalid payment amount.'));
	}
	if (!currency) {
		return Promise.reject(new Error('Currency must be specified.'));
	}
	if (!gatewaySettings || !gatewaySettings.key_id || !gatewaySettings.key_secret) {
		return Promise.reject(new Error('Gateway settings are incomplete.'));
	}

	const formSettings = {
		order_id: order.id,
		amount,
		currency,
		key_id: gatewaySettings.key_id,
		key_secret: gatewaySettings.key_secret,
	};

	return Promise.resolve(formSettings);
};

export default {
	getPaymentFormSettings,
};
