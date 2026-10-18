import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client"],
  agentRules: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
