const withTM = require('next-transpile-modules')(['react-icons']);
/**
 * @type {import('next').NextConfig}
 */
const nextConfig = withTM({
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
