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
    react({
      // Enable fast refresh in development
      fastRefresh: mode === 'development'
    }),
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
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Manual chunking for optimal performance
        manualChunks: {
          // Critical crisis components - highest priority, separate chunk
          'crisis-core': [
            'src/pages/CrisisHelp.tsx',
            'src/pages/CrisisSupport.tsx',
            'src/components/crisis/EnhancedCrisisSystem.tsx',
            'src/services/unifiedCrisisService.ts',
            'src/hooks/useCrisisSystem.ts',
            'src/hooks/useCrisisManagement.ts'
          ],
          // React and core dependencies
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // UI library components
          'ui-vendor': [
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-toast',
            '@radix-ui/react-tabs',
            '@radix-ui/react-select',
            '@radix-ui/react-popover'
          ],
          // Data and state management
          'data-vendor': [
            '@tanstack/react-query',
            '@supabase/supabase-js',
            '@supabase/realtime-js',
            'zustand'
          ],
          // Charts and visualization
          'chart-vendor': ['recharts', 'framer-motion'],
          // Date utilities (consolidate to avoid duplication)
          'date-vendor': ['date-fns', 'date-fns-tz'],
          // Core patient features
          'patient-core': [
            'src/pages/PatientDashboard.tsx',
            'src/pages/CheckIn.tsx',
            'src/components/DailyCheckIn.tsx',
            'src/services/checkinSubmissionService.ts'
          ],
          // Provider features
          'provider-core': [
            'src/pages/ProviderDashboard.tsx',
            'src/pages/provider/ProviderPatients.tsx',
            'src/services/providerDashboardService.ts'
          ],
          // Supporter features
          'supporter-core': [
            'src/pages/SupportDashboard.tsx',
            'src/pages/SupporterDashboard.tsx'
          ],
          // Administrative and compliance features
          'admin-features': [
            'src/pages/AdminDashboard.tsx',
            'src/pages/HIPAASecurityDashboard.tsx',
            'src/pages/SecurityAudit.tsx',
            'src/services/EnhancedSecurityAuditService.ts'
          ]
        },
        // Optimize chunk names for caching
        chunkFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'crisis-core') {
            return 'crisis-[hash].js'; // Priority loading
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
