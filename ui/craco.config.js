// Inline webpack plugin — no require('webpack') needed.
// Rewrites node: URI scheme requests before webpack tries to handle them.
class NodeUriSchemePlugin {
  apply(compiler) {
    compiler.hooks.normalModuleFactory.tap('NodeUriSchemePlugin', nmf => {
      nmf.hooks.beforeResolve.tap('NodeUriSchemePlugin', result => {
        if (result && result.request && result.request.startsWith('node:')) {
          result.request = result.request.slice(5);
        }
      });
    });
  }
}

module.exports = {
  webpack: {
    configure: (config) => {
      config.plugins.push(new NodeUriSchemePlugin());

      // After stripping node: prefix, tell webpack these Node built-ins
      // don't exist in the browser (pptxgenjs uses FileSaver instead of fs).
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
