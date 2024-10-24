"use strict";
const DEFAULT_QUALITY = 40


function params(req, res, next) {
  let url = req.query.url;
  if (!url) return res.send('bandwidth-hero-proxy');
  // If the URL starts with 'http:', change it to 'https:'
  if (url && url.startsWith('http:')) {
    url = url.replace('http:', 'https:');
  }
  req.params.url = decodeURIComponent(url);
  req.params.webp = !req.query.jpeg
  req.params.grayscale = req.query.bw != 0
  req.params.quality = parseInt(req.query.l, 10) || DEFAULT_QUALITY

  next()
}
 module.exports = params;
