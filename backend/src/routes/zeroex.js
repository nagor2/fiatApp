const express = require('express');
const https = require('https');
const router = express.Router();

router.use('*', (req, res) => {
  const apiKey = process.env.ZEROEX_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ZEROEX_API_KEY not configured on server' });

  const options = {
    hostname: 'api.0x.org',
    port: 443,
    path: req.url,  // req.url is relative to mount point, e.g. /swap/allowance-holder/price?...
    method: req.method,
    headers: {
      '0x-api-key': apiKey,
      '0x-version': 'v2',
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    res.status(proxyRes.statusCode);
    for (const [k, v] of Object.entries(proxyRes.headers)) {
      if (k.toLowerCase() !== 'transfer-encoding') res.setHeader(k, v);
    }
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    res.status(502).json({ error: '0x upstream error', message: err.message });
  });

  proxyReq.end();
});

module.exports = router;
