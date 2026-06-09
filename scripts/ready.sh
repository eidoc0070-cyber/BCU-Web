#!/bin/bash

# BCU Rust Web - Full Build & Deploy Preparation Script
# This script ensures that Rust WASM, Web Assets, and Tests are all synchronized.

set -e # Exit immediately if a command exits with a non-zero status.

echo "🚀 Starting Full Build Pipeline..."

# 1. Build Rust WASM Engine
echo "🦀 Building Rust WASM Engine..."
bun run build:wasm

# 2. Run Rust Tests
echo "🧪 Running Rust Unit Tests..."
cargo test --workspace

# 3. Build Web Frontend (Vite)
echo "🌐 Building Web Frontend..."
bun x vite build

# 4. Run Frontend Tests
echo "🧪 Running Frontend Tests..."
bun test

# 5. Type Check
echo "🔍 Running Type Check..."
bun x tsc --noEmit

echo ""
echo "✅ All checks passed! You are ready to deploy."
echo "💡 To push changes to GitHub, run:"
echo "   git add . && git commit -m 'your message' && git push"
