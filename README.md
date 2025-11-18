# Snapshot MCP Server

A Model Context Protocol (MCP) server for saving and resuming Claude conversations with token-efficient context preservation.

## What is this?

A modular snapshot tool that works standalone or integrates with larger memory systems. Save conversation state, resume work across sessions, and organize multiple snapshots with minimal token overhead.

**Key features:**
- Token-efficient continuation prompts (~20-30% reduction vs raw context)
- Structured or simple context input
- Works with Claude Desktop, Claude Code, Cursor, any MCP client
- Designed for composability with memory/personality systems

## Installation

### Quick Start (Recommended)

**Step 1:** Run the installer:
```bash
npx @whenmoon-afk/snapshot-mcp-server
```

**Step 2:** Restart Claude Desktop (quit and reopen completely)

That's it! The installer automatically configures your Claude Desktop.

### Manual Setup

If you prefer to configure manually, add to your Claude Desktop config file:

**Config File Location:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**Configuration:**

<details>
<summary><strong>macOS/Linux</strong></summary>

```json
{
  "mcpServers": {
    "snapshot": {
      "command": "npx",
      "args": ["-y", "@whenmoon-afk/snapshot-mcp-server"]
    }
  }
}
```
</details>

<details>
<summary><strong>Windows</strong></summary>

```json
{
  "mcpServers": {
    "snapshot": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@whenmoon-afk/snapshot-mcp-server"]
    }
  }
}
```

**Note:** Windows requires the `cmd /c` wrapper to execute npx properly.
</details>

Then restart Claude Desktop.

## MCP Client Examples

### Claude Desktop

The recommended setup uses `npx` for automatic updates:

```json
{
  "mcpServers": {
    "snapshot": {
      "command": "npx",
      "args": ["-y", "@whenmoon-afk/snapshot-mcp-server"]
    }
  }
}
```

**Windows:** Use `cmd /c` wrapper:
```json
{
  "mcpServers": {
    "snapshot": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@whenmoon-afk/snapshot-mcp-server"]
    }
  }
}
```

### Claude Code on Web / Code Execution

For code-execution environments (Claude Code on Web, automated scripts), the MCP server runs automatically via the MCP host. Snapshots work seamlessly during coding sessions:

**Conceptual usage:**
```javascript
// During a coding session, Claude can:
// 1. Save snapshots at milestones
await mcp.callTool('save_snapshot', {
  summary: 'Implemented user auth',
  context: { files: ['src/auth.ts'], tests_passing: true },
  next_steps: 'Add password reset'
});

// 2. Resume work in next session
await mcp.callTool('load_snapshot', {}); // Loads latest
```

The MCP host handles configuration and transport automatically.

### Generic MCP Host

For custom MCP clients or host applications:

```json
{
  "mcpServers": {
    "snapshot": {
      "command": "node",
      "args": ["/path/to/snapshot-mcp-server/dist/index.js"],
      "env": {
        "SNAPSHOT_DB_PATH": "/path/to/custom/snapshots.db"
      }
    }
  }
}
```

**Environment variables:**
- `SNAPSHOT_DB_PATH`: Custom database location (optional)

**Transport:** stdio (stdin/stdout communication)

## Quick Start Workflow

Once installed, try these commands in Claude:

**1. Save your first snapshot:**
```
Save a snapshot with:
- summary: "Built REST API"
- context: "Express server, MongoDB, all CRUD working"
- next_steps: "Add auth"
```

**2. Resume from latest snapshot:**
```
Load latest snapshot
```

**3. List all snapshots:**
```
List all snapshots
```

That's it! Claude will preserve your conversation context across sessions.

## Usage Examples

**Named snapshots for milestones:**
```
Save snapshot named "v1-complete" with summary: "MVP deployed" and context: "..."
Load snapshot named "v1-complete"
```

**Manage snapshots:**
```
List all snapshots
Delete snapshot 5
```

## Features

- **Token-efficient prompts** - Pre-generated, optimized continuation prompts
- **Flexible context** - Simple strings or structured objects
- **Named snapshots** - Save milestones for easy retrieval
- **Cross-client** - Works with Claude Desktop, Claude Code, Cursor, etc.
- **Composable** - Integrates with memory/personality systems
- **Local storage** - Your data stays on your machine (SQLite)

