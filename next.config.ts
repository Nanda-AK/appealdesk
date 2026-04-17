import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "nwfviebtftwjgtawcbci.supabase.co",
      },
    ],
  },
};

export default nextConfig;
