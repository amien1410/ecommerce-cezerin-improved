// logger.js

import winston from 'winston';
const LOGS_FILE = 'logs/server.log';

// Configure Winston logger with Console and File transports
winston.configure({
	transports: [
		new winston.transports.Console({
			level: 'debug',
			handleExceptions: true,
			format: winston.format.combine(
				winston.format.colorize(),
				winston.format.simple()
			)
		}),
		new winston.transports.File({
			level: 'info',
			handleExceptions: true,
			format: winston.format.json(),
			filename: LOGS_FILE
		})
	]
});

// Utility function to format error response
const getResponse = (message) => ({
	error: true,
	message
});

// Log unauthorized access attempts
const logUnauthorizedRequests = (req) => {
	const { method, url, headers, ip } = req;
	winston.warn(`Unauthorized access attempt: ${method} ${url} - IP: ${ip}, User-Agent: ${headers['user-agent']}`);
};

// Middleware to send error response and log errors
const sendResponse = (err, req, res, next) => {
	if (err) {
		if (err.name === 'UnauthorizedError') {
			logUnauthorizedRequests(req);  // Log unauthorized requests
			res.status(401).send(getResponse('Unauthorized access'));
		} else {
			winston.error(`Error: ${err.message}\nStack: ${err.stack}`);
			res.status(500).send(getResponse('Internal Server Error'));
		}
	} else {
		next(); // Pass to the next middleware if no error
	}
};

export default {
	sendResponse
};
