import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Prisma's Rust-free client (engineType="client") reads files from its generated
  // folder at runtime via fs (query_compiler_bg.wasm, plus schema.prisma to resolve
  // its own directory), which the file tracer can't see. Ship the whole generated
  // client with every server function.
  outputFileTracingIncludes: {
    "/**": ["./node_modules/.prisma/client/*"],
  },
};

export default nextConfig;
