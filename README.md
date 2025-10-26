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

## Usage

**Save snapshot:**
```
Save a snapshot with:
- summary: "Built REST API"
- context: "Express server, MongoDB, all CRUD working"
- next_steps: "Add auth"
```

**Resume work:**
```
Load latest snapshot
```

**Named snapshots:**
```
Save snapshot named "v1-complete" with summary: "MVP deployed" and context: "..."
Load snapshot named "v1-complete"
```

**Manage:**
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

**Tools not showing?**
1. Restart Claude Desktop completely (quit and reopen)
2. Verify config file is correct
3. Ensure Node.js 18+ is installed: `node --version`

**Server issues?**
- Reinstall: `npx @whenmoon-afk/snapshot-mcp-server`
- Check client logs for errors
- Reset: delete config entry and reinstall

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
