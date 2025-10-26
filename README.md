# Snapshot MCP Server

A Model Context Protocol (MCP) server for saving and resuming Claude conversations with perfect context. Never lose your place again.

## What is this?

When you hit conversation limits or need to switch contexts, this MCP server lets you:
- **Save** your current conversation state with one command
- **Resume** exactly where you left off in a new conversation
- **Save tokens** with pre-formatted continuation prompts (~20-30% reduction)
- **Organize** multiple conversation snapshots with names

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

### Save Your Work

At the end of a conversation:

```
Save a snapshot with:
- summary: "Built REST API for blog posts"
- context: "Express server, MongoDB, all CRUD endpoints working"
- next_steps: "Add authentication"
```

### Resume Instantly

In your next conversation:

```
Load latest snapshot
```

Claude gets all your context back with a pre-formatted, token-efficient prompt.

### Named Snapshots

Save important milestones:

```
Save snapshot named "v1-complete" with summary: "MVP deployed" and context: "App on Heroku, all features working"
```

Resume later:

```
Load snapshot named "v1-complete"
```

### Manage Snapshots

```
List all snapshots
```

```
Delete snapshot 5
```

## Features

### Token Efficiency

- **Pre-generated continuation prompts** - Stored once, reused forever
- **~20-30% token reduction** when resuming conversations
- No reformatting overhead - prompts ready to use

### Structured Context (Optional)

Use simple strings OR structured data:

```
Save snapshot with:
- summary: "Completed auth system"
- context: {
    files: ["src/auth/jwt.ts", "src/auth/middleware.ts"],
    decisions: ["Using JWT with 24h expiration", "bcrypt with 10 rounds"],
    blockers: ["Need email verification"],
    code_state: { tests_passing: true, coverage: "95%" }
  }
- next_steps: "Implement email verification"
```

### Client Agnostic

Works with any MCP-compatible client:
- ✅ Claude Desktop
- ✅ Claude Code (VS Code extension)
- ✅ Cursor IDE
- ✅ Any other MCP client

## Available Tools

The server provides 4 tools to Claude:

- **`save_snapshot`** - Save current conversation state
- **`load_snapshot`** - Resume from a saved snapshot (defaults to latest)
- **list_snapshots** - View all saved snapshots
- **`delete_snapshot`** - Remove old snapshots

## Database

Snapshots are stored locally in SQLite:

- **macOS:** `~/.claude-snapshots/snapshots.db`
- **Windows:** `%APPDATA%/claude-snapshots/snapshots.db`
- **Linux:** `~/.local/share/claude-snapshots/snapshots.db`

Your data never leaves your machine.

## Example Workflow

**Friday evening:**
```
I need to stop for today. Save a snapshot:
- summary: "Implemented JWT auth"
- context: "Login/signup endpoints working, JWT middleware done, bcrypt for passwords, tests passing"
- next_steps: "Add password reset and email verification"
```

**Monday morning:**
```
Load latest snapshot
```

Claude responds with your full context and you pick up exactly where you left off.

## Troubleshooting

### Not seeing the tools?

1. **Restart Claude Desktop completely** (quit and reopen, not just close window)
2. Check config file is correct
3. Make sure you have Node.js installed: `node --version` (need 18+)

### Server won't start?

1. Check Node.js version: `node --version` (need 18+)
2. Try reinstalling: `npx @whenmoon-afk/snapshot-mcp-server`
3. Check Claude Desktop logs for errors

### Reset everything?

Delete your config entry and run the installer again - it's safe to run multiple times.

## Development

Want to contribute or run from source?

```bash
git clone https://github.com/WhenMoon-afk/snapshot-mcp-server.git
cd snapshot-mcp-server
npm install
npm run build
```

Then configure Claude Desktop to use your local copy:

```json
{
  "mcpServers": {
    "snapshot": {
      "command": "node",
      "args": ["/absolute/path/to/snapshot-mcp-server/dist/index.js"],
      "env": {
        "SNAPSHOT_DB_PATH": "/path/to/snapshots.db"
      }
    }
  }
}
```

## Technical Details

**Stack:**
- Database: SQLite with better-sqlite3
- Protocol: MCP SDK 1.0.4
- Language: TypeScript
- Node.js: 18+

**Database schema:**
```sql
CREATE TABLE snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  summary TEXT NOT NULL,
  context TEXT NOT NULL,
  next_steps TEXT,
  continuation_prompt TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## License

MIT

## Contributing

Issues and PRs welcome! See [CHANGELOG.md](CHANGELOG.md) for version history.

---

**Save once. Resume anywhere. Never lose context again.**
