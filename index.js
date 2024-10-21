// index.js
import express from 'express';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import responseTime from 'response-time';
import winston from 'winston';
import logger from './lib/logger';
import settings from './lib/settings';
import security from './lib/security';
import { db } from './lib/mongo';
import dashboardWebSocket from './lib/dashboardWebSocket';
import ajaxRouter from './ajaxRouter';
import apiRouter from './apiRouter';

const app = express();

// Security Middleware - should be first to protect early
security.applyMiddleware(app);

// Set trust proxy for rate limiting, and other middlewares relying on IP
app.set('trust proxy', 1);

// Use Helmet to set various HTTP headers for security
app.use(helmet());

// Centralized CORS handling
app.use((req, res, next) => {
    res.header(
        'Access-Control-Allow-Origin',
        security.getAccessControlAllowOrigin()
    );
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Key, Authorization'
    );
    // Check for preflight requests (OPTIONS) to end it early
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Log request response time
app.use(responseTime());

// Parse cookies using a secret key
app.use(cookieParser(settings.cookieSecretKey));

// Body parsers
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Use routers for different API sections
app.use('/ajax', ajaxRouter);
app.use('/api', apiRouter);

// Logger middleware for sending responses
app.use(logger.sendResponse);

// Start server
const server = app.listen(settings.apiListenPort, () => {
    winston.info(`API running at http://localhost:${server.address().port}`);
});

// Initialize WebSocket for the dashboard
dashboardWebSocket.listen(server);
