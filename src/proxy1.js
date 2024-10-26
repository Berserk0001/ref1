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
const compress = require("./compress1");
const copyHeaders = require("./copyHeaders");

async function proxy(req, res) {
  /*
   * Avoid loopback that could cause server hang.
   */
  if (
    req.headers["via"] == "1.1 bandwidth-hero" &&
    ["127.0.0.1", "::1"].includes(req.headers["x-forwarded-for"] || req.ip)
  )
    return redirect(req, res);

  try {
    const response = await axios.get(req.params.url, {
      headers: {
        ...pick(req.headers, ["cookie", "dnt", "referer", "range"]),
        "user-agent": "Bandwidth-Hero Compressor",
        via: "1.1 bandwidth-hero",
      },
      maxRedirects: 4,
      responseType: "stream",
    });
    _onRequestResponse(response, req, res);
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

function _onRequestResponse(response, req, res) {
  if (response.status >= 400)
    return redirect(req, res);

  // handle redirects
  if (response.status >= 300 && response.headers.location)
    return redirect(req, res);

  copyHeaders(response, res);
  res.setHeader("content-encoding", "identity");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
  req.params.originType = response.headers["content-type"] || "";
  req.params.originSize = response.headers["content-length"] || "0";

  response.data.on('error', () => req.socket.destroy());

  if (shouldCompress(req)) {
    /*
     * sharp support stream. So pipe it.
     */
    return compress(req, res, response);
  } else {
    /*
     * Downloading then uploading the buffer to the client is not a good idea though,
     * It would better if you pipe the incoming buffer to client directly.
     */

    res.setHeader("x-proxy-bypass", 1);

    for (const headerName of ["accept-ranges", "content-type", "content-length", "content-range"]) {
      if (headerName in response.headers)
        res.setHeader(headerName, response.headers[headerName]);
    }

    return response.data.pipe(res);
  }
}

module.exports = proxy;
