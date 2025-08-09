import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Improve chunking and caching: keep vendor and app code in separate long-lived chunks
    // Use Vite defaults to avoid chunk execution order issues observed in vendor bundle
    // Reduce chunk size warnings for crisis scenarios
    chunkSizeWarningLimit: 500,
    // Enable source maps for debugging in production (HIPAA audit requirement)
    sourcemap: mode === 'production' ? 'hidden' : true,
    // Clean dist folder before build
    emptyOutDir: true,
    // Optimize for production - use terser for production, esbuild for development
    minify: mode === 'production' ? 'terser' : 'esbuild',
    // Target modern browsers for better optimization
    target: 'esnext',
    cssCodeSplit: true
  }
}));
