/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Stub Node.js `fs` for browser builds (was needed by face-api.js, kept as safe default)
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    // Suppress MediaPipe's internal dynamic-require warning (harmless — WASM loaded from CDN at runtime)
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      /Critical dependency: the request of a dependency is an expression/,
    ];
    return config;
  },
}

module.exports = nextConfig
