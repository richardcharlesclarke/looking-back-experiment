import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() { return [...["/results/:path*","/administration/:path*","/study-guides/:path*","/admin/:path*","/organiser/:path*","/study-two/results","/study-two/review"].map(source=>({source,headers:[{key:"Cache-Control",value:"private, no-store, max-age=0"},{key:"X-Robots-Tag",value:"noindex, nofollow"}]})),{ source: "/study-two/:path*", headers: [{key:"Referrer-Policy",value:"no-referrer"},{key:"X-Robots-Tag",value:"noindex, nofollow"}] }]; },
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
