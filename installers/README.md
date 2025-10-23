# Platform-Specific Installers

Download and run the installer for your platform:

## 🍎 macOS

**Download:** [install-macos.command](install-macos.command)

**To install:**
1. Download the file
2. Double-click `install-macos.command`
3. If it says "unidentified developer", right-click → Open
4. Follow the prompts
5. Restart Claude Desktop

## 🪟 Windows

**Download:** [install-windows.bat](install-windows.bat)

**To install:**
1. Download the file
2. Double-click `install-windows.bat`
3. If Windows SmartScreen appears, click "More info" → "Run anyway"
4. Follow the prompts
5. Restart Claude Desktop

## 🐧 Linux

**Download:** [install-linux.sh](install-linux.sh)

**To install:**
1. Download the file
2. Open terminal in the download folder
3. Run: `bash install-linux.sh`
4. Follow the prompts
5. Restart Claude Desktop

## What These Installers Do

All installers:
- ✅ Check if Node.js is installed
- ✅ Guide you to install Node.js if needed
- ✅ Run the automatic installer via npx
- ✅ Configure Claude Desktop automatically
- ✅ Show clear next steps

## Requirements

- **Node.js 18+** (installers will check and guide you)
- **Claude Desktop** (the MCP server works with Desktop and Code)

## Alternative: One-Line Install

If you prefer terminal/command line:

```bash
# macOS/Linux
npx @whenmoon-afk/snapshot-mcp-server

# Or with curl
curl -fsSL https://raw.githubusercontent.com/WhenMoon-afk/snapshot-mcp-server/main/install-web.sh | bash
```

```batch
# Windows PowerShell
npx @whenmoon-afk/snapshot-mcp-server
```

## Troubleshooting

**"Command not found" or "node is not recognized"**
- Install Node.js from https://nodejs.org/
- Restart your terminal/command prompt
- Try again

**"Permission denied" (macOS/Linux)**
```bash
chmod +x install-*.sh
chmod +x install-*.command
```

**Windows SmartScreen warning**
- Click "More info"
- Click "Run anyway"
- This is normal for scripts downloaded from the internet

## After Installation

1. **Restart Claude Desktop completely** (quit and reopen)
2. **Test it:**
   ```
   Save a snapshot with:
   - summary: "Testing the snapshot server"
   - context: "Just installed, checking if it works"
   ```
3. **Verify:**
   ```
   List all snapshots
   ```

You should see your snapshot listed!
