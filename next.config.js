/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Stub Node.js `fs` for browser builds (needed by face-api.js)
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    // Suppress MediaPipe's internal dynamic-require warning
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      /Critical dependency: the request of a dependency is an expression/,
    ];
    return config;
  },
}

module.exports = nextConfig
