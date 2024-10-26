"use strict";
/*
 * proxy.js
 * The bandwidth hero proxy handler.
 * proxy(httpRequest, httpResponse);
 */
const undicirequest = require("undici").get;
const pick = require("lodash").pick;
const shouldCompress = require("./shouldCompress");
const redirect = require("./redirect");
const compress = require("./compress");
const copyHeaders = require("./copyHeaders");

async function proxy(req, res) {
  /*
   * Avoid loopback that could causing server hang.
   */
  const loopbackAddresses = ["127.0.0.1", "::1"];
  
  if (loopbackAddresses.includes(req.socket.remoteAddress)) {
    return redirect(req, res);
  }
  try {
    let origin = await undicirequest(req.params.url, 
      {
      headers: {
        ...pick(req.headers, ["cookie", "dnt", "referer", "range"]),
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/114.0",
      },
      maxRedirections: 4
    });
    _onRequestResponse(origin, req, res);
  } catch (err) {
    _onRequestError(req, res, err);
  }
}

function _onRequestError(req, res, err) {
  // Ignore invalid URL.
  if (err.code === "ERR_INVALID_URL") return res.status(400).send("Invalid URL");

  /*
   * When there's a real error, Redirect then destroy the stream immediately.
   */
  redirect(req, res);
  console.error(err);
}

function _onRequestResponse(origin, req, res) {
  if (origin.statusCode >= 400)
    return redirect(req, res);

  // handle redirects
  if (origin.statusCode >= 300 && origin.headers.location)
    return redirect(req, res);

  copyHeaders(origin, res);
  res.setHeader("content-encoding", "identity");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
  req.params.originType = origin.headers["content-type"] || "";
  req.params.originSize = origin.headers["content-length"] || "0";

  origin.body.on('error', _ => req.socket.destroy());

  if (shouldCompress(req)) {
    /*
     * sharp support stream. So pipe it.
     */
    return compress(req, res, origin);
  } else {
    /*
     * Downloading then uploading the buffer to the client is not a good idea though,
     * It would better if you pipe the incomming buffer to client directly.
     */

    res.setHeader("x-proxy-bypass", 1);

    for (const headerName of ["accept-ranges", "content-type", "content-length", "content-range"]) {
      if (headerName in origin.headers)
        res.setHeader(headerName, origin.headers[headerName]);
    }

    return origin.body.pipe(res);
  }
}


module.exports = proxy;
