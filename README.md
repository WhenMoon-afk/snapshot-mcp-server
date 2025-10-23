# Snapshot MCP Server

Save and resume Claude conversations with perfect context preservation. One command to save, one command to resume.

## Quick Start

### One-Command Install

```bash
git clone https://github.com/WhenMoon-afk/snapshot-mcp-server.git
cd snapshot-mcp-server
npm run install-mcp
```

That's it! The installer will:
- Install dependencies and build the project
- Auto-detect your Claude config location
- Update your config automatically
- Set up the database in a sensible location

**Then just restart Claude Desktop and you're ready!**

### Alternative Install (if you prefer manual)

<details>
<summary>Click to expand manual installation</summary>

```bash
git clone https://github.com/WhenMoon-afk/snapshot-mcp-server.git
cd snapshot-mcp-server
npm install
npm run build
```

Then add to your Claude config (see below for location):

```json
{
  "mcpServers": {
    "snapshot": {
      "command": "node",
      "args": ["/path/to/snapshot-mcp-server/dist/index.js"],
      "env": {
        "SNAPSHOT_DB_PATH": "/path/to/snapshots.db"
      }
    }
  }
}
```

**Config locations:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

</details>

## Compatibility

- ✅ **Claude Desktop** - Full support
- ✅ **Claude Code (VS Code)** - Full support
- ❌ **Claude.ai (web)** - Not supported (MCP requires local server)

## Usage

### Save Your Work

At the end of any conversation:

```
Save a snapshot with:
- summary: "Built REST API for blog posts"
- context: "Created Express server, MongoDB setup, all CRUD endpoints working"
- next_steps: "Add authentication and rate limiting"
```

### Resume Instantly

Next conversation:

```
Load latest snapshot
```

Claude gets all your context back instantly!

### Named Snapshots

Save important milestones:

```
Save snapshot named "v1-complete" with summary: "MVP deployed" and context: "App live on Heroku, all features working"
```

Later:

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

## What You Get

**4 Simple Tools:**
- `save_snapshot` - Save current state
- `load_snapshot` - Resume from any save point
- `list_snapshots` - See all your snapshots
- `delete_snapshot` - Clean up old ones

**Smart Defaults:**
- Loading without ID or name gives you the latest
- Database location auto-configured per OS
- Timestamps on everything
- Fast indexed queries

## Why This Exists

Long Claude conversations lose context across sessions. Copying and pasting summaries is tedious and error-prone. This fixes that:

- **Save:** One command captures everything
- **Resume:** One command restores full context
- **Simple:** No complicated memory systems, just snapshots
- **Reliable:** SQLite ensures nothing gets lost

## Examples

**End of session:**
```
I need to stop for today. Save a snapshot:
- summary: "Implemented user auth with JWT tokens"
- context: "Login/signup endpoints done, JWT middleware working, bcrypt for passwords, users table created. All tests passing."
- next_steps: "Add password reset and email verification"
```

**Tomorrow:**
```
Load latest snapshot
```

Claude responds with formatted prompt containing all your context. You pick up exactly where you left off.

## Troubleshooting

### Server won't start?

1. **Check Node.js version:** `node --version` (need 18+)
2. **Rebuild:** `npm run build`
3. **Check config:** Make sure JSON is valid
4. **Restart Claude:** Fully quit and reopen

### Not seeing the tools?

1. Restart Claude Desktop completely
2. Check the config file was updated correctly
3. Verify paths are absolute (not relative)

### Reset everything?

```bash
cd snapshot-mcp-server
rm -rf node_modules dist
npm install
npm run install-mcp
```

## Development

**Watch mode:**
```bash
npm run watch
```

**Manual testing:**
```bash
npm run build
node -e "
import('./dist/database.js').then(({ SnapshotDatabase }) => {
  const db = new SnapshotDatabase('./test.db');
  console.log('Saved:', db.saveSnapshot({
    summary: 'Test',
    context: 'Testing'
  }));
  console.log('Latest:', db.getLatestSnapshot());
  db.close();
});
"
```

## Technical Details

<details>
<summary>For the curious</summary>

- **Database:** SQLite with better-sqlite3
- **Protocol:** MCP SDK 1.0.4
- **Language:** TypeScript
- **Storage:** Indexed queries for performance
- **Config:** Auto-detection for macOS/Windows/Linux

**Database schema:**
```sql
CREATE TABLE snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  summary TEXT NOT NULL,
  context TEXT NOT NULL,
  next_steps TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Default database locations:**
- macOS: `~/.claude-snapshots/snapshots.db`
- Windows: `%APPDATA%/claude-snapshots/snapshots.db`
- Linux: `~/.local/share/claude-snapshots/snapshots.db`

</details>

## Contributing

Issues and PRs welcome! https://github.com/WhenMoon-afk/snapshot-mcp-server

## License

MIT - See LICENSE file

---

**Made with ❤️ to make Claude conversations continuous**
