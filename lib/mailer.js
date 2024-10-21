// mailer.js

import winston from 'winston';
import nodemailer from 'nodemailer';
import smtpTransport from 'nodemailer-smtp-transport';
import settings from './settings';
import EmailSettingsService from '../services/settings/email';

// SMTP configuration from settings file
const SMTP_FROM_CONFIG_FILE = {
	host: settings.smtpServer.host,
	port: settings.smtpServer.port,
	secure: settings.smtpServer.secure,
	auth: {
		user: settings.smtpServer.user,
		pass: settings.smtpServer.pass
	}
};

// Get SMTP settings from email configuration
const getSmtpFromEmailSettings = (emailSettings) => ({
	host: emailSettings.host,
	port: emailSettings.port,
	secure: emailSettings.port === 465, // Secure if using port 465
	auth: {
		user: emailSettings.user,
		pass: emailSettings.pass
	}
});

// Determine which SMTP configuration to use
const getSmtp = (emailSettings) => {
	const useConfigFile = emailSettings.host === '';
	return useConfigFile ? SMTP_FROM_CONFIG_FILE : getSmtpFromEmailSettings(emailSettings);
};

// Utility to send email with provided SMTP and message
const sendMail = (smtp, message) => {
	return new Promise((resolve, reject) => {
		if (!message.to || !message.to.includes('@')) {
			reject(new Error('Invalid email address'));
			return;
		}

		const transporter = nodemailer.createTransport(smtpTransport(smtp));
		transporter.sendMail(message, (err, info) => {
			if (err) {
				reject(err);
			} else {
				resolve(info);
			}
		});
	});
};

// Get the "from" address based on settings or email configuration
const getFrom = (emailSettings) => {
	const useConfigFile = emailSettings.host === '';
	return useConfigFile
		? `"${settings.smtpServer.fromName}" <${settings.smtpServer.fromAddress}>`
		: `"${emailSettings.from_name}" <${emailSettings.from_address}>`;
};

// Main function to send email, including handling settings and SMTP configuration
const send = async (message) => {
	try {
		const emailSettings = await EmailSettingsService.getEmailSettings();
		const smtp = getSmtp(emailSettings);
		message.from = getFrom(emailSettings);

		const result = await sendMail(smtp, message);
		winston.info('Email sent successfully', result);
		return true;
	} catch (error) {
		winston.error('Email sending failed', error);
		return false;
	}
};

export default {
	send
};
