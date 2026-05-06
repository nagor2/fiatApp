const express = require('express');
const https = require('https');
const router = express.Router();

router.get('/', (req, res) => {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ETHERSCAN_API_KEY not configured on server' });

  const url = `https://api.etherscan.io/v2/api?chainid=1&module=stats&action=ethprice&apikey=${apiKey}`;

  https.get(url, (proxyRes) => {
    let data = '';
    proxyRes.on('data', chunk => { data += chunk; });
    proxyRes.on('end', () => {
      try {
        res.status(proxyRes.statusCode).json(JSON.parse(data));
      } catch {
        res.status(502).json({ error: 'Invalid response from Etherscan' });
      }
    });
  }).on('error', (err) => {
    res.status(502).json({ error: 'Etherscan upstream error', message: err.message });
  });
});

module.exports = router;
