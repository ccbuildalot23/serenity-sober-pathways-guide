import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import compression from 'vite-plugin-compression';
import circularDependency from 'vite-plugin-circular-dependency';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/',
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  server: {
    host: "::",
    port: 8080,
    headers: {
      // Security headers to satisfy HIPAA-related checks during local E2E/dev
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      // Enhanced CSP for dev while retaining core restrictions for HMR
      // Note: Allows ws/http for Vite HMR; production CSP is stricter via hosting config
      'Content-Security-Policy': "default-src 'self'; connect-src * 'self' http: https: ws: wss:; img-src 'self' data: blob: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; media-src 'self' data: blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
    }
  },
  plugins: [
    react(),
    // Detect circular dependencies
    circularDependency({
      exclude: /node_modules/,
      failOnError: false,
      allowAsyncCycles: false,
      outputFilePath: './circular-deps.txt'
    }),
    mode === 'development' && componentTagger(),
    // Enable gzip and brotli compression for all assets
    mode === 'production' && compression({
      algorithm: 'gzip',
      threshold: 1024, // Only compress files larger than 1KB
      deleteOriginFile: false
    }),
    mode === 'production' && compression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
      deleteOriginFile: false
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "react": path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
      "react/jsx-runtime": path.resolve(__dirname, "./node_modules/react/jsx-runtime"),
      "react/jsx-dev-runtime": path.resolve(__dirname, "./node_modules/react/jsx-dev-runtime")
    },
    dedupe: ['react', 'react-dom', '@radix-ui/react-primitive', '@radix-ui/react-compose-refs']
  },
  build: {
    // Improve chunking and caching: keep vendor and app code in separate long-lived chunks
    // Use Vite defaults to avoid chunk execution order issues observed in vendor bundle
    // Reduce chunk size warnings for crisis scenarios
    chunkSizeWarningLimit: 200,
    // Enable source maps for debugging in production (HIPAA audit requirement)
    sourcemap: mode === 'production' ? 'hidden' : true,
    // Clean dist folder before build
    emptyOutDir: true,
    // Optimize for production - use terser for production, esbuild for development
    minify: mode === 'production' ? 'terser' : 'esbuild',
    // Target modern browsers for better optimization
    target: 'esnext',
    // Enable CSS code splitting for performance
    cssCodeSplit: true,
    // Enable tree shaking
    treeshake: mode === 'production',
    // Terser options for aggressive optimization
    terserOptions: mode === 'production' ? {
      compress: {
        drop_console: false, // Keep console for debugging TestFlight
        drop_debugger: true,
        pure_funcs: [], // Keep all console methods for now
        unused: true
      },
      mangle: {
        safari10: true
      }
    } : undefined,
    rollupOptions: {
      output: {
        // Simplified chunking strategy to avoid circular dependencies
        manualChunks: (id) => {
          // Aggressive chunking for <1s load time
          if (id.includes('node_modules')) {
            // Split React ecosystem
            if (id.includes('react-dom')) return 'react-dom';
            if (id.includes('react-router')) return 'react-router';
            if (id.includes('react')) return 'react';
            
            // Split UI libraries
            if (id.includes('@radix-ui')) return 'radix-ui';
            if (id.includes('lucide-react')) return 'icons';
            
            // Split data libraries
            if (id.includes('@supabase')) return 'supabase';
            if (id.includes('@tanstack')) return 'tanstack';
            
            // Split large libraries
            if (id.includes('recharts')) return 'charts';
            if (id.includes('framer-motion')) return 'animations';
            
            // Everything else in vendor
            return 'vendor';
          }
        },
        // Use default chunk naming for consistency
        chunkFileNames: '[name]-[hash].js',
        entryFileNames: '[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      },
      // External dependencies to exclude from bundle
      external: [
        // Keep these external if they're loaded via CDN
      ]
    }
  }
}));
