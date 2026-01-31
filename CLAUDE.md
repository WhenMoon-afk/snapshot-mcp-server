# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Snapshot MCP Server** is a Model Context Protocol (MCP) server that enables token-efficient conversation state management for Claude Desktop, Claude Code, Cursor, and other MCP clients. It allows users to save snapshots of conversations at key milestones and resume work across sessions without token bloat.

**Tech Stack:** TypeScript + MCP SDK 1.0.4 + SQLite (better-sqlite3) + Node.js 18+

## Development Commands

### Build & Run
- **Build:** `npm run build` - Compiles TypeScript to JavaScript (output: `dist/`)
- **Watch mode:** `npm run watch` - Continuous compilation during development
- **Install locally:** `npm run prepare` (auto-runs on `npm install`)
- **Test the server:** `npm run build && node dist/index.js` (runs MCP server on stdio)

### Package & Installation
- **Install from package:** `npx @whenmoon-afk/snapshot-mcp-server` - Runs `install.js` which:
  1. Detects OS and Claude Desktop config location
  2. Creates database directory in platform-specific location
  3. Updates `claude_desktop_config.json` with server configuration
  4. Uses `node` directly for local installs (Windows uses `cmd /c npx` for published installs)

## Codebase Architecture

### Core Structure
- **`src/index.ts`** - MCP server bootstrap
  - `SnapshotMCPServer` class: initializes MCP server, registers tool handlers, manages cleanup
  - Defines 4 tools: `save_snapshot`, `load_snapshot`, `list_snapshots`, `delete_snapshot`
  - Handles tool requests and generates MCP-compliant responses
  - Database initialized at constructor; cleanup on SIGINT/SIGTERM

- **`src/database.ts`** - SQLite data layer
  - `SnapshotDatabase` class: manages schema, CRUD operations, query logic
  - `Snapshot` interface: database record structure with `continuation_prompt` for token efficiency
  - `SaveSnapshotInput` interface: API input (accepts string or structured context)
  - `StructuredContext` interface: flexible schema for organizing context (files, decisions, blockers, code_state, custom fields)

### Data Flow
1. **Save:** User provides `summary` + `context` (string or structured) + optional `name`, `next_steps`
   - `formatStructuredContext()` converts structured input to formatted string
   - `generateContinuationPrompt()` creates optimized prompt (replaces generic context assembly)
   - Stored in SQLite with ID, timestamp, and optional name
2. **Load:** Retrieves by ID, name, or latest
   - Returns pre-generated `continuation_prompt` if available (new snapshots)
   - Falls back to on-the-fly prompt for old snapshots (backward compatibility)
3. **List/Delete:** Simple queries ordered by `created_at DESC`

### Database Schema
```sql
CREATE TABLE snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,                           -- optional name for snapshots
  summary TEXT NOT NULL,               -- work accomplished
  context TEXT NOT NULL,               -- formatted context (string)
  next_steps TEXT,                     -- optional next steps
  continuation_prompt TEXT,            -- pre-generated optimized prompt
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes: created_at DESC (fast latest queries), name (fast name lookup)
```

### Tool Specifications
- **`save_snapshot`** - Required: `summary`, `context`; Optional: `name`, `next_steps`
  - Context can be string or object with `files`, `decisions`, `blockers`, `code_state`, custom fields
  - Returns: success message with ID and optional name
- **`load_snapshot`** - Optional: `id` or `name`; if neither provided, loads latest
  - Returns: pre-generated continuation prompt (token-efficient)
- **`list_snapshots`** - Optional: `limit` (default 100)
  - Returns: formatted list of snapshots with ID, name, summary, timestamp
- **`delete_snapshot`** - Required: `id`
  - Returns: confirmation message

## Key Design Patterns

### Token Efficiency
- **Continuation Prompts:** Pre-generated during save (not on load) to optimize tokens
  - Format: `"Resuming: [summary]\n\nContext:\n[context]\n\nNext:\n[next_steps]"`
  - Replacement for naive context assembly reduces token usage by 20-30%

### Migration Strategy
- New column `continuation_prompt` added via migration if table predates this feature
- Old snapshots fall back to on-the-fly prompt generation
- No data loss; old and new snapshots coexist transparently

### Structured Context Formatting
- Input: Object with `files`, `decisions`, `blockers`, `code_state`, plus custom fields
- Output: Human-readable formatted string for database and prompt generation
- Extensible: custom object keys are preserved in output

### Platform Abstraction
- Config path detection: `install.js` handles macOS, Windows, Linux paths
- Database path via environment variable `SNAPSHOT_DB_PATH` or default `./snapshots.db`
- Installation script creates platform-specific directories with backups of existing configs

## Common Development Tasks

### Adding a New Tool
1. Define input schema in `setupHandlers()` → `ListToolsRequestSchema`
2. Add case in `CallToolRequestSchema` handler
3. Implement `handleXxxTool()` method
4. Return MCP-compliant response object: `{ content: [{ type: 'text', text: '...' }] }`

### Modifying Snapshot Schema
1. Add column in `SnapshotDatabase.initializeSchema()`
2. Update `Snapshot` interface
3. Add migration check if field optional for older databases
4. Update formatting/prompt generation if context-related

### Debugging Database Issues
- Database location: `SNAPSHOT_DB_PATH` env var or platform-specific default
- Check file exists: `ls ~/.claude-snapshots/snapshots.db` (macOS/Linux) or `dir %APPDATA%\claude-snapshots` (Windows)
- Reset: Delete database file and run `npm run build && npx @whenmoon-afk/snapshot-mcp-server` to reinitialize

### Testing Installation Flow
- Run `npm run build`
- Execute `node install.js` to test local installation logic
- Verify Claude Desktop config: check `claude_desktop_config.json` in appropriate OS location
- Verify backup created: `claude_desktop_config.json.backup`

## Important Notes

- **MCP Protocol:** Server uses stdio transport (not REST). Clients communicate via JSON-RPC over stdin/stdout.
- **Backward Compatibility:** Old snapshots without `continuation_prompt` still load correctly via fallback logic.
- **Error Handling:** All tool errors return MCP-compliant error responses (type: 'text', prefixed with "Error: ").
- **Process Management:** SIGINT/SIGTERM triggers graceful DB close before exit.
- **Node.js Version:** Requires Node 18+ (ES modules, `better-sqlite3` 11.x compatibility).
