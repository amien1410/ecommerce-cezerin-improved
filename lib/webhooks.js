// webhook.js

import crypto from 'crypto';
import fetch from 'node-fetch';
import WebhooksService from '../services/webhooks';

/**
 * Triggers webhooks for a specific event with the provided payload.
 * @param {Object} params - The parameters containing the event and payload.
 * @param {string} params.event - The event to trigger.
 * @param {Object} params.payload - The payload data to send.
 */
const trigger = async ({ event, payload }) => {
	const webhooks = await WebhooksService.getWebhooks();
	for (const webhook of webhooks) {
		if (webhook.events.includes(event)) {
			await send({ event, payload, webhook }); // Ensure sequential sending
		}
	}
};

/**
 * Sends a webhook to the specified URL with the provided event and payload.
 * @param {Object} params - The parameters containing event, payload, and webhook details.
 * @param {string} params.event - The event being sent.
 * @param {Object} params.payload - The payload data to send.
 * @param {Object} params.webhook - The webhook configuration.
 */
const send = async ({ event, payload, webhook }) => {
	if (webhook?.enabled && webhook.url) {
		const data = JSON.stringify(payload);
		const signature = sign({ data, secret: webhook.secret });

		try {
			const response = await fetch(webhook.url, {
				method: 'POST',
				body: data,
				redirect: 'manual',
				compress: true,
				headers: {
					'Content-Type': 'application/json',
					'X-Hook-Event': event,
					'X-Hook-Signature': signature
				}
			});

			if (!response.ok) {
				console.error(`Webhook failed with status: ${response.status}`);
			}
		} catch (error) {
			console.error('Error sending webhook:', error);
		}
	}
};

/**
 * Signs the data using HMAC with SHA-256 and the provided secret.
 * @param {Object} params - The parameters containing data and secret.
 * @param {string} params.data - The data to sign.
 * @param {string} params.secret - The secret key used for signing.
 * @returns {string} The generated signature.
 */
const sign = ({ data, secret }) => {
	if (secret) {
		const hmac = crypto.createHmac('sha256', secret);
		hmac.update(data);
		return hmac.digest('hex');
	}
	return '';
};

// Event constants for webhook triggers
const events = {
	ORDER_CREATED: 'order.created',
	ORDER_UPDATED: 'order.updated',
	ORDER_DELETED: 'order.deleted',
	TRANSACTION_CREATED: 'transaction.created',
	TRANSACTION_UPDATED: 'transaction.updated',
	TRANSACTION_DELETED: 'transaction.deleted',
	CUSTOMER_CREATED: 'customer.created',
	CUSTOMER_UPDATED: 'customer.updated',
	CUSTOMER_DELETED: 'customer.deleted'
};

export default {
	trigger,
	events
};
