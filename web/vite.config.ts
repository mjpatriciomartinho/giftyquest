import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5177,
    // the API and MCP server run on 8787 locally (npm run dev:server)
    proxy: { "/api": "http://localhost:8787", "/mcp": "http://localhost:8787" },
  },
});
