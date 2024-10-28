"use strict";
/*
 * compress.js
 * A module that compresses an image
 * compress(httpRequest, httpResponse, ReadableStream);
 */
const sharp = require('sharp');
const redirect = require('./redirect');

// Enable caching and set concurrency for sharp
sharp.cache(false);
sharp.concurrency(0);

function compress(req, res, input) {
  const format = 'jpeg';

  // Pipe the input to sharp for processing
  input.data
    .pipe(
      sharp({ animated: false, unlimited: true })
        .grayscale(req.params.grayscale)
        .toFormat(format, {
          quality: req.params.quality,
          chromaSubsampling: '4:2:0',
        })
    )
    .toBuffer()
    .then((output) => {
       sharp(output).metadata().then((info) => {
        // Set response headers and send the output
        res.setHeader('content-type', `image/${format}`);
        res.setHeader('content-length', info.size);
        res.setHeader('x-original-size', req.params.originSize);
        res.setHeader('x-bytes-saved', req.params.originSize - info.size);
        res.status(200).send(output);
      });
    })
    .catch((err) => {
      console.error("Error:", err);
      redirect(req, res);
    });
}

module.exports = compress;
