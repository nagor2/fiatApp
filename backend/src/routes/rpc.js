const express = require('express');
const https   = require('https');
const http    = require('http');
const { URL } = require('url');
const { withFallback } = require('../utils/rpcProvider');

const router = express.Router();

function proxyToUrl(rpcUrl, body) {
  return new Promise((resolve, reject) => {
    const target = new URL(rpcUrl);
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

    const chunks = [];

    const proxyReq = lib.request(options, (proxyRes) => {
      const statusCode = proxyRes.statusCode;
      proxyRes.on('data', (chunk) => chunks.push(chunk));
      proxyRes.on('end', () => {
        const responseBody = Buffer.concat(chunks);
        if (statusCode >= 500) {
          reject(new Error(`RPC returned HTTP ${statusCode}`));
        } else {
          resolve({ statusCode, responseBody });
        }
      });
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      reject(new Error('RPC upstream timeout'));
    });

    proxyReq.on('error', reject);

    proxyReq.write(body);
    proxyReq.end();
  });
}

// POST /api/rpc — transparent proxy to Ethereum JSON-RPC with multi-URL fallback.
router.post('/', async (req, res) => {
  const body = JSON.stringify(req.body);

  try {
    const { statusCode, responseBody } = await withFallback((_web3, rpcUrl) =>
      proxyToUrl(rpcUrl, body)
    );

    res.set('Access-Control-Allow-Origin', '*');
    res.status(statusCode).end(responseBody);
  } catch (err) {
    res.status(502).json({ error: 'RPC upstream error', message: err.message });
  }
});

router.options('/', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(204);
});

module.exports = router;
