import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers(){return [{source:"/admin/:path*",headers:[{key:"Cache-Control",value:"private, no-store, max-age=0"},{key:"X-Robots-Tag",value:"noindex, nofollow"}]}];},
  async rewrites() {
    return [
      { source: "/study-one/api/:path*", destination: "/api/:path*" },
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
