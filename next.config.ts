import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() { return [{ source: "/study-two/:path*", headers: [{key:"Referrer-Policy",value:"no-referrer"},{key:"X-Robots-Tag",value:"noindex, nofollow"}] }]; },
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
