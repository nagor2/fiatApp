const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy for 0x Swap API — adds 0x-version + API key server-side (CORS blocks both from browser)
  app.use(
    '/api/0x',
    createProxyMiddleware({
      target: 'https://api.0x.org',
      changeOrigin: true,
      secure: true,
      pathRewrite: { '^/api/0x': '/' },
      headers: {
        '0x-api-key': process.env.REACT_APP_ZEROEX_API_KEY || '',
        '0x-version': 'v2',
      },
    })
  );

  // Proxy для RPC запросов в development режиме
  // Это позволяет использовать тот же /api/rpc путь что и в production
  app.use(
    '/api/rpc',
    createProxyMiddleware({
      target: 'https://ethereum.publicnode.com',
      changeOrigin: true,
      secure: true,
      pathRewrite: {
        '^/api/rpc': '/',
      },
      onProxyReq: (proxyReq, req, res) => {
        // Логируем RPC запросы для отладки
        if (process.env.DEBUG_RPC) {
          console.log(`[RPC Proxy] ${req.method} ${req.url}`);
        }
      },
      onError: (err, req, res) => {
        console.error('[RPC Proxy Error]', err.message);
        res.status(500).json({ 
          error: 'RPC proxy error', 
          message: err.message 
        });
      },
    })
  );

  // Proxy для Etherscan API V2 (избежание CORS)
  app.use(
    '/api/etherscan',
    createProxyMiddleware({
      target: 'https://api.etherscan.io',
      changeOrigin: true,
      secure: true,
      pathRewrite: {
        '^/api/etherscan': '/v2/api',
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log(`[Etherscan Proxy] ${req.method} ${req.url} -> https://api.etherscan.io${proxyReq.path}`);
      },
      onError: (err, req, res) => {
        console.error('[Etherscan Proxy Error]', err.message);
        res.status(500).json({ 
          error: 'Etherscan proxy error', 
          message: err.message 
        });
      },
    })
  );

  // Proxy для Block Watcher API (кэшированные contract calls)
  app.use(
    '/api/call',
    createProxyMiddleware({
      target: 'http://localhost:3002',
      changeOrigin: true,
      onProxyReq: (proxyReq, req, res) => {
        if (process.env.DEBUG_API) {
          console.log(`[Contract Cache API] ${req.method} ${req.url}`);
        }
      },
      onError: (err, req, res) => {
        console.error('[Contract Cache API Error]', err.message);
        res.status(500).json({
          error: 'Contract cache API error',
          message: err.message
        });
      },
    })
  );

  // Proxy для block-watcher worker API (/api/worker/* → localhost:3002/*).
  // В production тот же путь проксируется nginx на k8s Service воркера.
  // Позволяет фронтенду использовать один относительный URL в dev и prod.
  app.use(
    '/api/worker',
    createProxyMiddleware({
      target: 'http://localhost:3002',
      changeOrigin: true,
      pathRewrite: {
        '^/api/worker': '',
      },
      onProxyReq: (proxyReq, req, res) => {
        if (process.env.DEBUG_API) {
          console.log(`[Worker Proxy] ${req.method} ${req.url}`);
        }
      },
      onError: (err, req, res) => {
        console.error('[Worker Proxy Error]', err.message);
        res.status(500).json({
          error: 'Worker proxy error',
          message: err.message
        });
      },
    })
  );
};
