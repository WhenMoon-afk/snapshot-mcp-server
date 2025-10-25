# Release Instructions - v1.0.0

## You're ready to release! Follow these steps:

### Step 1: Push the version tag

```bash
cd /home/user/snapshot-mcp-server
git tag v1.0.0 -m "v1.0.0 - Initial release"
git push origin v1.0.0
```

This will trigger GitHub Actions to automatically build:
- ✅ Windows .exe
- ✅ macOS executables (Intel + Apple Silicon)
- ✅ Linux executable

### Step 2: Create GitHub Release

Go to: https://github.com/WhenMoon-afk/snapshot-mcp-server/releases/new

Fill in:
- **Tag:** v1.0.0
- **Title:** v1.0.0 - Snapshot MCP Server
- **Description:**

```markdown
# Snapshot MCP Server v1.0.0

Save and resume Claude conversations with perfect context preservation.

## 🚀 Quick Install

### Option 1: Download Executable (Zero Dependencies!)
- **Windows:** Download snapshot-mcp-installer-windows.exe below
- **macOS Intel:** Download snapshot-mcp-installer-macos-x64 below
- **macOS Apple Silicon:** Download snapshot-mcp-installer-macos-arm64 below
- **Linux:** Download snapshot-mcp-installer-linux below

Just download, run, restart Claude Desktop - done!

### Option 2: One Command (Requires Node.js)
```bash
npx @whenmoon-afk/snapshot-mcp-server
```

## ✨ Features

- **4 Tools:** save_snapshot, load_snapshot, list_snapshots, delete_snapshot
- **Smart Defaults:** Loading defaults to latest snapshot
- **Named Snapshots:** Save milestones with custom names
- **Persistent:** SQLite database, nothing gets lost
- **Safe:** Automatic config backup, preserves existing MCP servers
- **Fast:** Indexed queries for quick retrieval

## 📖 Documentation

See [README](https://github.com/WhenMoon-afk/snapshot-mcp-server#readme) for full usage instructions.

## 🎉 What's New

Initial release with:
- Complete MCP server implementation
- Automated installers for all platforms
- Standalone executables (no Node.js required!)
- Comprehensive error handling
- Full test coverage

---

**Note:** Executables are automatically built by GitHub Actions and will be attached to this release shortly after publishing.
```

- Click **"Publish release"**

### Step 3: Wait for GitHub Actions

Go to: https://github.com/WhenMoon-afk/snapshot-mcp-server/actions

Wait for the build workflow to complete (~5-10 minutes). It will automatically attach the executables to your release.

### Step 4: Publish to npm

```bash
# Login to npm (if not already logged in)
npm login

# Publish the package
npm publish --access public
```

You'll be prompted for your npm credentials if needed.

### Step 5: Verify Everything Works

1. **Check GitHub Release:**
   - Go to: https://github.com/WhenMoon-afk/snapshot-mcp-server/releases/latest
   - Verify all 4 executables are attached

2. **Test npx installation:**
   ```bash
   npx @whenmoon-afk/snapshot-mcp-server
   ```

3. **Test downloading an executable:**
   - Download the .exe (Windows) or appropriate executable
   - Run it to verify it works

## Troubleshooting

**If GitHub Actions fails:**
- Check the Actions tab for error details
- The workflow builds on Windows, macOS, and Linux runners
- Common issues: dependency installation, pkg bundling

**If npm publish fails:**
- Make sure you're logged in: `npm whoami`
- Verify package name is available: `npm view @whenmoon-afk/snapshot-mcp-server`
- Check if you have permissions for the @whenmoon-afk scope

**If executables don't work:**
- They're built for Node.js 18
- Windows: .exe should work on Windows 10+
- macOS: May need to allow in System Preferences → Security
- Linux: May need to `chmod +x` the file

## What Users Will See

After you complete these steps:

1. **Download Links Work:**
   - https://github.com/WhenMoon-afk/snapshot-mcp-server/releases/latest/download/snapshot-mcp-installer-windows.exe
   - https://github.com/WhenMoon-afk/snapshot-mcp-server/releases/latest/download/snapshot-mcp-installer-macos-x64
   - https://github.com/WhenMoon-afk/snapshot-mcp-server/releases/latest/download/snapshot-mcp-installer-macos-arm64
   - https://github.com/WhenMoon-afk/snapshot-mcp-server/releases/latest/download/snapshot-mcp-installer-linux

2. **npx Command Works:**
   ```bash
   npx @whenmoon-afk/snapshot-mcp-server
   ```

3. **Users Can Install With:**
   - Zero dependencies (download .exe)
   - One command (npx)
   - Download script (platform-specific)

## You're Done! 🎉

After completing these steps, users can install your MCP server in seconds!
