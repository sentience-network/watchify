/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        pathname: "/wikipedia/**",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/vi/**",
      },
      {
        protocol: "https",
        hostname: "archive.org",
        pathname: "/services/img/**",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(self), microphone=(self), display-capture=(self), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.youtube.com https://www.youtube-nocookie.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://image.tmdb.org https://i.ytimg.com https://upload.wikimedia.org https://archive.org https://*.archive.org https://*.fbcdn.net https://platform-lookaside.fbsbx.com https://api.dicebear.com https://avatars.githubusercontent.com https://*.googleusercontent.com",
              "font-src 'self' data:",
              "media-src 'self' blob: https://commondatastorage.googleapis.com https://*.googleapis.com https://archive.org https://*.archive.org https://download.blender.org https://*.blender.org",
              "connect-src 'self' https://api.stripe.com https://archive.org https://*.archive.org https://www.youtube.com https://watchify-realtime.onrender.com wss://watchify-realtime.onrender.com http://localhost:3345 http://127.0.0.1:3345 ws://localhost:3345 ws://127.0.0.1:3345",
              "frame-src https://js.stripe.com https://hooks.stripe.com https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com https://archive.org",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
