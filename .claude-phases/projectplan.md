# Snapshot MCP Server - Project Plan

## Architecture Overview

### MCP Server Architecture

The Snapshot MCP Server is a Model Context Protocol (MCP) server built with the TypeScript SDK (v1.0.4) that provides conversation state management capabilities.

**Core Components:**
- **Server Class:** `SnapshotMCPServer` (src/index.ts:12)
  - Built on `@modelcontextprotocol/sdk/server`
  - Uses `StdioServerTransport` for stdio communication
  - Implements request handlers for tool listing and execution

**MCP Tools (4 total):**
1. **save_snapshot** - Save current conversation state
   - Inputs: summary (required), context (required, string or structured object), name (optional), next_steps (optional)
   - Returns: Snapshot ID confirmation

2. **load_snapshot** - Resume from saved snapshot
   - Inputs: id (optional), name (optional) - defaults to latest if neither provided
   - Returns: Pre-generated continuation prompt for token efficiency

3. **list_snapshots** - View all snapshots
   - Inputs: limit (optional, default: 100)
   - Returns: Compact one-line format per snapshot

4. **delete_snapshot** - Remove snapshots
   - Inputs: id (required)
   - Returns: Deletion confirmation

**Tool Schema Design:**
- Uses JSON Schema with `oneOf` for flexible context input (string or structured object)
- Structured context supports: files[], decisions[], blockers[], code_state{}, and custom fields
- All schemas are optimized for minimal token usage (~40 tokens saved in v1.1.0)

**Error Handling:**
- Try-catch wrapper in CallToolRequestSchema handler (src/index.ts:147-178)
- Returns error messages in standard MCP text content format
- Database errors propagated from SnapshotDatabase class

### SQLite Persistence Model

**Database Class:** `SnapshotDatabase` (src/database.ts:30)

**Schema:**
```sql
CREATE TABLE snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  summary TEXT NOT NULL,
  context TEXT NOT NULL,
  next_steps TEXT,
  continuation_prompt TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_snapshots_created_at ON snapshots(created_at DESC);
CREATE INDEX idx_snapshots_name ON snapshots(name) WHERE name IS NOT NULL;
```

**Migration Strategy:**
- Automatic schema migration on initialization (src/database.ts:62-70)
- Uses PRAGMA table_info to detect missing columns
- Adds continuation_prompt column if not present (backward compatibility)
- No version tracking - simple column detection approach

**PRAGMA Configuration:**
- **Current state:** No explicit PRAGMA settings configured
- **Default SQLite behavior:**
  - journal_mode: DELETE (default)
  - synchronous: FULL (default)
- **Implications:**
  - ACID compliant and durable across power failures
  - Performance may be slower than WAL mode
  - Safe for desktop use but not optimized for high concurrency

**Database Path:**
- Configurable via `SNAPSHOT_DB_PATH` environment variable (src/index.ts:10)
- Defaults:
  - macOS: `~/.claude-snapshots/snapshots.db`
  - Windows: `%APPDATA%/claude-snapshots/snapshots.db`
  - Linux: `~/.local/share/claude-snapshots/snapshots.db`
- Directory created automatically if missing (src/database.ts:34-38)

**Key Operations:**
- saveSnapshot: Formats context, generates continuation prompt, inserts row
- getSnapshotById/getSnapshotByName/getLatestSnapshot: Direct SELECT queries
- listSnapshots: Ordered by created_at DESC with configurable limit
- deleteSnapshot: Simple DELETE with change count validation

### Installer Behavior

**Installer Script:** install.js (package.json bin entry)

**Platform Detection:**
- Auto-detects macOS, Windows, Linux via os.platform()
- Determines Claude Desktop config paths per platform
- Sets appropriate database paths

**Configuration Process:**
1. Creates database directory structure
2. Reads existing Claude Desktop config (if present)
3. Creates backup of existing config (.backup suffix)
4. Adds/updates "snapshot" MCP server entry
5. Uses direct `node` command (not npx) with absolute path to dist/index.js
6. Sets SNAPSHOT_DB_PATH environment variable in config

**Windows Specifics:**
- No longer uses `cmd /c` wrapper for local installs (only for npx usage)
- Direct node execution via absolute path

**Idempotency:**
- Safe to run multiple times
- Updates existing "snapshot" server entry if present
- Preserves other MCP servers in config

## Phase Map

