#!/bin/bash

echo "🔧 Starting Vercel build script..."

# Remove existing node_modules and package-lock
echo "📦 Cleaning up old dependencies..."
rm -rf node_modules package-lock.json

# Install all dependencies fresh
echo "📦 Installing dependencies with npm install..."
npm install --legacy-peer-deps

# Check if vite is installed
if ! command -v npx vite &> /dev/null; then
    echo "⚠️ Vite not found, installing explicitly..."
    npm install vite@5.4.11 --save-dev --legacy-peer-deps
fi

# Run the build
echo "🚀 Building with Vite..."
npx vite build

echo "✅ Build complete!"