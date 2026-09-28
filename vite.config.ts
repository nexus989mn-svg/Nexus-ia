import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  base: "/auri-ia/",
  nitro: {
    preset: "vercel",
  },
  tanstackStart: {
    server: {
      entry: "server",
    },
  },
});
