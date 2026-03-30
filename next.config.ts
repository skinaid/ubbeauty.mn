import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Browsers request /favicon.ico by default; serve the app icon to avoid noisy 404s.
    return [{ source: "/favicon.ico", destination: "/icon" }];
  },
  async redirects() {
    return [
      // Legacy overview URL only — sub-routes stay under /internal/ops/* until migrated (Phase C+).
      { source: "/internal/ops", destination: "/admin", permanent: false }
    ];
  }
};

export default nextConfig;
