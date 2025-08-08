import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';

export default [
  {
    ignores: [
      "dist/**/*",
      "node_modules/**/*",
      "coverage/**/*",
      "build/**/*",
      "*.config.js",
      "scripts/**/*",
      "public/**/*",
      "serenity-crisis-mcp/**/*",
      "android/**/*",
      "ios/**/*",
      "playwright-report/**/*",
      ".claude-flow/**/*",
      ".roo/**/*",
      "memory/**/*"
    ],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        caches: 'readonly',
        URL: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        Headers: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        FormData: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        crypto: 'readonly',
        performance: 'readonly',
        Notification: 'readonly',
        confirm: 'readonly',
        Router: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        URLSearchParams: 'readonly',
        
        // Node globals
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        
        // Deno globals (for Supabase Edge Functions)
        Deno: 'readonly',
        
        // TypeScript/Node types
        NodeJS: 'readonly',
        React: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      'react-hooks': reactHooksPlugin,
      'react-refresh': reactRefreshPlugin,
    },
    rules: {
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      
      // React Hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      
      // React Refresh rules
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      
      // General rules
      'no-console': 'off', // Allow console in development
      'no-debugger': 'warn', // Warn instead of error for development
      'no-unused-vars': 'off', // Use TypeScript version instead
      'no-undef': 'error',
      'no-duplicate-imports': 'error',
      'prefer-const': 'warn', // Warn instead of error
      'no-var': 'error',
    },
  },
];
