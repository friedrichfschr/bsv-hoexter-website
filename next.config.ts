import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  outputFileTracingIncludes: {
    "/api/about/dokumente/[id]": ["./content/about-documents/**/*"],
    "/api/about/medien/[id]": ["./content/about-images/**/*"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