**Structured context example:**
```
context: {
  files: ["src/auth.ts"],
  decisions: ["JWT with 24h expiration"],
  blockers: ["Need email verification"],
  code_state: { tests_passing: true }
}
```

## Tools

- `save_snapshot` - Save conversation state
- `load_snapshot` - Resume from snapshot (latest, by ID, or by name)
- `list_snapshots` - View all snapshots
- `delete_snapshot` - Remove snapshots

## Example Workflow

**End of day:**
```
Save a snapshot:
- summary: "Implemented JWT auth"
- context: "Login/signup working, JWT middleware done, tests passing"
- next_steps: "Add password reset"
```

**Next session:**
```
Load latest snapshot
```

Claude resumes with full context.

## Troubleshooting

### Tools not appearing in Claude Desktop

1. **Restart completely:** Quit Claude Desktop entirely and reopen (don't just close window)
2. **Verify config file location:**
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`
3. **Check Node.js version:** Run `node --version` (must be 18+)
4. **Verify config syntax:** Ensure JSON is valid (no trailing commas, proper quotes)

### Server errors or crashes

- **Reinstall:** Run `npx @whenmoon-afk/snapshot-mcp-server` again
- **Check logs:** Look for errors in Claude Desktop developer console
- **Database permissions:** Ensure write access to database directory
- **Reset config:** Delete the `snapshot` entry from config and reinstall

### Database issues

**Database location not found:**
- Check `SNAPSHOT_DB_PATH` environment variable in config
- Verify directory exists and has write permissions
- Default paths:
  - macOS: `~/.claude-snapshots/`
  - Windows: `%APPDATA%/claude-snapshots/`
  - Linux: `~/.local/share/claude-snapshots/`

**Corrupted database:**
- Backup: `cp ~/.claude-snapshots/snapshots.db ~/snapshots-backup.db`
- Delete: `rm ~/.claude-snapshots/snapshots.db`
- Reinstall: Server will create fresh database on next run

### Node version mismatch

If you see errors about unsupported Node.js features:
1. Check version: `node --version`
2. Upgrade if needed: Visit https://nodejs.org/
3. Required: Node.js 18 or higher

## FAQ

**Q: Do I need to authenticate or set up an account?**
A: No. The server runs locally on your machine with no authentication required. Your data stays on your computer.

**Q: Where is my data stored?**
A: Snapshots are stored in a local SQLite database. See "Database location" in Technical Details section. You can customize the location with the `SNAPSHOT_DB_PATH` environment variable.

**Q: Can I use this with Claude Code on Web?**
A: Yes! The MCP host in code-execution environments handles configuration automatically. Just use snapshot commands normally during coding sessions.

**Q: Is my data sent to the cloud?**
A: No. All snapshot data is stored locally on your machine. There is no cloud sync or external data transmission.

**Q: What happens if I lose my database file?**
A: Your snapshots will be lost. Consider backing up `~/.claude-snapshots/` periodically if you have important snapshots.

**Q: Can I use this with multiple projects?**
A: Yes. You can either use named snapshots to organize by project, or configure multiple MCP server entries with different `SNAPSHOT_DB_PATH` values for separate databases per project.

**Q: How do I backup or export snapshots?**
A: Copy the database file: `cp ~/.claude-snapshots/snapshots.db ~/backup-location/`. You can also use SQLite tools to export data: `sqlite3 ~/.claude-snapshots/snapshots.db .dump > snapshots.sql`

**Q: What about security and authentication for shared/cloud deployments?**
A: See [SECURITY.md](SECURITY.md) for deployment postures including OAuth 2.1 support for multi-user environments.

## Technical Details

**Stack:** SQLite + TypeScript + MCP SDK 1.0.4 (Node.js 18+)

**Database location:**
- macOS: `~/.claude-snapshots/snapshots.db`
- Windows: `%APPDATA%/claude-snapshots/snapshots.db`
- Linux: `~/.local/share/claude-snapshots/snapshots.db`

**Development:**
```bash
git clone https://github.com/WhenMoon-afk/snapshot-mcp-server.git
cd snapshot-mcp-server
npm install
npm run build
```

## License

MIT

## Contributing

Issues and PRs welcome! See [CHANGELOG.md](CHANGELOG.md) for version history.

---

**Modular conversation state for AI assistants.**
