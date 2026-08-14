const path = require('node:path');
const withTM = require(
  require.resolve('next-transpile-modules', {
    paths: [path.join(__dirname, 'apps/web')],
  })
)(['react-icons']);
/**
 * @type {import('next').NextConfig}
 */
const nextConfig = withTM({
  output: 'standalone',
  experimental: {
    instrumentationHook: true,
  },
  webpack(config) {
    config.resolve.modules = [
      path.join(__dirname, 'apps/web/node_modules'),
      ...(config.resolve.modules ?? []),
    ];

    return config;
  },
  async redirects() {
    return [
      {
        source: '/projects/spotify',
        destination: '/projects',
        permanent: true,
      },
    ]
  }
})

module.exports = nextConfig
