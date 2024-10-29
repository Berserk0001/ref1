"use strict";
const sharp = require('sharp');
const redirect = require('./redirect');
const sharpStream = _ => sharp({ animated: false, unlimited: true });

function compress(req, res, input) {
    const format = 'jpeg';

    // Create a sharp pipeline to process the image
    const pipeline = sharpStream()
        .toFormat(format, {
            quality: req.params.quality
        });

    

    // Use the input stream to pipe into the sharp pipeline and convert it to a buffer
    input.data.pipe(pipeline)
        .toBuffer((err, outputBuffer, info) => {
            if (err) {
                console.error('Buffer conversion error:', err);
                return redirect(request, reply); // Redirect on error
            }

            // Set headers based on output info
res.setHeader('content-type', 'image/' + format);
  res.setHeader('content-length', info.size);
  res.setHeader('x-original-size', req.params.originSize);
  res.setHeader('x-bytes-saved', req.params.originSize - info.size);
  res.status(200);
  res.write(outputBuffer);
  res.end();
        });
}

module.exports = compress;
