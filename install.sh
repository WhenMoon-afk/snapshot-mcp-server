#!/bin/bash

# Snapshot MCP Server - Easy Install Script
set -e

echo "🚀 Installing Snapshot MCP Server..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first:"
    echo "   https://nodejs.org/"
    exit 1
fi

# Run the Node.js installer
node install.js
