#!/bin/bash
# Snapshot MCP Server - macOS Installer
# Double-click this file to install

# Make terminal stay open
trap 'read -p "Press enter to close..."' EXIT

# Clear screen if terminal is available
[ -t 0 ] && clear 2>/dev/null || true
echo "╔════════════════════════════════════════════╗"
echo "║   Snapshot MCP Server - macOS Installer   ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed."
    echo ""
    echo "Please install Node.js first:"
    echo "  Option 1 (Recommended): brew install node"
    echo "  Option 2: Download from https://nodejs.org/"
    echo ""
    echo "After installing Node.js, run this installer again."
    exit 1
fi

echo "✓ Node.js found: $(node --version)"
echo "✓ npm found: $(npm --version)"
echo ""

# Run the installer
echo "🚀 Installing Snapshot MCP Server..."
echo ""

npx @whenmoon-afk/snapshot-mcp-server

echo ""
echo "═══════════════════════════════════════════"
echo ""
echo "✅ Installation complete!"
echo ""
echo "📝 Next step:"
echo "   • Restart Claude Desktop (completely quit and reopen)"
echo ""
echo "Then you can use:"
echo "   • Save a snapshot with: summary: ..., context: ..."
echo "   • Load latest snapshot"
echo "   • List all snapshots"
echo ""
