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
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimize bundle splitting for crisis scenarios
    rollupOptions: {
      output: {
        manualChunks: {
          // Critical crisis features - loaded first
          'crisis-core': [
            './src/pages/CrisisHelp.tsx',
            './src/components/CrisisFloatingButton.tsx'
          ],
          // Authentication - needed early
          'auth-core': [
            './src/pages/Login.tsx',
            './src/pages/Auth.tsx',
            './src/contexts/AuthContext.tsx'
          ],
          // Patient core features - high priority
          'patient-core': [
            './src/pages/PatientDashboard.tsx',
            './src/pages/CheckIn.tsx',
            './src/components/DashboardRouter.tsx'
          ],
          // Recovery tools - medium priority  
          'recovery-tools': [
            './src/pages/PeerSupport.tsx',
            './src/pages/Motivation.tsx',
            './src/pages/RecoveryPlanning.tsx',
            './src/pages/Calendar.tsx',
            './src/pages/Progress.tsx'
          ],
          // Provider features - low priority for patients
          'provider-tools': [
            './src/pages/ProviderDashboard.tsx',
            './src/pages/SupportDashboard.tsx',
            './src/pages/ClinicalProtocols.tsx',
            './src/pages/RegulatoryCompliance.tsx'
          ],
          // Admin - lowest priority
          'admin-tools': [
            './src/pages/Analytics.tsx',
            './src/pages/SecurityAudit.tsx'
          ],
          // Vendor libraries
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': ['@radix-ui/react-slot', '@radix-ui/react-toast', '@radix-ui/react-dialog'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-utils': ['clsx', 'tailwind-merge', 'date-fns']
        }
      }
    },
    // Reduce chunk size warnings for crisis scenarios
    chunkSizeWarningLimit: 500,
    // Enable source maps for debugging in production (HIPAA audit requirement)
    sourcemap: mode === 'production' ? 'hidden' : true,
    // Clean dist folder before build
    emptyOutDir: true,
    // Optimize for production
    minify: mode === 'production' ? 'terser' : false,
    // Target modern browsers for better optimization
    target: 'esnext'
  }
}));
