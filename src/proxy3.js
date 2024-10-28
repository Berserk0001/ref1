"use strict";
/*
 * proxy.js
 * The bandwidth hero proxy handler.
 * proxy(httpRequest, httpResponse);
 */
const axios = require("axios");
const pick = require("lodash").pick;
const shouldCompress = require("./shouldCompress");
const redirect = require("./redirect");
const compress = require("./compress");
const copyHeaders = require("./copyHeaders");

async function proxy(req, res) {
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
    responseType: 'stream'
  };

  try {
    const origin = await axios.get(url, options);

    if (origin.status >= 400 || (origin.status >= 300 && origin.headers.location)) {
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
    origin.data.on('error', () => req.socket.destroy());

    if (shouldCompress(req)) {
      // Compress and pipe response if required
      return compress(req, res, origin);
    } else {
      // Bypass compression
      res.setHeader("x-proxy-bypass", 1);

      // Set specific headers
      for (const headerName of ["accept-ranges", "content-type", "content-length", "content-range"]) {
        if (headerName in origin.headers) res.setHeader(headerName, origin.headers[headerName]);
      }

      return origin.data.pipe(res);
    }
  } catch (err) {
    // Handle error directly
    if (err.code === "ERR_INVALID_URL") {
      return res.status(400).send("Invalid URL");
    }

    // Redirect on other errors
    redirect(req, res);
    console.error(err);
  }
}

module.exports = proxy;
