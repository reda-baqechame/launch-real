import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    root: path.join(__dirname),
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            // Allow same-origin camera/mic/screen-capture for the recorder.
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), display-capture=(self), geolocation=()",
          },
          {
            // HSTS — only honored over HTTPS, ignored on localhost.
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // NOTE: a Content-Security-Policy is intentionally omitted here. An
          // enforced CSP must be verified in a real browser against Clerk +
          // Stripe + fal.ai + Google Fonts (an untested CSP can silently break
          // auth/payments). Add it as a follow-up once it can be browser-tested.
        ],
      },
    ];
  },
};

export default nextConfig;
