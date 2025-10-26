# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-10-26

### Changed
- **Token Optimization** - Reduced token usage across all operations
  - Tool descriptions shortened by ~40 tokens
  - Parameter descriptions simplified
  - Response messages condensed (e.g., "Saved snapshot #5" vs verbose multi-line)
  - Continuation prompt format optimized ("Resuming:" vs "I'm resuming work on:")
  - List output more compact (one-line format)
  - Structured context headers simplified (removed markdown bold)
- **README** - Restructured for clarity and positioned as standalone + composable
  - Emphasized modular design for integration with memory systems
  - Reduced length by ~40% while maintaining all essential information

### Performance
- Additional 15-20 tokens saved per operation on top of existing 20-30% efficiency gains
- Estimated 150-200 token reduction per typical workflow session

## [1.0.0] - 2025-10-26

### Added
- **Token Efficiency** - Pre-generated continuation prompts for ~20-30% token savings
- **Structured Context** - Support for object-based context with files, decisions, blockers, code_state
- **Automatic Migration** - Database schema auto-upgrades with backward compatibility
- **Client Agnostic** - Works with Claude Desktop, Claude Code, Cursor, and any MCP client

### Features
- `save_snapshot` - Save conversation state with summary, context, and next steps
- `load_snapshot` - Resume from saved snapshot (defaults to latest)
- `list_snapshots` - View all saved snapshots
- `delete_snapshot` - Remove old snapshots

### Technical
- Database: SQLite with better-sqlite3
- MCP SDK: 1.0.4
- TypeScript implementation
- Automatic database migration system
- Pre-formatted prompts stored in database

### Installation
- Simple `npx` installation: `npx @whenmoon-afk/snapshot-mcp-server`
- Manual configuration option for advanced users
- Cross-platform support (macOS, Windows, Linux)

### Breaking Changes
None - This is the initial stable release.

---

## [Unreleased]

Nothing yet! Check back for updates.
