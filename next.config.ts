import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Dev-only "N" badge: keep it off the sidebar footer (profile / sign out).
  devIndicators: { position: "bottom-right" },
  typedRoutes: true,
  // `next dev` blocks /_next/* dev assets for any origin other than localhost,
  // so the page never hydrates and forms fall back to a native GET submit.
  // List the LAN IPs / tunnel hosts you share the dev server through.
  allowedDevOrigins: ["*.ngrok-free.dev", "*.ngrok-free.app", "192.168.*.*", "10.*.*.*"],
  // NOTE: a strict CSP requires the nonce/headers() middleware strategy and
  // lands in the phase 7 security pass (.agent/phase_7.txt item 63).
  async headers() {
    const common = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
    ];
    return [
      {
        // Everything except the embeddable widget page is unframeable.
        source: "/((?!embed/).*)",
        headers: [...common, { key: "X-Frame-Options", value: "DENY" }],
      },
      {
        // /embed/{publicKey} is meant to be iframed by the widget's allowed
        // origins: src/proxy.ts sets a per-widget `frame-ancestors` CSP instead.
        source: "/embed/:path*",
        headers: common,
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
