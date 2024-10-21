// dashboardWebSocket.js

import WebSocket from 'ws';
import url from 'url';
import security from './security';

let wss = null;

const listen = (server) => {
	wss = new WebSocket.Server({
		path: '/ws/dashboard',
		maxPayload: 1024, 
		backlog: 100,
		verifyClient: verifyClient,
		server
	});

	wss.on('connection', onConnection);
	wss.broadcast = broadcastToAll;
};

const getTokenFromRequestPath = (requestPath) => {
	try {
		const { query } = url.parse(requestPath, true);
		return query?.token || null;
	} catch (error) {
		console.error('Failed to parse token from request path:', error);
		return null;
	}
};

const verifyClient = (info, done) => {
	if (security.DEVELOPER_MODE) {
		return done(true);
	}

	const token = getTokenFromRequestPath(info.req.url);
	if (!token) {
		return done(false, 401, 'Missing token');
	}

	security.verifyToken(token)
		.then((decodedToken) => {
			// TODO: Perform additional checks if needed (e.g., dashboard access rights)
			done(true);
		})
		.catch((err) => {
			console.error('Token verification failed:', err);
			done(false, 401, 'Invalid token');
		});
};

const onConnection = (ws, req) => {
	const token = getTokenFromRequestPath(req.url);

	if (token) {
		security.verifyToken(token)
			.then((decodedToken) => {
				ws.user = decodedToken.email; // Attach user info to the WebSocket connection
			})
			.catch((err) => {
				console.error('Failed to set user from token:', err);
			});
	}

	ws.on('error', (error) => {
		console.error('WebSocket error:', error);
	});
};

const broadcastToAll = (data) => {
	const message = JSON.stringify(data);
	wss.clients.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(message, (error) => {
				if (error) {
					console.error('Failed to broadcast message:', error);
				}
			});
		}
	});
};

const send = ({ event, payload }) => {
	broadcastToAll({ event, payload });
};

const events = {
	ORDER_CREATED: 'order.created',
	THEME_INSTALLED: 'theme.installed'
};

export default {
	listen,
	send,
	events
};
