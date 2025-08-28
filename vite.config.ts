import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import compression from 'vite-plugin-compression';

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
      // Enhanced CSP for dev while retaining core restrictions for HMR
      // Note: Allows ws/http for Vite HMR; production CSP is stricter via hosting config
      'Content-Security-Policy': "default-src 'self'; connect-src * 'self' http: https: ws: wss:; img-src 'self' data: blob: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; media-src 'self' data: blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
    }
  },
  plugins: [
    react(),
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
    // CRITICAL FIX: Disable CSS code splitting to ensure CSS is always loaded
    // This prevents the blank screen issue in TestFlight
    cssCodeSplit: false,
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
        // Manual chunking for optimal performance - split large dependencies
        manualChunks: (id) => {
          // Split node_modules by size and usage patterns
          if (id.includes('node_modules')) {
            // Isolate the massive chart library (481KB -> separate chunk)
            if (id.includes('recharts')) {
              return 'charts';
            }
            // Isolate framer-motion (large animation library)
            if (id.includes('framer-motion')) {
              return 'animations';
            }
            // React core - keep together
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react';
            }
            // Radix UI components - split into smaller chunks
            if (id.includes('@radix-ui')) {
              if (id.includes('dialog') || id.includes('popover') || id.includes('dropdown')) {
                return 'radix-overlays';
              }
              return 'radix-ui';
            }
            // Supabase and data libs
            if (id.includes('@supabase') || id.includes('@tanstack/react-query')) {
              return 'data';
            }
            // Date libraries
            if (id.includes('date-fns')) {
              return 'date-utils';
            }
            // Other vendor code
            return 'vendor';
          }
          
          // Split app code by feature
          if (id.includes('src/pages/')) {
            if (id.includes('Crisis') || id.includes('crisis')) {
              return 'crisis';
            }
            if (id.includes('Provider') || id.includes('provider')) {
              return 'provider';
            }
            if (id.includes('Admin') || id.includes('admin')) {
              return 'admin';
            }
            if (id.includes('Analytics') || id.includes('Chart') || id.includes('Progress')) {
              return 'analytics';
            }
          }
          
          // Components with charts/animations - defer loading
          if (id.includes('components/') && (
            id.includes('Chart') || 
            id.includes('Analytics') || 
            id.includes('Progress') ||
            id.includes('Visualization')
          )) {
            return 'analytics-components';
          }
        },
        // Optimize chunk names for caching and loading priority
        chunkFileNames: (chunkInfo) => {
          // Priority chunks load first
          if (chunkInfo.name === 'crisis') {
            return 'crisis-[hash].js';
          }
          // Defer heavy chunks to end
          if (chunkInfo.name === 'charts' || chunkInfo.name === 'animations') {
            return 'heavy/[name]-[hash].js';
          }
          return '[name]-[hash].js';
        },
        // Minimize duplicate code across chunks
        entryFileNames: 'entry-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      },
      // External dependencies to exclude from bundle
      external: [
        // Keep these external if they're loaded via CDN
      ]
    }
  }
}));
