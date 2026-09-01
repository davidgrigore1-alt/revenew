/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    const commonSecurityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
      ...(process.env.NODE_ENV === "production"
        ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]
        : [])
    ];

    return [
      {
        source: "/:path*",
        headers: commonSecurityHeaders
      }
    ];
  }
};

export default nextConfig;
