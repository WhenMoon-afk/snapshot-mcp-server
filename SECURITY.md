# Security and Deployment Postures

This document describes the security model, deployment options, and data handling practices for the Snapshot MCP Server.

## Table of Contents

- [Current Security Model](#current-security-model)
- [Deployment Postures](#deployment-postures)
- [Data Storage and Privacy](#data-storage-and-privacy)
- [Risks and Limitations](#risks-and-limitations)
- [Future: OAuth 2.1 Support](#future-oauth-21-support)
- [Reporting Security Issues](#reporting-security-issues)

## Current Security Model

### Local Trusted Desktop (Default)

The Snapshot MCP Server is designed for **local, single-user desktop environments** where:

- The server runs on the user's personal machine
- Communication is via stdio (stdin/stdout) only - no network exposure
- All data is stored locally in a SQLite database
- No authentication or authorization is required
- The user has full control over their data

**Trust assumptions:**
- The user has physical access to the machine
- The operating system's user permissions model provides isolation
- Claude Desktop (or other MCP client) is a trusted application
- No multi-user or multi-tenant scenarios

**Security boundaries:**
- Operating system user permissions control file access
- No network attack surface (stdio transport only)
- No credential management or session tokens
- Standard file system backup and encryption apply

## Deployment Postures

### 1. Local Trusted Desktop (Current)

**Use case:** Individual developer using Claude Desktop on their personal computer

**Configuration:**
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

**Security characteristics:**
- ✅ No authentication required
- ✅ Data stored locally on user's machine
- ✅ No network exposure
- ✅ OS-level user permissions provide isolation
- ⚠️ No access control between users on shared machines
- ⚠️ No encryption at rest (unless OS/filesystem provides it)

**Best practices:**
- Use OS-level user accounts to isolate data
- Enable disk encryption (FileVault, BitLocker, LUKS)
- Regular backups of `~/.claude-snapshots/` directory
- Ensure only trusted applications run with your user account

### 2. MCP with OAuth 2.1 (Future Support)

**Use case:** Multi-user or cloud-hosted MCP server requiring authentication

**Configuration:** Requires MCP OAuth 2.1 specification support (targeted June 2025)

**Security characteristics:**
- ✅ OAuth 2.1 with PKCE for all clients
- ✅ Resource Indicators (RFC 8707) to prevent token misuse
- ✅ External authorization server (centralized security)
- ✅ Per-user data isolation
- ✅ Token-based access control
- ⚠️ Requires additional infrastructure (auth server, token validation)

**Architecture:**
- MCP server acts as OAuth 2.1 **resource server only**
- External authorization server issues and manages tokens
- Server validates tokens on each request
- Discovery via `/.well-known/oauth-protected-resource` metadata

**Implementation status:** Not yet implemented - design phase only

**When to use:**
- Shared hosting environments
- Multi-user organizations
- Cloud-based deployments
- Scenarios requiring audit logs and access control

**See:** [Future: OAuth 2.1 Support](#future-oauth-21-support) for details

### 3. Zero Trust Platforms (Managed Agents)

**Use case:** Enterprise environments with managed AI agents and platform-provided security

**Examples:**
- Anthropic-managed Claude Code on Web VM
- Enterprise AI agent platforms
- Containerized/sandboxed execution environments

**Security characteristics:**
- ✅ Platform provides authentication and authorization
- ✅ Sandboxed execution environment
- ✅ Network isolation and egress control
- ✅ Platform-managed secrets and credentials
- ✅ Audit logging at platform level
- ✅ Resource limits and quotas

**MCP server role:**
- Server operates within platform's security boundary
- Platform handles all auth, networking, and isolation
- Server focuses on snapshot functionality only
- No additional security mechanisms needed from server

**Configuration:** Platform-specific; typically automatic

**When to use:**
- Code-execution environments (Claude Code on Web)
- Enterprise AI platforms with centralized security
- Regulatory/compliance requirements
- Need for centralized audit and monitoring

## Data Storage and Privacy

### Database Location

**Default paths (OS-specific):**
- **macOS:** `~/.claude-snapshots/snapshots.db`
- **Windows:** `%APPDATA%/claude-snapshots/snapshots.db`
- **Linux:** `~/.local/share/claude-snapshots/snapshots.db`

**Custom path:** Set `SNAPSHOT_DB_PATH` environment variable

### Data Stored

The SQLite database contains:
- Snapshot summaries (text descriptions)
- Context data (structured or freeform text)
- Next steps (optional task descriptions)
- Timestamps (ISO 8601 format)
- Continuation prompts (pre-generated)

**What is NOT stored:**
- User credentials or tokens
- Network activity or telemetry
- Personal identifiable information (unless you include it in context)
- File contents (only references if you include them in context)

### Data Privacy

- **Local only:** No data is sent to external servers or cloud services
- **No telemetry:** The server does not collect usage statistics or analytics
- **User control:** You control what context data is saved in each snapshot
- **No encryption:** Data is stored in plaintext SQLite (rely on OS/filesystem encryption)

### Data Retention

- **Manual control:** Snapshots persist until you explicitly delete them
- **No automatic cleanup:** No built-in retention policies or automatic deletion
- **User responsibility:** Back up important snapshots yourself
- **No recovery:** Deleted snapshots cannot be recovered unless you have backups

## Risks and Limitations

### Current Limitations

⚠️ **No encryption at rest**
- Snapshot data is stored in plaintext SQLite
- Mitigation: Use OS-level disk encryption (FileVault, BitLocker, LUKS)

⚠️ **No access control between OS users**
- Any user with file system access can read the database
- Mitigation: Use OS user permissions to restrict file access

⚠️ **Durability guarantees (Phase 4: Enhanced)**
- Database uses WAL mode (journal_mode=WAL) for better concurrency (2x faster writes)
- synchronous=FULL ensures transactions are durable against OS crashes and power failures
- Trade-off: Slightly slower writes vs maximum durability
- WAL mode allows concurrent reads during writes
- Mitigation: Regular backups still recommended for hardware failures

⚠️ **No backup or recovery**
- No built-in backup, export, or cloud sync
- Database corruption or deletion means data loss
- Mitigation: Regular manual backups of database file

⚠️ **No multi-user support**
- Designed for single-user, local use only
- Concurrent access from multiple processes may cause corruption
- Mitigation: Use one MCP client at a time, or see OAuth 2.1 roadmap

⚠️ **Context data privacy**
- You control what data you include in snapshots
- Be cautious with sensitive data (API keys, passwords, PII)
- Mitigation: Avoid saving sensitive credentials in snapshot context

### Known Risks

**Database corruption:**
- Possible if system crashes during write operations
- Possible if multiple processes access database simultaneously
- Mitigation: Use one client at a time, enable WAL mode (future), backups

**Data loss:**
- Database file deletion (accidental or malicious)
- Disk failure or corruption
- No cloud sync or recovery mechanism
- Mitigation: Regular backups, disk monitoring, redundant storage

**Sensitive data exposure:**
- If you save API keys, passwords, or PII in snapshot context
- Database is unencrypted and accessible to anyone with file access
- Mitigation: Don't save credentials in snapshots, use secrets managers

**Shared machine risks:**
- Other users on the same machine can read your snapshots
- File permissions may not prevent access (especially on Windows)
- Mitigation: Use dedicated user accounts, disk encryption, private machines

## Future: OAuth 2.1 Support

### MCP OAuth 2.1 Specification (Target: June 2025)

The Model Context Protocol will support OAuth 2.1 authorization for multi-user and cloud deployments. The Snapshot MCP Server is designed to be **auth-neutral** and compatible with this specification.

### Architecture Overview

**Resource Server Pattern:**
- MCP servers act as OAuth 2.1 **resource servers**
- External authorization servers issue and manage access tokens
- Servers validate tokens but do not issue them
- Centralized security aligned with enterprise architectures

**Key Standards:**
- OAuth 2.1 with PKCE (RFC 9068) - mandatory for all clients
- Resource Indicators (RFC 8707) - specify token audience per server
- Protected Resource Metadata (RFC 9728) - server discovery and metadata
- Dynamic Client Registration (RFC 7591) - recommended for flexibility
- Authorization Server Metadata (RFC 8414) - discovery and configuration

### Implementation Plan

**Phase 1: Discovery (Not yet implemented)**
- Expose `/.well-known/oauth-protected-resource` metadata endpoint
- Include authorization server URL and required scopes
- Provide resource identifier for token audience validation

**Phase 2: Token Validation (Not yet implemented)**
- Validate JWT signature using authorization server's public keys
- Verify token audience matches server identifier
- Check token expiration and required scopes
- Return `WWW-Authenticate` header on 401 responses

**Phase 3: Backward Compatibility (Not yet implemented)**
- Configuration flag to enable/disable OAuth mode
- Local desktop mode bypasses auth (current behavior)
- Cloud mode requires valid access tokens
- Graceful degradation for unsupported clients

### Integration Points

**For server operators:**
1. Deploy external OAuth 2.1 authorization server (Auth0, Keycloak, Cognito, etc.)
2. Configure server with authorization server URL and metadata
3. Enable OAuth mode via environment variable or config file
4. Implement per-user database isolation or partitioning

**For client developers:**
1. Discover authorization server via protected resource metadata
2. Initiate OAuth 2.1 flow with PKCE
3. Request access token with resource indicator for snapshot server
4. Include access token in MCP request headers
5. Handle token refresh and expiration

### Timeline

- **Now:** Local trusted desktop mode only (no auth)
- **Phase 4 (Complete):** OAuth 2.1 integration design and positioning
- **Phase 6 (Complete):** Authorization hooks and code-execution architecture
- **Post June 2025:** Implementation after MCP spec finalization
- **Future:** Multi-user, cloud deployment, audit logging

See [docs/mcp-authorization-options.md](docs/mcp-authorization-options.md) for detailed integration guidance.

## Reporting Security Issues

If you discover a security vulnerability in the Snapshot MCP Server, please report it responsibly:

**Contact:** Open a GitHub issue at https://github.com/WhenMoon-afk/snapshot-mcp-server/issues

**Please include:**
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested mitigation (if any)

**Response timeline:**
- We will acknowledge receipt within 48 hours
- We will provide an initial assessment within 7 days
- We will work to release a fix as soon as possible

**Security updates:**
- Security fixes will be published as patch releases
- CHANGELOG.md will document security-related changes
- GitHub security advisories for critical vulnerabilities

## Additional Resources

### Documentation

- **[MCP Authorization Options](docs/mcp-authorization-options.md)** - OAuth 2.1 integration design, deployment models, and authorization hooks (Phase 6)
- **[Code-Execution Architecture](docs/architecture-mcp-code-execution.md)** - Using this MCP server in code-execution environments with generated clients (Phase 6)

### External Resources

- [MCP Specification](https://modelcontextprotocol.io/)
- [OAuth 2.1 Overview](https://oauth.net/2.1/)
- [SQLite Security](https://www.sqlite.org/security.html)
- [OWASP Security Guidelines](https://owasp.org/)

---

**Last Updated:** 2025-11-18 (Phase 6: Code-execution and authorization design)
