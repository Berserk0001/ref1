"use strict";
/*
 * proxy.js
 * The bandwidth hero proxy handler.
 * proxy(httpRequest, httpResponse);
 */
const got = require("got");
const pick = require("lodash").pick;
const shouldCompress = require("./shouldCompress");
const redirect = require("./redirect");
const compress = require("./compress");
const copyHeaders = require("./copyHeaders");

function proxy(req, res) {
  /*
   * Avoid loopback that could cause server hang.
   */

  const url = req.params.url;
  const options = {
    headers: {
      ...pick(req.headers, ["cookie", "dnt", "referer", "range"]),
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.3",
    },
    //responseType: 'buffer', // Set to 'buffer' if you need the whole response in memory or stream if you want to stream
    maxRedirects: 2,
    throwHttpErrors: false,
    isStream: true // Use isStream to indicate you want a stream
  };

  got.stream(url, options)
    .on('error', (err) => {
      req.socket.destroy(); // Handle stream errors
      console.error(err);
      redirect(req, res); // Redirect on error
    })
    .then((origin) => {
      if (origin.statusCode >= 400 || (origin.statusCode >= 300 && origin.headers.location)) {
        // Redirect if status is 4xx or redirect location is present
        return redirect(req, res);
      }

      // Copy headers to response
      copyHeaders(origin, res);
      res.setHeader("content-encoding", "identity");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
      req.params.originType = origin.headers["content-type"] || "";
      req.params.originSize = origin.headers["content-length"] || "0";

      // Handle streaming response
      origin.on('error', () => req.socket.destroy());

      if (shouldCompress(req)) {
        // Compress and pipe response if required
        return compress(req, res, origin);
      } else {
        // Bypass compression
        res.setHeader("x-proxy-bypass", 1);

        // Set specific headers
        ["accept-ranges", "content-type", "content-length", "content-range"].forEach((headerName) => {
          if (headerName in origin.headers) res.setHeader(headerName, origin.headers[headerName]);
        });

        return origin.pipe(res);
      }
    })
    .catch((err) => {
      if (error instanceof RequestError) {
      console.log(error);
      return res.status(503).end('request time out', 'ascii');
    }
    console.log("some error on " + req.path + "\n", error, '\n');
    return redirect(req, res);
    });
}

module.exports = proxy;
