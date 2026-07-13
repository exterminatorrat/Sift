import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://siftallergy.app",
  output: "static",
  trailingSlash: "never",
  build: {
    format: "directory"
  },
  vite: {
    build: {
      cssMinify: "lightningcss"
    }
  }
});
