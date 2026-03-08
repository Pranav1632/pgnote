import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const isProduction = process.env.NODE_ENV === "production";
    const contentSecurityPolicy = [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.upstash.io",
      "form-action 'self'",
      ...(isProduction ? ["upgrade-insecure-requests"] : []),
    ].join("; ");

    const sharedHeaders = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Content-Security-Policy", value: contentSecurityPolicy },
    ];

    const strictTransportHeader = {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    };

    return [
      {
        source: "/:path*",
        headers: isProduction
          ? [...sharedHeaders, strictTransportHeader]
          : sharedHeaders,
      },
    ];
  },
};

export default nextConfig;
