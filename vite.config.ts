import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    allowedHosts: ['transitionary-carla-sheerly.ngrok-free.dev'],
  },
  build: {
    // Avertissement si un chunk dépasse 500kb
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Sépare les vendors pour un meilleur cache navigateur
        manualChunks: {
          react: ['react', 'react-dom'],
          router: ['react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          pdf: ['jspdf', 'html2canvas'],
        },
      },
    },
  },
});
