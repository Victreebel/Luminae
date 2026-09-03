import { defineConfig } from "vite";

export default defineConfig({
  server: { port: Number(process.env.PORT ?? 4176) },
  preview: { port: Number(process.env.PORT ?? 4176) },
});
