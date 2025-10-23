#!/bin/bash
# Snapshot MCP Server - Web Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/WhenMoon-afk/snapshot-mcp-server/main/install-web.sh | bash

set -e

echo "🚀 Snapshot MCP Server - Web Installer"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed."
    echo ""
    echo "Please install Node.js first:"
    echo "  • macOS: brew install node"
    echo "  • Windows: Download from https://nodejs.org/"
    echo "  • Linux: sudo apt install nodejs npm (or equivalent)"
    echo ""
    exit 1
fi

echo "✓ Node.js found: $(node --version)"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js with npm included."
    exit 1
fi

echo "✓ npm found: $(npm --version)"
echo ""

# Use npx to install
echo "📦 Running installer via npx..."
echo ""

npx @whenmoon-afk/snapshot-mcp-server
