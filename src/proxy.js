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
    maxRedirects: 2,
    responseType: 'stream', // Specify that we want a stream response
  };

  // Using got.stream to handle the request as a stream
  const stream = got.stream(url, options);

  // Handle stream errors by destroying the request socket
  stream.on('error', (err) => {
    console.error(err);
    req.socket.destroy(); // Close the socket connection
    redirect(req, res); // Redirect on error
  });

  stream
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

        // Pipe the stream directly to the response
        return stream.pipe(res);
      }
    })
    .catch((err) => {
      // Handle error directly
      if (err instanceof got.HTTPError) {
        return res.status(err.response.statusCode).send(err.response.body);
      }

      if (err.code === "ERR_INVALID_URL") {
        return res.status(400).send("Invalid URL");
      }

      // Redirect on other errors
      redirect(req, res);
      console.error(err);
    });
}

module.exports = proxy;
