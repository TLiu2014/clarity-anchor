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
  // standalone output so the agent routes can load them at runtime. The MCP
  // dependency closure (which Strands imports eagerly but the tracer can't follow
  // through the externalized package) is injected post-build by
  // deploy/copy-mcp-deps.mjs.
  outputFileTracingIncludes: {
    "/api/agent": [
      "./node_modules/@strands-agents/**/*",
      "./node_modules/@aws-sdk/**/*",
      "./node_modules/@smithy/**/*",
    ],
  },
};

export default nextConfig;
