const { createProxyMiddleware } = require('http-proxy-middleware');

const BACKEND = process.env.BACKEND_URL || 'http://localhost:3001';
const WATCHER = process.env.WATCHER_URL  || 'http://localhost:3002';

module.exports = function(app) {
  // ── External APIs ──────────────────────────────────────────────────────────

  // 0x Swap API — adds API key + version server-side (CORS blocks from browser)
  // pathRewrite works here because we intentionally strip /api/0x prefix
  app.use(
    '/api/0x',
    createProxyMiddleware({
      target: 'https://api.0x.org',
      changeOrigin: true,
      secure: true,
      headers: {
        '0x-api-key': process.env.REACT_APP_ZEROEX_API_KEY || '',
        '0x-version': 'v2',
      },
    })
  );

  // Etherscan API (CORS bypass)
  app.use(
    '/api/etherscan',
    createProxyMiddleware({
      target: 'https://api.etherscan.io/v2/api',
      changeOrigin: true,
      secure: true,
      pathRewrite: { '^/api/etherscan': '' },
      onError: (err, req, res) => {
        res.status(500).json({ error: 'Etherscan proxy error', message: err.message });
      },
    })
  );

  // Ethereum JSON-RPC — strip prefix, send to root of RPC endpoint
  app.use(
    '/api/rpc',
    createProxyMiddleware({
      target: 'https://ethereum-rpc.publicnode.com',
      changeOrigin: true,
      secure: true,
      onError: (err, req, res) => {
        res.status(500).json({ error: 'RPC proxy error', message: err.message });
      },
    })
  );

  // ── Backend API ────────────────────────────────────────────────────────────
  // Use pathFilter (not app.use prefix) so http-proxy-middleware v3 preserves
  // the full path — Express strips the matched prefix when using app.use(path, ...).

  app.use(
    createProxyMiddleware({
      target: BACKEND,
      changeOrigin: true,
      pathFilter: ['/api/prices', '/api/contracts', '/api/ethprice'],
      onError: (err, req, res) => {
        res.status(503).json({ error: 'backend unavailable', message: err.message });
      },
    })
  );

  // ── Block-watcher worker API ───────────────────────────────────────────────

  app.use(
    createProxyMiddleware({
      target: WATCHER,
      changeOrigin: true,
      pathFilter: '/api/call',
      onError: (err, req, res) => {
        res.status(503).json({ error: 'watcher unavailable', message: err.message });
      },
    })
  );

  // /api/worker/* → watcher root (strip /api/worker prefix)
  app.use(
    '/api/worker',
    createProxyMiddleware({
      target: WATCHER,
      changeOrigin: true,
      onError: (err, req, res) => {
        res.status(503).json({ error: 'watcher unavailable', message: err.message });
      },
    })
  );
};
