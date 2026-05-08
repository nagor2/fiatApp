const express = require('express');
const https = require('https');
const logger = require('../utils/logger');
const router = express.Router();

router.use('*', (req, res) => {
  const apiKey = process.env.ZEROEX_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ZEROEX_API_KEY not configured on server' });

  const options = {
    hostname: 'api.0x.org',
    port: 443,
    path: req.url,
    method: req.method,
    headers: {
      '0x-api-key': apiKey,
      '0x-version': 'v2',
    },
  };

  logger.debug(`0x proxy → GET https://api.0x.org${req.url}`);

  const proxyReq = https.request(options, (proxyRes) => {
    const status = proxyRes.statusCode;
    // Collect body for debug logging before piping
    const chunks = [];
    proxyRes.on('data', (c) => chunks.push(c));
    proxyRes.on('end', () => {
      const body = Buffer.concat(chunks);
      if (status !== 200) {
        logger.warn(`0x proxy ← ${status} ${req.url} — ${body.toString().slice(0, 300)}`);
      } else {
        try {
          const json = JSON.parse(body.toString());
          if (json.liquidityAvailable === false) {
            logger.warn(`0x proxy ← 200 no liquidity: ${req.url}`);
          } else {
            logger.debug(`0x proxy ← 200 buyAmount=${json.buyAmount} ${req.url}`);
          }
        } catch (_) {}
      }
      res.status(status);
      for (const [k, v] of Object.entries(proxyRes.headers)) {
        if (k.toLowerCase() !== 'transfer-encoding') res.setHeader(k, v);
      }
      res.end(body);
    });
  });

  proxyReq.on('error', (err) => {
    logger.error(`0x proxy error: ${err.message}`);
    res.status(502).json({ error: '0x upstream error', message: err.message });
  });

  proxyReq.end();
});

module.exports = router;
