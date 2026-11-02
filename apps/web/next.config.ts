import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@dagitim/db", "@dagitim/shared", "@dagitim/excel"],
  serverExternalPackages: ["@prisma/client", "bcryptjs", "xlsx", "pg"],
  experimental: { serverActions: { bodySizeLimit: "50mb" } },
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
};

export default nextConfig;
