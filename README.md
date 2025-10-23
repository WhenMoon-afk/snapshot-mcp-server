# Snapshot MCP Server

Save and resume Claude conversations with perfect context. Never lose your place again.

## One-Command Install

```bash
npx @whenmoon-afk/snapshot-mcp-server
```

That's it! Then restart Claude Desktop and you're ready.

<details>
<summary>Alternative: curl one-liner (if you prefer)</summary>

```bash
curl -fsSL https://raw.githubusercontent.com/WhenMoon-afk/snapshot-mcp-server/main/install-web.sh | bash
```

</details>

### What the installer does

- ✅ Installs all dependencies automatically
- ✅ Auto-detects your OS and Claude config location
- ✅ Preserves all your existing MCP servers
- ✅ Creates automatic backup of your config
- ✅ Shows you exactly what it's doing
- ✅ Sets up database in the right place

**Safe & Transparent:**
- Shows existing MCP servers before any changes
- Displays exactly what will be added
- Creates `config.json.backup` before modifying anything
- Lists all servers after installation

## Usage

### Save Your Work

End of any conversation:

```
Save a snapshot with:
- summary: "Built REST API for blog posts"
- context: "Express server, MongoDB, all CRUD endpoints working"
- next_steps: "Add authentication"
```

### Resume Instantly

Next conversation:

```
Load latest snapshot
```

That's it! Claude gets all your context back.

### Named Snapshots

Save milestones:

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

## Compatibility

- ✅ **Claude Desktop** - Full support
- ✅ **Claude Code (VS Code)** - Full support
- ❌ **Claude.ai (web)** - Not supported (MCP is local-only)

## Why This Exists

**Problem:** Long Claude conversations lose context across sessions. Copy-pasting is tedious.

**Solution:** One command saves everything. One command restores it.

- **Simple:** Just snapshots, nothing complicated
- **Fast:** One command to save, one to resume
- **Reliable:** SQLite database, nothing gets lost
- **Smart:** Loads latest by default

## What You Get

**4 Tools:**
- `save_snapshot` - Save current state
- `load_snapshot` - Resume (defaults to latest)
- `list_snapshots` - See all snapshots
- `delete_snapshot` - Clean up old ones

## Example Session

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

## Manual Install (Developers)

<details>
<summary>Click to expand</summary>

If you want to clone and develop:

```bash
git clone https://github.com/WhenMoon-afk/snapshot-mcp-server.git
cd snapshot-mcp-server
npm install
npm run build
```

Then manually add to Claude config:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**Linux:** `~/.config/Claude/claude_desktop_config.json`

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

</details>

## Troubleshooting

### Not seeing the tools?

1. **Restart Claude Desktop completely** (quit and reopen, not just close window)
2. Check config file was updated correctly
3. Make sure Node.js is installed: `node --version`

### Server won't start?

1. **Check Node.js version:** `node --version` (need 18+)
2. **Reinstall:** `npx @whenmoon-afk/snapshot-mcp-server`
3. Check Claude Desktop logs for errors

### Reset everything?

```bash
npx @whenmoon-afk/snapshot-mcp-server
```

The installer is idempotent - safe to run multiple times.

## Technical Details

<details>
<summary>For the curious</summary>

**Stack:**
- Database: SQLite with better-sqlite3
- Protocol: MCP SDK 1.0.4
- Language: TypeScript
- Installation: Zero-config via npx

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

**Development:**
```bash
npm run watch    # Watch mode
npm run build    # Build TypeScript
```

</details>

## Publishing to npm (Maintainers)

<details>
<summary>How to publish updates</summary>

```bash
# Update version in package.json
npm version patch  # or minor, or major

# Build
npm run build

# Publish
npm publish --access public

# Push tags
git push --tags
```

</details>

## Contributing

Issues and PRs welcome!

**Repository:** https://github.com/WhenMoon-afk/snapshot-mcp-server

## License

MIT

---

**Save once. Resume anywhere. Never lose context again.**
