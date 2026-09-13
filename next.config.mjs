/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  reactStrictMode: true,
  // The Strands SDK pulls in optional Node-only deps (AWS SDK, etc.) that we
  // never touch with the mock model. Keep them external so bundling stays lean.
  serverExternalPackages: ["@strands-agents/sdk"],
};

export default nextConfig;
