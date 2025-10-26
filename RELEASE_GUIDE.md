# Release Guide for v1.0.0

This guide walks you through publishing v1.0.0 to both GitHub Releases and npm.

## Prerequisites

### 1. npm Account Setup

You mentioned you've signed up for npm. Now you need to:

1. **Verify your email** on npm (check your inbox)
2. **Login to npm locally:**
   ```bash
   npm login
   ```
   Enter your credentials when prompted

3. **Create an npm access token** (for GitHub Actions):
   - Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Click "Generate New Token"
   - Choose "Automation" type
   - Copy the token (starts with `npm_...`)

4. **Add token to GitHub:**
   - Go to https://github.com/WhenMoon-afk/snapshot-mcp-server/settings/secrets/actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Paste your npm token
   - Click "Add secret"

### 2. Verify Package Configuration

Your package.json is already configured correctly:
- ✅ Name: `@whenmoon-afk/snapshot-mcp-server`
- ✅ Version: `1.0.0`
- ✅ Scoped package (starts with @)
- ✅ Files to publish specified
- ✅ Repository links set

## Release Process

### Step 1: Push Latest Changes

```bash
# Make sure all changes are committed and pushed
git status
git push origin main
```

### Step 2: Create a Git Tag

```bash
# Create and push version tag
git tag v1.0.0
git push origin v1.0.0
```

### Step 3: Create GitHub Release

1. Go to: https://github.com/WhenMoon-afk/snapshot-mcp-server/releases/new

2. Select tag: `v1.0.0`

3. Release title: `v1.0.0 - Token Efficiency & Structured Context`

4. Release notes (copy this):
   ```markdown
   ## 🚀 v1.0.0 - Token Efficiency & Structured Context

   Major release with token optimization and enhanced features!

   ### ✨ New Features

   **Token Efficiency (~20-30% savings)**
   - Pre-generated continuation prompts stored in database
   - Load snapshots with zero reformatting overhead
   - Optimized prompt format for resuming work

   **Structured Context Input**
   - New object-based context format alongside string format
   - Support for: files, decisions, blockers, code_state
   - Auto-formats to readable markdown
   - Custom fields supported

   ### 🔧 Improvements

   - Database migration system for seamless upgrades
   - Fixed npx installation path resolution
   - Backward compatible with all existing snapshots
   - Improved error handling

   ### 📦 Installation

   **Zero-dependency executables:**
   - 🪟 [Windows](https://github.com/WhenMoon-afk/snapshot-mcp-server/releases/latest/download/snapshot-mcp-installer-windows.exe)
   - 🍎 [macOS Intel](https://github.com/WhenMoon-afk/snapshot-mcp-server/releases/latest/download/snapshot-mcp-installer-macos-x64)
   - 🍎 [macOS Apple Silicon](https://github.com/WhenMoon-afk/snapshot-mcp-server/releases/latest/download/snapshot-mcp-installer-macos-arm64)
   - 🐧 [Linux](https://github.com/WhenMoon-afk/snapshot-mcp-server/releases/latest/download/snapshot-mcp-installer-linux)

   **Or use npx:**
   ```bash
   npx @whenmoon-afk/snapshot-mcp-server
   ```

   ### 📚 Documentation

   See [README.md](https://github.com/WhenMoon-afk/snapshot-mcp-server#readme) for full documentation.

   ### 🙏 Acknowledgments

   Built with Claude Code for seamless conversation continuity.
   ```

5. Click "Publish release"

### Step 4: Wait for Automation

GitHub Actions will automatically:
- ✅ Build Windows, macOS, and Linux executables (~5-10 minutes)
- ✅ Attach them to the release
- ✅ Publish package to npm

Monitor progress at: https://github.com/WhenMoon-afk/snapshot-mcp-server/actions

### Step 5: Verify Release

**Check GitHub Release:**
- Executables attached: https://github.com/WhenMoon-afk/snapshot-mcp-server/releases/tag/v1.0.0

**Check npm:**
- Package page: https://www.npmjs.com/package/@whenmoon-afk/snapshot-mcp-server
- Try installing: `npx @whenmoon-afk/snapshot-mcp-server`

**Test downloads:**
```bash
# Test the executables work
curl -L -O https://github.com/WhenMoon-afk/snapshot-mcp-server/releases/latest/download/snapshot-mcp-installer-windows.exe
```

## Manual npm Publish (If Automation Fails)

If the GitHub Action fails, you can publish manually:

```bash
# Make sure you're logged in
npm whoami

# Publish
npm publish --access public
```

## Troubleshooting

### "You must verify your email to publish packages"
- Check your email and click the verification link from npm
- Try publishing again

### "You do not have permission to publish"
- Make sure you own the `@whenmoon-afk` scope on npm
- Or change the package name in package.json to something you own

### "npm ERR! 402 Payment Required"
- Scoped packages (`@username/package`) require a paid plan UNLESS published with `--access public`
- Our workflow uses `--access public` flag

### GitHub Actions failing
- Check secrets are set correctly
- Review action logs: https://github.com/WhenMoon-afk/snapshot-mcp-server/actions
- Make sure NPM_TOKEN is valid

## Post-Release Tasks

- [ ] Test installation on Windows, macOS, Linux
- [ ] Update README if needed
- [ ] Share release on social media / Discord / forums
- [ ] Monitor issues for any problems
- [ ] Start planning v1.1.0 features!

## Quick Reference

**GitHub Release URL:**
https://github.com/WhenMoon-afk/snapshot-mcp-server/releases

**npm Package URL:**
https://www.npmjs.com/package/@whenmoon-afk/snapshot-mcp-server

**Actions Dashboard:**
https://github.com/WhenMoon-afk/snapshot-mcp-server/actions

---

🎉 **Ready to release? Follow the steps above!**
