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

const validateResponse = (res) => {
  if (res.statusCode >= 400 || !res.headers['content-type'].startsWith('image')) {
    throw Error(`content-type was ${res.headers['content-type']} expected content type "image/*", status code ${res.statusCode}`);
    //redirect(req, res);
  }
};

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
   // followRedirect: false, // We handle redirects manually
    throwHttpErrors: false, // We handle errors based on status code
   // retry: { limit: 2 }, // Optionally, define retry limits (if needed)
  //  timeout: { request: 10000 },
  };

  try {
    let origin = got.stream(url, options);

    origin.on('response', (originResponse) => {
      
    if (originResponse.statusCode >= 400)
    return redirect(req, res);

  // handle redirects
  if (originResponse.statusCode >= 300 && origin.headers.location)
    return redirect(req, res);

      // Copy headers to response
      copyHeaders(originResponse, res);
      res.setHeader("content-encoding", "identity");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
      req.params.originType = originResponse.headers["content-type"] || "";
      req.params.originSize = originResponse.headers["content-length"] || "0";

      // Handle streaming response
      origin.on('error', () => req.socket.destroy());

      if (shouldCompress(req)) {
        // Compress and pipe response if required
        return compress(req, res, origin);
      } else {
        // Bypass compression
        res.setHeader("x-proxy-bypass", 1);

        // Set specific headers
        for (const headerName of ["accept-ranges", "content-type", "content-length", "content-range"]) {
          if (headerName in originResponse.headers) res.setHeader(headerName, originResponse.headers[headerName]);
        }

        return origin.pipe(res);
      }
    });
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
