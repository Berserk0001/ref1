#!/usr/bin/env node
"use strict";

const app = require('express')();
const params = require('./src/params');
const proxy = require('./src/proxy2');

const PORT = 8080;

app.enable('trust proxy');
app.get('/', params, proxy);
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
