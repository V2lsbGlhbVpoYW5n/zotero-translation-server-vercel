/*
    ***** BEGIN LICENSE BLOCK *****
    
    Copyright © 2025 V2lsbGlhbVpoYW5n
    
    This file is part of Zotero.
    
    Zotero is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
    
    Zotero is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.
    
    You should have received a copy of the GNU Affero General Public License
    along with Zotero.  If not, see <http://www.gnu.org/licenses/>.
    
    ***** END LICENSE BLOCK *****
*/

const url = require('url');

require('./zotero');
const Debug = require('./debug');
var Translators;

const SearchEndpoint = require('./searchEndpoint');
const WebEndpoint = require('./webEndpoint');
const ExportEndpoint = require('./exportEndpoint');
const ImportEndpoint = require('./importEndpoint');

Debug.init(process.env.DEBUG_LEVEL ? parseInt(process.env.DEBUG_LEVEL) : 1);

// Route handlers mapping
const routes = {
	'/web': WebEndpoint,
	'/search': SearchEndpoint,
	'/export': ExportEndpoint,
	'/import': ImportEndpoint
};

/**
 * Read request body from stream
 */
async function readBody(req) {
	return new Promise((resolve, reject) => {
		let data = '';
		req.on('data', chunk => {
			data += chunk;
		});
		req.on('end', () => {
			resolve(data);
		});
		req.on('error', reject);
	});
}

/**
 * Parse Content-Type header
 */
function getContentType(contentTypeHeader) {
	if (!contentTypeHeader) return null;
	return contentTypeHeader.split(';')[0].trim();
}

/**
 * Check if content type matches
 */
function isContentType(contentType, types) {
	if (!contentType) return false;
	if (Array.isArray(types)) {
		return types.some(t => contentType === t || contentType.includes(t));
	}
	return contentType === types || contentType.includes(types);
}

/**
 * Vercel Serverless Function Handler
 */
module.exports.handler = async (req, res) => {
	// Initialize translators on first invocation
	if (!Translators) {
		Translators = require('./translators');
		await Translators.init();
	}

	try {
		// Parse URL
		const parsedUrl = url.parse(req.url, true);
		const pathname = parsedUrl.pathname;
		const query = parsedUrl.query;

		// Log request
		const userAgent = req.headers['user-agent'] || 'unknown';
		const origin = req.headers.origin || '';
		const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
		let logMsg = `${req.method} ${pathname} from ${ip} "${userAgent}"`;
		if (origin) {
			logMsg += ` (${origin})`;
		}
		Zotero.debug(logMsg);

		// Set CORS headers
		res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
		res.setHeader('Access-Control-Expose-Headers', 'Link');
		
		if (req.headers.origin) {
			const allowedOrigins = ['*'];
			if (allowedOrigins.includes('*') || allowedOrigins.includes(req.headers.origin)) {
				res.setHeader('Access-Control-Allow-Origin', '*');
			}
		}

		// Handle OPTIONS
		if (req.method === 'OPTIONS') {
			res.writeHead(200);
			res.end();
			return;
		}

		// Only handle POST
		if (req.method !== 'POST') {
			res.writeHead(405, { 'Content-Type': 'text/plain' });
			res.end('Method Not Allowed');
			return;
		}

		// Find matching route
		const endpoint = routes[pathname];
		if (!endpoint) {
			res.writeHead(404, { 'Content-Type': 'text/plain' });
			res.end('Not Found');
			return;
		}

		// Read request body
		let body;
		if (req.body !== undefined) {
			// Vercel pre-parsed the body
			body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
		} else {
			// Read from stream
			body = await readBody(req);
		}

		// Create mock Koa context
		const ctx = {
			method: req.method,
			url: req.url,
			path: pathname,
			query: query,
			headers: req.headers,
			request: {
				body: body,
				ip: ip,
				headers: req.headers,
				query: query
			},
			response: {
				status: 200,
				headers: {},
				body: null
			},
			status: 200,
			body: null,
			set(key, value) {
				this.response.headers[key] = value;
				res.setHeader(key, value);
			},
			is(type) {
				const contentType = getContentType(this.headers['content-type']);
				return isContentType(contentType, type);
			},
			assert(value, status) {
				if (!value) {
					const err = new Error();
					err.status = status;
					throw err;
				}
			},
			throw(status, message) {
				const err = new Error(message);
				err.status = status;
				throw err;
			}
		};

		// Call endpoint handler
		await endpoint.handle(ctx);

		// Send response
		const statusCode = ctx.status || 200;
		const responseBody = ctx.body || ctx.response.body;
		
		res.writeHead(statusCode, {
			'Content-Type': 'application/json',
			...ctx.response.headers
		});
		
		if (responseBody !== null && responseBody !== undefined) {
			if (typeof responseBody === 'object') {
				res.end(JSON.stringify(responseBody));
			} else {
				res.end(responseBody);
			}
		} else {
			res.end();
		}

	} catch (err) {
		console.error('Error:', err);
		
		const statusCode = err.status || 500;
		const message = err.message || 'Internal Server Error';
		
		res.writeHead(statusCode, { 'Content-Type': 'text/plain' });
		res.end(message + '\n');
	}
};
