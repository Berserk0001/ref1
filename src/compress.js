const sharp = require('sharp');
const redirect = require('./redirect');

function compress(req, res, input) {
    const format = 'jpeg';

    // Pipe the ReadableStream into sharp
    input.data.pipe(
        sharp()
            .grayscale(req.params.grayscale)
            .toFormat(format, {
                quality: req.params.quality
            })
    ).toBuffer((err, output, info) => {
        if (err || !info) return redirect(req, res);
        if (res.headersSent) return;
        res.setHeader('content-type', `image/${format}`);
        res.setHeader('content-length', info.size);
        res.setHeader('x-original-size', req.params.originSize);
        res.setHeader('x-bytes-saved', req.params.originSize - info.size);
        res.status(200);
        res.write(output);
        res.end();
    });
}

module.exports = compress;
