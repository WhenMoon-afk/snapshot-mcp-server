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

### Added (Phase 5: CI and Schema Stability)
- **CI/CD Infrastructure** - GitHub Actions workflow for automated testing
  - Multi-version Node.js testing (18.x, 20.x, 22.x)
  - Automated build validation on push and pull requests
  - Fast feedback loop (~4 second test suite)
  - Runs on main and all claude/** branches
- **Schema Stability Tests** - 7 new tests ensuring MCP tool schemas remain stable
  - Tool count and name validation
  - Deep equality checks on all 4 tool input schemas
  - Error response format validation
  - Breaking change detection for code-exec API generation
- **Phase 5 Documentation**
  - Comprehensive CI configuration documentation
  - Schema stability benefits for code-exec clients
  - Build and npx validation results

### Technical (Phase 5)
- CI workflow: `.github/workflows/ci.yml` with fail-fast disabled
- Schema tests added to `src/index.test.ts` (7 tests)
- Build validated on Node 18+, 20+, 22+
- npx entry point (`install.js`) validated cross-platform
- Zero security vulnerabilities confirmed

### Testing (Phase 5)
- Database tests: 26/26 passing ✅
- Schema stability tests: 7/7 passing ✅
- Total tests: 57 (51 passing, 6 known failures from Phase 4)
- Test execution time: ~4 seconds

### Changed (Phase 4: Security and Durability)
- **SQLite Durability** - Explicit PRAGMA configuration for maximum durability
  - `PRAGMA journal_mode=WAL` - Write-Ahead Logging for better concurrency
  - `PRAGMA synchronous=FULL` - Maximum durability against power failures
  - Transactions now durable across OS crashes and power failures
- **Error Handling** - Structured error infrastructure with error codes
  - ErrorCode enum: validation_error, not_found, database_error, unknown_tool, internal_error
  - MCPError class with proper stack traces
  - Future OAuth 2.1 integration points documented
- **Security Documentation** - Updated SECURITY.md with durability guarantees

### Changed (Phase 3: Documentation and UX)
- **README.md** - Comprehensive restructuring and expansion
  - MCP client configuration examples (Desktop, Code-Exec, Generic)
  - Enhanced troubleshooting section with specific solutions
  - FAQ section (8 common questions)
  - Quick start workflow (3-step guide)
- **SECURITY.md** - Created comprehensive security documentation
  - 3 deployment postures (Local Trusted, OAuth 2.1, Zero Trust)
  - Data storage and privacy details
  - Future OAuth 2.1 roadmap

### Changed (Phase 2: Testing Infrastructure)
- **Test Framework** - Vitest 4.0.10 with TypeScript integration
  - 47 tests (database + MCP tool + code-exec workflows)
  - Test execution time: ~4 seconds
  - Zero-configuration TypeScript support
  - Isolated test databases (no production interference)
