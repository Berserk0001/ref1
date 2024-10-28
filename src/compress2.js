"use strict";
/*
 * compress.js
 * A module that compresses an image
 * compress(httpRequest, httpResponse, ReadableStream);
 */
const sharp = require('sharp');
const redirect = require('./redirect');

// Disable caching and set concurrency for sharp
/*sharp.cache(true);
sharp.concurrency(0);
const sharpStream = () => sharp({ animated: false, unlimited: true });*/

function compress(req, res, input) {
  const format = 'jpeg';

  input.data
    .pipe(
      sharp()
        .grayscale(req.params.grayscale)
        .toFormat(format, {
          quality: req.params.quality
         // chromaSubsampling: '4:2:0',
        })
    )
    .toBuffer()
    .then((output) => {
      sharp(output)
        .metadata()
        .then((info) => {
          res.setHeader('content-type', 'image/' + format);
          res.setHeader('content-length', info.size);
          res.setHeader('x-original-size', req.params.originSize);
          res.setHeader('x-bytes-saved', req.params.originSize - info.size);
          res.status(200).send(output);
        })
        .catch((err) => {
          console.error("Metadata error:", err);
          redirect(req, res);
        });
    })
    .catch((err) => {
      console.error("Compression error:", err);
      redirect(req, res);
    });
}

module.exports = compress;

