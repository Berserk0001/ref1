#!/usr/bin/env node
"use strict";
const cluster = require("cluster");
const os = require("os");

if (cluster.isPrimary) {
  const numClusters = process.env.CLUSTERS || (os.availableParallelism ? os.availableParallelism() : (os.cpus().length || 2))

  console.log(`Primary ${process.pid} is running. Will fork ${numClusters} clusters.`);

  // Fork workers.
  for (let i = 0; i < numClusters; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Forking another one....`);
    cluster.fork();
  });

  return true;
}

const app = require('express')();
const authenticate = require('./src/authenticate');
const params = require('./src/params');
const proxy = require('./src/proxy');

const PORT = process.env.PORT || 8080;

app.enable('trust proxy');
app.get('/', params, proxy);
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.listen(PORT, () => console.log(`Worker ${process.pid}: Listening on ${PORT}`));
