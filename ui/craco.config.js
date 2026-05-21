const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: (config) => {
      // pptxgenjs (and other modern packages) use node: URI scheme.
      // webpack 5 doesn't handle this by default — strip the prefix so
      // webpack resolves them through the normal fallback mechanism.
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, '');
        })
      );

      // Tell webpack these Node built-ins don't exist in the browser.
      // pptxgenjs uses fs only for server-side file writes; in the
      // browser it uses FileSaver instead, so false is correct here.
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs:      false,
        path:    false,
        stream:  false,
        crypto:  false,
        os:      false,
        buffer:  false,
        events:  false,
        util:    false,
        url:     false,
        zlib:    false,
        process: false,
      };

      return config;
    },
  },
};
