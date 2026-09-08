import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/study-one/:path*",
        destination: "https://study-one-review-study-one-review.up.railway.app/study-one/:path*",
      },
      {
        source: "/study-one",
        destination: "https://study-one-review-study-one-review.up.railway.app/study-one",
      },
    ];
  },
};

export default nextConfig;