### Phase 1: Baseline Analysis (Current)
**Branch:** `claude/phase-1-baseline-011qKuoQL17BXJMqBAkjryxh`
**Objectives:**
- Understand current architecture, tools, and database model
- Validate build environment (npm install, npm run build)
- Document code-execution usage patterns and auth positioning
- Establish .claude-phases documentation structure
- Create CLAUDE.md with environment and workflow guidelines

### Phase 2: SQLite Durability Analysis
**Branch:** `claude/phase-2-sqlite-durability`
**Objectives:**
- Analyze current PRAGMA settings and durability characteristics
- Evaluate WAL mode vs DELETE mode for desktop usage
- Document trade-offs: durability vs performance vs concurrency
- Recommend PRAGMA configuration for code-execution patterns
- Implement and test recommended settings

### Phase 3: Code-Execution Optimization
**Branch:** `claude/phase-3-code-exec-optimization`
**Objectives:**
- Optimize for Code Mode usage patterns (frequent saves, rapid iterations)
- Evaluate token efficiency improvements in continuation prompts
- Consider batch operations for multi-snapshot workflows
- Add telemetry/logging for performance analysis (optional)

### Phase 4: Security and Auth Positioning
**Branch:** `claude/phase-4-auth-positioning`
**Objectives:**
- Document current security model (local desktop, trusted environment)
- Design OAuth 2.1 integration points for future MCP auth
- Evaluate resource server architecture (RFC 9728, RFC 8707)
- Plan for PKCE, dynamic client registration, resource indicators
- No implementation - design and positioning only

### Phase 5: Error Handling and Resilience
**Branch:** `claude/phase-5-error-handling`
**Objectives:**
- Improve error messages and user feedback
- Add validation for edge cases (empty context, invalid IDs)
- Implement graceful degradation for database issues
- Add retry logic for transient failures (optional)

### Phase 6: Testing Infrastructure
**Branch:** `claude/phase-6-testing`
**Objectives:**
- Set up test framework (Jest, Vitest, or similar)
- Unit tests for database operations
- Integration tests for MCP tool handlers
- Mock stdio transport for testing
- CI/CD configuration (GitHub Actions)

### Phase 7: Documentation and Examples
**Branch:** `claude/phase-7-documentation`
**Objectives:**
- Expand README with advanced usage patterns
- Add code examples for structured context
- Document integration with memory/personality systems
- Create troubleshooting guide
- API reference documentation

### Phase 8: Release and Packaging
**Branch:** `claude/phase-8-release`
**Objectives:**
- Version bump and CHANGELOG updates
- npm publishing workflow validation
- Release notes and migration guide
- Community feedback incorporation

## Git and PR Workflow

### Branch Naming Convention
- Pattern: `claude/phase-{number}-{description}`
- Examples:
  - `claude/phase-1-baseline`
  - `claude/phase-2-sqlite-durability`
  - `claude/phase-4-auth-positioning`

### Development Workflow
1. **Create Branch:** From main, create dedicated phase branch in VM
2. **Develop:** Make changes, commit iteratively with clear messages
3. **Push:** Push completed branch to origin (with retry logic for network issues)
4. **PR Creation:** Human creates PR on GitHub (VM does NOT merge)
5. **Review:** Human reviews .claude-phases documentation and code changes
6. **Merge:** Human merges PR into main after approval
7. **Next Phase:** Start next phase from updated main branch

### Commit Message Guidelines
- Clear, concise descriptions of changes
- Reference phase number and objective
- Examples:
  - "Phase 1: baseline analysis and project scaffolding"
  - "Phase 2: add WAL mode configuration with durability analysis"
  - "Phase 4: document OAuth 2.1 integration design"

### VM Restrictions
- **NEVER** merge branches in the VM environment
- **NEVER** push directly to main
- **ALWAYS** push to phase-specific branches for PR review

## Code-Execution Usage Model

### Target Environment: Claude Code on Web

**Characteristics:**
- Running in Anthropic-managed VM
- Stdio transport for MCP communication
- Frequent conversation state saves during coding sessions
- Rapid iteration cycles (save → edit → save)
- Token efficiency critical for long coding sessions

**Usage Patterns:**
1. **Iterative Development:**
   - Developer works on feature
   - Saves snapshot at key milestones (tests passing, feature complete)
   - Uses structured context to track files, decisions, blockers
   - Resumes work in next session with minimal token overhead

