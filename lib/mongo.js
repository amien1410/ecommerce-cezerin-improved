// mongo.js

import winston from 'winston';
import url from 'url';
import { MongoClient } from 'mongodb';
import settings from './settings';

const mongodbConnection = settings.mongodbServerUrl;
const mongoPathName = url.parse(mongodbConnection).pathname;
const dbName = mongoPathName.substring(mongoPathName.lastIndexOf('/') + 1);

// MongoDB connection options
const RECONNECT_INTERVAL = 1000;
const CONNECT_OPTIONS = {
	reconnectTries: 3600, // Number of retry attempts
	reconnectInterval: RECONNECT_INTERVAL, // Interval between retries
	useNewUrlParser: true, // Use new connection string parser
	useUnifiedTopology: true // Ensure compatibility with modern topology engine
};

// Event handlers for MongoDB connection
const onClose = () => {
	winston.info('MongoDB connection closed.');
};

const onReconnect = () => {
	winston.info('MongoDB successfully reconnected.');
};

// Database object
export let db = null;

// Function to handle MongoDB connection with retry logic
const connectWithRetry = () => {
	MongoClient.connect(mongodbConnection, CONNECT_OPTIONS, (err, client) => {
		if (err) {
			winston.error(`MongoDB connection failed: ${err.message}`, err);
			// Retry connection after the specified interval
			setTimeout(connectWithRetry, RECONNECT_INTERVAL);
		} else {
			// Set the global database connection object
			db = client.db(dbName);
			
			// Attach event listeners for connection close and reconnect
			client.on('close', onClose);
			client.on('reconnect', onReconnect);
			
			winston.info(`MongoDB connected to database: ${dbName}`);
		}
	});
};

// Initiate the connection with retry mechanism
connectWithRetry();
