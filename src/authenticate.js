"use strict";
const auth = require('basic-auth');
const LOGIN = process.env.LOGIN;
const PASSWORD = process.env.PASSWORD;

/**
 * Middleware to enforce HTTPS.
 * Redirects to the HTTPS version if the request is HTTP.
 */
function requireHTTPS(req, res, next) {
  if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
    // Redirect to HTTPS
    return res.redirect(`https://${req.get('host')}${req.url}`);
  }
  next();
}

function authenticate(req, res, next) {
  if (LOGIN && PASSWORD) {
    const credentials = auth(req)
    if (!credentials || credentials.name !== LOGIN || credentials.pass !== PASSWORD) {
      res.setHeader('WWW-Authenticate', `Basic realm="Bandwidth-Hero Compression Service"`);

      return res.status(401).end('Access denied');
    }
  }

  next();
}

module.exports = authenticate;