2. **Multi-Session Projects:**
   - Named snapshots for major milestones ("v1-complete", "pre-refactor")
   - Latest snapshot for day-to-day work
   - List snapshots to review project history

3. **Context Switching:**
   - Save snapshot before switching tasks
   - Load named snapshot to resume specific work stream
   - Maintain multiple parallel work contexts

**Token Efficiency Goals:**
- Continuation prompts: 20-30% reduction vs raw context (achieved in v1.1.0)
- Additional 15-20 tokens saved per operation (achieved in v1.1.0)
- Compact list format for minimal overhead
- Pre-generated prompts stored in database (no generation cost on load)

### Performance Considerations

**Database Operations:**
- Single-user, local access (no concurrent write conflicts)
- Read-heavy during active coding (list, load operations)
- Write operations at save points (less frequent)
- Small data volume (typical: < 1000 snapshots per user)

**Optimization Opportunities:**
- WAL mode could improve read performance during writes
- synchronous=NORMAL acceptable for desktop use (corruption-safe, not durable)
- Indexing on created_at and name already implemented

## Security and Auth Posture

### Current Model: Local Trusted Desktop

**Security Characteristics:**
- Local SQLite database on user's machine
- No network exposure (stdio transport only)
- Single-user access (filesystem permissions)
- No authentication or authorization required
- Data stored in user-writable directories

**Trust Assumptions:**
- User has physical access to machine
- Claude Desktop is trusted application
- VM environment is trusted (for Claude Code on Web)
- No multi-tenant concerns

**Data Privacy:**
- All data stored locally (no cloud sync)
- User controls data location (SNAPSHOT_DB_PATH)
- Standard file backup/encryption applies
- No PII unless user includes in snapshots

### Future: Generic MCP OAuth 2.1 Compatibility

**MCP Authorization Specification (June 2025):**

**Key Requirements:**
- OAuth 2.1 with PKCE mandatory for all clients
- Resource Indicators (RFC 8707) to specify token audience
- Protected Resource Metadata (RFC 9728) for server discovery
- Dynamic Client Registration (RFC 7591) recommended
- Authorization Server Metadata (RFC 8414) for discovery

**Architecture Pattern:**
- MCP servers act as OAuth 2.1 **resource servers only**
- External, dedicated authorization servers issue tokens
- Servers validate tokens but do not issue them
- Centralized security aligned with enterprise architectures

**Implementation Phases (Future):**
1. **Discovery Phase:**
   - Server exposes /.well-known/oauth-protected-resource metadata
   - Client discovers authorization server URL
   - Client retrieves authorization server metadata

2. **Authorization Phase:**
   - Client initiates OAuth 2.1 flow with PKCE
   - Uses resource indicators to specify snapshot server as audience
   - Obtains access token from authorization server

3. **Access Phase:**
   - Client includes access token in MCP requests
   - Server validates token signature and claims
   - Server checks token audience matches server identifier

**Integration Points for Snapshot Server:**
- Add WWW-Authenticate header on 401 responses
- Implement token validation middleware
- Add authorization server configuration
- Preserve backward compatibility with local desktop mode

### Zero Trust Platform Options

**Cloud/Multi-Tenant Scenarios:**
- User authentication via OAuth 2.1 provider (Auth0, Cognito, Okta)
- Per-user database isolation or table partitioning
- Encrypted storage at rest
- Audit logging for compliance
- Network security (TLS, firewall rules)

**Hybrid Deployment:**
- Local mode: No auth (current behavior)
- Cloud mode: OAuth 2.1 with external authorization server
- Configuration flag to enable auth mode

## Open Questions and Future Considerations

1. **WAL Mode:** Should we enable WAL mode by default for better performance?
2. **Durability:** Is synchronous=NORMAL acceptable for desktop use, or require FULL?
3. **Compression:** Should we compress context/continuation_prompt for large snapshots?
4. **Retention:** Add automatic cleanup of old snapshots (configurable age/count)?
5. **Export/Import:** Add tools for snapshot backup/restore?
6. **Multi-DB:** Support multiple databases for different projects?
7. **Cloud Sync:** Optional cloud backup integration (Dropbox, iCloud, etc.)?
8. **Encryption:** Encrypt sensitive context data at rest?
9. **Search:** Add full-text search across snapshots?
10. **Tags:** Add tagging system for snapshot organization?
