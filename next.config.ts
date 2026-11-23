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
  experimental: {
    // src/proxy.ts runs on /api too, so Next buffers request bodies for it and
    // SILENTLY TRUNCATES anything over this (default 10 MB). The largest uploads
    // are chat attachments (25 MB, MAX_UPLOAD_SIZE_BYTES) and reply attachments
    // (20 MB total), plus multipart overhead.
    proxyClientMaxBodySize: "26mb",
  },
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
        // Everything except the embeddable widget and captcha pages is unframeable.
        source: "/((?!embed/|captcha/).*)",
        headers: [...common, { key: "X-Frame-Options", value: "DENY" }],
      },
      {
        // /embed/{publicKey} is meant to be iframed by the widget's allowed
        // origins: src/proxy.ts sets a per-widget `frame-ancestors` CSP instead.
        source: "/embed/:path*",
        headers: common,
      },
      {
        // /captcha/{siteKey}: same, with the captcha site's allowed websites.
        source: "/captcha/:path*",
        headers: common,
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
