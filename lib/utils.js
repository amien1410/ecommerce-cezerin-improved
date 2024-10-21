// util.js

import slug from 'slug';
import SitemapService from '../services/sitemap';

// Configuration for slug generation
const slugConfig = {
	symbols: false, // Replace unicode symbols or not
	remove: null,    // (optional) Regex to remove characters
	lower: true      // Result in lower case
};

/**
 * Cleans and generates a slug from the given text.
 * @param {string} text - The text to slugify.
 * @returns {string} The cleaned slug.
 */
const cleanSlug = text => {
	return slug(text || '', slugConfig);
};

/**
 * Generates an available slug for the given path and resource,
 * ensuring that it does not conflict with existing paths.
 * @param {string} path - The desired path for the resource.
 * @param {string} resource - The resource to associate with the path.
 * @param {boolean} [enableCleanPath=true] - Whether to clean the path.
 * @returns {Promise<string>} The available slug.
 */
const getAvailableSlug = (path, resource, enableCleanPath = true) => {
	return SitemapService.getPaths().then(paths => {
		if (enableCleanPath) {
			path = cleanSlug(path);
		}

		let pathExists = paths.find(
			e => e.path === '/' + path && e.resource !== resource
		);
		
		// Append '-2', '-3', etc. to make the slug unique
		while (pathExists) {
			path += '-2';
			pathExists = paths.find(
				e => e.path === '/' + path && e.resource !== resource
			);
		}
		return path;
	});
};

/**
 * Sanitizes the filename by replacing unsafe characters with hyphens.
 * @param {string} filename - The filename to sanitize.
 * @returns {string} The sanitized filename.
 */
const getCorrectFileName = filename => {
	if (filename) {
		// Replace unsafe characters
		return filename.replace(/[\s*/:;&?@$()<>#%\{\}|\\\^\~\[\]]/g, '-');
	}
	return filename; // Return undefined or null as is
};

/**
 * Creates a projection object from a comma-separated string of fields.
 * @param {string} fields - The comma-separated string of fields.
 * @returns {Object} The projection object.
 */
const getProjectionFromFields = fields => {
	const fieldsArray = fields && fields.length > 0 ? fields.split(',') : [];
	return Object.assign({}, ...fieldsArray.map(key => ({ [key]: 1 })));
};

export default {
	cleanSlug,
	getAvailableSlug,
	getCorrectFileName,
	getProjectionFromFields
};
