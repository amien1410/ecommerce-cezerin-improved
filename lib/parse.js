// parse.js

import { ObjectID } from 'mongodb';

// Utility function to ensure the value is a string
const getString = value => (value || '').toString();

// Parses a date and returns a Date object if valid, otherwise null
const getDateIfValid = value => {
	const date = Date.parse(value);
	return isNaN(date) ? null : new Date(date);
};

// Returns the value if it is an array, otherwise null
const getArrayIfValid = value => (Array.isArray(value) ? value : null);

// Converts an array of strings to ObjectIDs, filtering out invalid ones
const getArrayOfObjectID = value => {
	if (Array.isArray(value) && value.length > 0) {
		return value
			.map(id => getObjectIDIfValid(id))
			.filter(Boolean); // Filter out null values
	}
	return [];
};

// Checks if the value is a valid number
const isNumber = value => !isNaN(parseFloat(value)) && isFinite(value);

// Returns a number if valid, otherwise null
const getNumberIfValid = value => (isNumber(value) ? parseFloat(value) : null);

// Returns a positive number if valid, otherwise null
const getNumberIfPositive = value => {
	const n = getNumberIfValid(value);
	return n >= 0 ? n : null;
};

// Returns a boolean value if valid, otherwise a default value
const getBooleanIfValid = (value, defaultValue = null) => {
	if (value === 'true' || value === 'false') {
		return value === 'true';
	}
	return typeof value === 'boolean' ? value : defaultValue;
};

// Returns an ObjectID if valid, otherwise null
const getObjectIDIfValid = value => (ObjectID.isValid(value) ? new ObjectID(value) : null);

// Returns browser information from a request object
const getBrowser = browser => ({
	ip: getString(browser?.ip),
	user_agent: getString(browser?.user_agent)
});

// Parses a customer address and returns a structured object
const getCustomerAddress = address => {
	const coordinates = address?.coordinates ? {
		latitude: address.coordinates.latitude,
		longitude: address.coordinates.longitude
	} : { latitude: '', longitude: '' };

	return address ? {
		id: new ObjectID(),
		address1: getString(address.address1),
		address2: getString(address.address2),
		city: getString(address.city),
		country: getString(address.country).toUpperCase(),
		state: getString(address.state),
		phone: getString(address.phone),
		postal_code: getString(address.postal_code),
		full_name: getString(address.full_name),
		company: getString(address.company),
		tax_number: getString(address.tax_number),
		coordinates,
		details: address.details,
		default_billing: false,
		default_shipping: false
	} : {};
};

// Parses an order address and returns a structured object
const getOrderAddress = address => {
	const coordinates = address?.coordinates ? {
		latitude: address.coordinates.latitude,
		longitude: address.coordinates.longitude
	} : { latitude: '', longitude: '' };

	const emptyAddress = {
		address1: '',
		address2: '',
		city: '',
		country: '',
		state: '',
		phone: '',
		postal_code: '',
		full_name: '',
		company: '',
		tax_number: '',
		coordinates,
		details: null
	};

	return address ? {
		...emptyAddress,
		address1: getString(address.address1),
		address2: getString(address.address2),
		city: getString(address.city),
		country: getString(address.country).toUpperCase(),
		state: getString(address.state),
		phone: getString(address.phone),
		postal_code: getString(address.postal_code),
		full_name: getString(address.full_name),
		company: getString(address.company),
		tax_number: getString(address.tax_number),
		details: address.details
	} : emptyAddress;
};

// Exporting utility functions for external use
export default {
	getString,
	getObjectIDIfValid,
	getDateIfValid,
	getArrayIfValid,
	getArrayOfObjectID,
	getNumberIfValid,
	getNumberIfPositive,
	getBooleanIfValid,
	getBrowser,
	getCustomerAddress,
	getOrderAddress
};
