import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ulctjnzadowpxcxpnwdz.supabase.co",
      },
    ],
  },
};

export default nextConfig;
