import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    headers: {
      // Security headers to satisfy HIPAA-related checks during local E2E/dev
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      // Relaxed CSP for dev while retaining core restrictions
      // Note: Allows ws/http for Vite HMR; tighten in production via hosting config
      'Content-Security-Policy': "default-src 'self'; connect-src * 'self' http: https: ws: wss:; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'"
    }
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
