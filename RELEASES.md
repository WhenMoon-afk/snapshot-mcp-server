# Building and Publishing Releases

This document explains how to create new releases with standalone executables.

## Automatic Builds (Recommended)

Standalone executables are built automatically via GitHub Actions when you create a new release:

### Creating a Release

1. **Update version in package.json**
   ```bash
   npm version patch  # or minor, or major
   ```

2. **Push the version tag**
   ```bash
   git push --follow-tags
   ```

3. **Create GitHub Release**
   - Go to: https://github.com/WhenMoon-afk/snapshot-mcp-server/releases/new
   - Select the tag you just pushed
   - Add release notes
   - Click "Publish release"

4. **GitHub Actions will automatically:**
   - Build Windows .exe
   - Build macOS executables (Intel + Apple Silicon)
   - Build Linux executable
   - Attach them to the release

5. **Users can then download from:**
   - `https://github.com/WhenMoon-afk/snapshot-mcp-server/releases/latest/download/snapshot-mcp-installer-windows.exe`
   - `https://github.com/WhenMoon-afk/snapshot-mcp-server/releases/latest/download/snapshot-mcp-installer-macos-x64`
   - `https://github.com/WhenMoon-afk/snapshot-mcp-server/releases/latest/download/snapshot-mcp-installer-macos-arm64`
   - `https://github.com/WhenMoon-afk/snapshot-mcp-server/releases/latest/download/snapshot-mcp-installer-linux`

## Manual Builds (If Needed)

If you need to build executables locally:

### Prerequisites

```bash
npm install
```

### Build Commands

**Windows executable:**
```bash
npm run package:win
```
Output: `releases/snapshot-mcp-installer-windows.exe`

**macOS executables:**
```bash
npm run package:mac
```
Output:
- `releases/snapshot-mcp-installer-macos-x64`
- `releases/snapshot-mcp-installer-macos-arm64`

**Linux executable:**
```bash
npm run package:linux
```
Output: `releases/snapshot-mcp-installer-linux`

**All platforms:**
```bash
npm run package:all
```

### Testing Executables

**Windows:**
```batch
releases\snapshot-mcp-installer-windows.exe
```

**macOS/Linux:**
```bash
chmod +x releases/snapshot-mcp-installer-macos-*
./releases/snapshot-mcp-installer-macos-x64

chmod +x releases/snapshot-mcp-installer-linux
./releases/snapshot-mcp-installer-linux
```

## Publishing to npm

For users who prefer `npx`:

```bash
npm login
npm publish --access public
```

## What Gets Built

The standalone executables:
- ✅ Bundle Node.js runtime inside
- ✅ Include all dependencies (including native modules)
- ✅ Work without any Node.js installation
- ✅ Are compressed with GZip for smaller size
- ✅ Run the automated installer when executed

## Executable Sizes

Approximate sizes:
- Windows .exe: ~40-50 MB
- macOS executables: ~40-50 MB each
- Linux executable: ~40-50 MB

These are compressed and contain a full Node.js runtime plus all dependencies.

## Troubleshooting Builds

### "pkg: command not found"

Make sure devDependencies are installed:
```bash
npm install
```

### Build fails with native module errors

The executables are best built on their target platform:
- Windows .exe: Build on Windows
- macOS executables: Build on macOS
- Linux executable: Build on Linux

Or let GitHub Actions handle it (recommended).

### Executables are too large

They include Node.js runtime and all dependencies. This is expected for standalone executables. The benefit is zero dependencies for end users.

## Release Checklist

- [ ] Update version in package.json
- [ ] Update CHANGELOG (if you have one)
- [ ] Commit changes
- [ ] Create and push tag: `git push --follow-tags`
- [ ] Create GitHub release (triggers builds)
- [ ] Wait for GitHub Actions to complete
- [ ] Verify downloads work
- [ ] Publish to npm: `npm publish --access public`
- [ ] Test installations on different platforms
- [ ] Update README if needed
