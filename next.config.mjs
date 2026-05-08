/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure prompts/*.md ships with the serverless functions. Next's
  // automatic outputFileTracing follows literal readFileSync paths,
  // but we list the directory explicitly so a future refactor of
  // lib/prompts.ts (e.g. dynamic basenames) doesn't silently break
  // the production bundle.
  outputFileTracingIncludes: {
    "/api/lesson/*": ["./prompts/**/*.md"],
    "/api/lesson/**": ["./prompts/**/*.md"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
