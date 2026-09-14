/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  reactStrictMode: true,
  // Self-contained server bundle for Docker (.next/standalone/server.js).
  output: "standalone",
  // The Strands SDK pulls in optional Node-only deps (AWS SDK, etc.) that we
  // never touch with the mock model. Keep them external so bundling stays lean.
  serverExternalPackages: ["@strands-agents/sdk"],
  // Ensure the (externalized) Strands SDK + its AWS deps are traced into the
  // standalone output so the /api/agent route can load them at runtime.
  outputFileTracingIncludes: {
    "/api/agent": [
      "./node_modules/@strands-agents/**/*",
      "./node_modules/@aws-sdk/**/*",
      "./node_modules/@smithy/**/*",
    ],
  },
};

export default nextConfig;
