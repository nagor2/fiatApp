const express = require('express');
const https   = require('https');
const http    = require('http');
const { URL } = require('url');

const router  = express.Router();
const RPC_URL = process.env.RPC_URL || 'https://ethereum-rpc.publicnode.com';

// POST /api/rpc — transparent proxy to the Ethereum JSON-RPC endpoint.
// Allows the browser to send RPC calls via the backend (avoids CORS issues).
router.post('/', (req, res) => {
  const target = new URL(RPC_URL);
  const body   = JSON.stringify(req.body);
  const lib    = target.protocol === 'https:' ? https : http;

  const options = {
    hostname: target.hostname,
    port:     target.port || (target.protocol === 'https:' ? 443 : 80),
    path:     target.pathname + target.search,
    method:   'POST',
    headers:  {
      'Content-Type':   'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
    timeout: 10000,
  };

  const proxyReq = lib.request(options, (proxyRes) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.status(proxyRes.statusCode);
    proxyRes.pipe(res);
  });

  proxyReq.on('timeout', () => {
    proxyReq.destroy();
    res.status(504).json({ error: 'RPC upstream timeout' });
  });

  proxyReq.on('error', (err) => {
    res.status(502).json({ error: 'RPC upstream error', message: err.message });
  });

  proxyReq.write(body);
  proxyReq.end();
});

router.options('/', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(204);
});

module.exports = router;
