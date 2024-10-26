"use strict";
/*
 * compress.js
 * A module that compress a image
 * compress(httpRequest, httpResponse, ReadableStream);
 */
const sharp = require('sharp');
const redirect = require('./redirect');

// Disable caching and set concurrency for sharp
const stats = sharp.cache(false);
const threads = sharp.concurrency(0);
const sharpStream = _ => sharp({ animated: false, unlimited: true });

function compress(req, res, input) {
  const format = 'avif';
  

  /*
   * Determine the uncompressed image size when there's no content-length header.
   */

  /*
   * input.pipe => sharp (The compressor) => Send to httpResponse
   * The following headers:
   * |  Header Name  |            Description            |           Value            |
   * |---------------|-----------------------------------|----------------------------|
   * |x-original-size|Original photo size                |OriginSize                  |
   * |x-bytes-saved  |Saved bandwidth from original photo|OriginSize - Compressed Size|
   */
  input.body.pipe(sharpStream()
    .grayscale(req.params.grayscale)
    .toFormat(format, {
      quality: req.params.quality,
   progressive: true,
    chromaSubsampling: '4:4:4',
  //  mozjpeg: true,
  //  trellisQuantisation: true,
    optimiseScans: true
     
  //  force: 'true'
     // optimiseCoding: 'true',

      //progressive: true,
    // optimizeScans: true,
     // effort: 0
    })
    .toBuffer((err, output, info) => _sendResponse(err, output, info, format, req, res)));
}

function _sendResponse(err, output, info, format, req, res) {
  if (err || !info) return redirect(req, res);

  res.setHeader('content-type', 'image/' + format);
  res.setHeader('content-length', info.size);
  res.setHeader('x-original-size', req.params.originSize);
  res.setHeader('x-bytes-saved', req.params.originSize - info.size);
  res.status(200);
  res.write(output);
  res.end();
}

module.exports = compress;
