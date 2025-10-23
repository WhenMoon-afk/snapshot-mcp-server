# Snapshot MCP Server

A Model Context Protocol (MCP) server for managing conversation snapshots. Save your conversation state, resume later with full context - the simplest way to maintain continuity across Claude sessions.

## Features

- **Save snapshots** - Capture conversation state with summary, context, and next steps
- **Load snapshots** - Resume from any saved point with well-formatted prompts
- **List snapshots** - Browse all saved snapshots with metadata
- **Delete snapshots** - Clean up old or unwanted snapshots
- **Persistent storage** - SQLite database ensures snapshots survive restarts
- **Token efficient** - Optimized for minimal token usage

## Installation

```bash
npm install
npm run build
```

## Configuration

Add to your Claude Desktop config file:

**MacOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

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

If `SNAPSHOT_DB_PATH` is not set, the database will be created at `./snapshots.db` relative to the server's working directory.

## Tools

### save_snapshot

Save the current conversation state as a snapshot.

**Parameters:**
- `summary` (required, string): Brief summary of what was accomplished
- `context` (required, string): Full context - code state, decisions, blockers
- `name` (optional, string): Name for easy retrieval
- `next_steps` (optional, string): What to do when resuming

**Example:**
```
Please save a snapshot with:
- summary: "Implemented user authentication with JWT"
- context: "Added login/signup endpoints, JWT middleware, password hashing with bcrypt. Database schema includes users table. All tests passing."
- name: "auth-complete"
- next_steps: "Add password reset functionality and email verification"
```

### load_snapshot

Load a saved snapshot. Defaults to latest if no ID or name provided.

**Parameters:**
- `id` (optional, number): Snapshot ID to load
- `name` (optional, string): Snapshot name to load

**Examples:**
```
Load latest snapshot
```

```
Load snapshot with id 5
```

```
Load snapshot named "auth-complete"
```

**Returns:** Formatted prompt with:
- Snapshot metadata (ID, name, created date)
- Summary of what was accomplished
- Full context to restore state
- Next steps (if provided)

### list_snapshots

List all saved snapshots with metadata.

**Parameters:**
- `limit` (optional, number): Maximum snapshots to return (default: 100)

**Example:**
```
List all snapshots
```

```
List the last 10 snapshots
```

**Returns:** List of snapshots with ID, name, creation date, and summary.

### delete_snapshot

Delete a snapshot by ID.

**Parameters:**
- `id` (required, number): Snapshot ID to delete

**Example:**
```
Delete snapshot 3
```

## Usage Examples

### Basic Workflow

**End of session - save your work:**
```
Please save a snapshot:
- summary: "Built REST API for blog posts"
- context: "Created Express server with CRUD endpoints for posts. Using MongoDB with Mongoose schemas. Implemented validation and error handling. Server running on port 3000."
- next_steps: "Add authentication and authorization for post creation"
```

**Next session - resume instantly:**
```
Load latest snapshot
```

Claude will receive a formatted prompt with all your context, allowing seamless continuation.

### Named Snapshots

Save important milestones with names:
```
Save snapshot:
- summary: "MVP complete and deployed"
- context: "Full app deployed to Heroku. All core features working. Database migrations applied. CI/CD pipeline configured."
- name: "mvp-v1"
- next_steps: "Start working on user feedback from beta testers"
```

Later, jump back to this exact point:
```
Load snapshot named "mvp-v1"
```

### Managing Snapshots

Browse your saved work:
```
List all snapshots
```

Clean up old snapshots:
```
Delete snapshot 7
```

## Database Schema

```sql
CREATE TABLE snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  summary TEXT NOT NULL,
  context TEXT NOT NULL,
  next_steps TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_snapshots_created_at ON snapshots(created_at DESC);
CREATE INDEX idx_snapshots_name ON snapshots(name) WHERE name IS NOT NULL;
```

## Database Location

The database file location is determined by:
1. `SNAPSHOT_DB_PATH` environment variable (if set in config)
2. `./snapshots.db` (default fallback)

The database and any required parent directories will be created automatically on first run.

## Troubleshooting

### Server won't start

**Check Node.js version:**
```bash
node --version  # Should be 18.x or higher
```

**Verify build:**
```bash
cd /path/to/snapshot-mcp-server
npm run build
```

**Check permissions:**
Ensure the database path is writable:
```bash
touch /path/to/snapshots.db  # Should succeed
```

### Database errors

**Reset database (WARNING: deletes all snapshots):**
```bash
rm /path/to/snapshots.db
```

The database will be recreated on next server start.

**Check database integrity:**
```bash
sqlite3 /path/to/snapshots.db "PRAGMA integrity_check;"
```

### Claude Desktop not seeing tools

1. **Restart Claude Desktop** after config changes
2. **Check config syntax** - use a JSON validator
3. **Verify absolute paths** - relative paths may not work
4. **Check server logs** - look in Claude Desktop console

### Common config mistakes

**Wrong (relative path):**
```json
"args": ["./dist/index.js"]
```

**Right (absolute path):**
```json
"args": ["/Users/you/projects/snapshot-mcp-server/dist/index.js"]
```

**Wrong (missing node command):**
```json
"command": "dist/index.js"
```

**Right (node command specified):**
```json
"command": "node"
```

## Development

**Watch mode for development:**
```bash
npm run watch
```

**Manual testing:**
```bash
# Build
npm run build

# Test database operations
node -e "
import('./dist/database.js').then(({ SnapshotDatabase }) => {
  const db = new SnapshotDatabase('./test.db');
  const snapshot = db.saveSnapshot({
    summary: 'Test',
    context: 'Testing the database'
  });
  console.log('Saved:', snapshot);
  console.log('Latest:', db.getLatestSnapshot());
  db.close();
});
"
```

## Architecture

**Database Layer (`src/database.ts`):**
- SQLite with better-sqlite3
- Type-safe interfaces
- Indexed queries for performance
- Automatic schema initialization

**MCP Server (`src/index.ts`):**
- Standard MCP protocol implementation
- Four tool handlers
- Error handling and validation
- Graceful shutdown

## Why Snapshot MCP?

**The problem:** Long Claude conversations lose context across sessions. Copy-pasting summaries is tedious and error-prone.

**The solution:** One command to save state, one command to restore. No manual context management, no lost progress.

**Design philosophy:**
- **Simplicity:** Core CRUD operations, no over-engineering
- **Token efficiency:** Concise prompts that restore full context
- **User experience:** Defaults to latest snapshot for instant resumption
- **Extensibility:** Clean foundation for future enhancements

## Future Enhancements

Potential additions (not yet implemented):
- Export/import snapshots as JSON
- Full-text search across snapshots
- Snapshot chains (link related snapshots)
- Automatic snapshot suggestions
- Diff between snapshots
- Snapshot tags and categories

## License

MIT License - see LICENSE file for details

## Contributing

Issues and pull requests welcome at: https://github.com/WhenMoon-afk/snapshot-mcp-server

## Author

WhenMoon-afk
