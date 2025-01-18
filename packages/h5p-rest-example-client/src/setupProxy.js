// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/h5p',
    createProxyMiddleware({
      target: 'http://127.0.0.1:8080/h5p',
      changeOrigin: true,
    })
  );
};