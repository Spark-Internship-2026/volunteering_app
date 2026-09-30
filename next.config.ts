import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bundle Firebase instead of leaving it external so the alias below applies.
  transpilePackages: ["firebase", "@firebase/app", "@firebase/auth", "@firebase/firestore"],
  turbopack: {
    resolveAlias: {
      // Cloudflare Workers disallow eval (`new Function`), which the Node build of
      // Firestore (protobufjs/grpc) uses. All Firebase calls run in the browser,
      // so force the browser build for server rendering too.
      "@firebase/firestore": "./node_modules/@firebase/firestore/dist/index.esm.js",
    },
  },
};

export default nextConfig;
