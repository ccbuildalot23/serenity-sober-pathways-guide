#!/bin/bash

echo "🔧 Starting Vercel build script..."

# Remove existing node_modules and package-lock
echo "📦 Cleaning up old dependencies..."
rm -rf node_modules package-lock.json

# Install critical build dependencies explicitly
echo "📦 Installing build dependencies explicitly..."
npm install --save-dev vite@5.4.11 @vitejs/plugin-react-swc@4.0.1 tailwindcss@3.4.17 postcss@8.5.6 autoprefixer@10.4.24 --legacy-peer-deps

# Install production dependencies
echo "📦 Installing production dependencies..."
npm install react@19.0.0 react-dom@19.0.0 react-router-dom@7.1.1 @supabase/supabase-js@2.49.2 --legacy-peer-deps

# Install remaining dependencies
echo "📦 Installing remaining dependencies..."
npm install --legacy-peer-deps

# Run the build
echo "🚀 Building with Vite..."
npx vite build

echo "✅ Build complete!"