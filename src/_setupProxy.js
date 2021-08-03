const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
    app.use(
        '/protocol/v0.1/*',
        createProxyMiddleware({
            target: "https://api-rinkeby.rarible.com",
            secure: true,
            changeOrigin: true,
            logLevel: 'debug',
            // ws: true, // proxy websockets
        })
    );
};