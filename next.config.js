/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // ─── SHARP FIX FOR VERCEL (Linux serverless runtime) ─────────────────────────
  // sharp uses native Node.js binaries. Vercel runs on Linux but local dev is Windows.
  // By marking sharp as a server external, Next.js won't try to bundle it — Vercel
  // installs the correct Linux binary at build time via npm.
  experimental: {
    serverComponentsExternalPackages: ["sharp"],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Stub Node.js `fs` for browser builds (was needed by face-api.js, kept as safe default)
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }

    if (isServer) {
      // Tell webpack NOT to bundle sharp — let Node.js resolve it natively at runtime
      // This is the key fix that makes sharp work on Vercel's Linux environment
      config.externals = [...(config.externals || []), "sharp"];
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
