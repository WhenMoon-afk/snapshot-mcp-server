# Phase 6: Open Issues and Design Considerations

**Date:** 2025-11-18
**Phase:** 6 (Code-Execution and MCP Authorization Integration Design)
**Branch:** `claude/phase-6-code-exec-auth-011qhgyd68FWF2krc5vNsgZb`

## Design-Only vs Implemented

### Implemented in Phase 6

✅ **Authorization Hook Interfaces**
- `AuthorizationPolicy` interface
- `NoAuthPolicy` (default, always authorizes)
- `DummyAuthPolicy` (for testing)
- Integration into `SnapshotMCPServer`

✅ **Documentation**
- Code-execution architecture patterns
- OAuth 2.1 integration options
- Deployment models
- Scope design

✅ **Tests**
- 13 authorization tests
- Policy behavior verification
- Backward compatibility validation

### Design-Only (Not Yet Implemented)

❌ **OAuthPolicy Class**
- JWT signature validation
- Token expiration checks
- Audience verification
- Scope enforcement
- **Reason:** Waiting for MCP OAuth 2.1 spec finalization (June 2025+)

❌ **Protected Resource Metadata Endpoint**
- `/.well-known/oauth-protected-resource`
- Authorization server URL discovery
- **Reason:** No HTTP transport in current MCP SDK (stdio only)

❌ **Per-User Database Isolation**
- User-specific database paths
- Database partitioning
- **Reason:** Not needed for local desktop mode, deferred to multi-user deployment

❌ **OAuth Configuration**
- Environment variables for auth server URL
- JWKS endpoint configuration
- Resource identifier configuration
- **Reason:** No OAuth implementation yet

## Open Questions

### 1. MCP SDK Authorization Header Support

**Question:** How will MCP SDK pass authorization headers to tool handlers?

**Current state:**
- MCP SDK (v1.0.4) uses stdio transport
- No standardized header passing mechanism
- Code uses `(request as any).headers` placeholder

**Options:**
1. Wait for MCP spec to define authorization header format
2. Use custom request metadata field
3. Extend MCP protocol with auth-specific fields

**Impact:** Medium - Affects OAuth implementation timeline

**Decision needed:** After MCP OAuth 2.1 spec release (June 2025+)

### 2. Per-User Database Strategy

**Question:** How should per-user database isolation work in multi-user deployments?

**Options:**
1. **Separate DB files per user:**
   - Path: `~/.claude-snapshots/users/{userId}/snapshots.db`
   - Pros: Complete isolation, easy backup
   - Cons: More files to manage

2. **Single DB with user_id column:**
   - Schema: `ALTER TABLE snapshots ADD COLUMN user_id TEXT`
   - Pros: Easier management, single backup
   - Cons: Shared WAL file, requires row-level filtering

3. **SQLite attached databases:**
   - Main DB + attached user DBs
   - Pros: Flexibility, per-user backups
   - Cons: Complexity, attach/detach overhead

**Impact:** High - Affects multi-user deployment architecture

**Decision needed:** When implementing multi-user support (post-Phase 6)

**Current approach:** Local desktop mode (single user, single DB)

### 3. Token Caching and Performance

**Question:** Should validated tokens be cached to reduce validation overhead?

**Considerations:**
- JWT validation involves signature verification (CPU-intensive)
- Tokens may have 5-15 minute lifetimes
- Caching could reduce per-request latency

**Options:**
1. **No caching:**
   - Validate every request
   - Pros: Always current, simple
   - Cons: Higher latency

2. **In-memory cache with TTL:**
   - Cache validated tokens for 1-2 minutes
   - Pros: Reduced latency, still secure
   - Cons: Memory usage, stale token risk

3. **LRU cache with max size:**
   - Cache recent tokens, evict old ones
   - Pros: Bounded memory
   - Cons: More complex

**Impact:** Low-Medium - Performance optimization

**Decision needed:** When implementing OAuthPolicy (post-Phase 6)

### 4. Scope Granularity

**Question:** Are current scopes sufficient, or should we add more granular permissions?

**Current scopes:**
- `snapshot:read` - Load and list snapshots
- `snapshot:write` - Save snapshots
- `snapshot:delete` - Delete snapshots

**Potential additional scopes:**
- `snapshot:read:own` - Only read own snapshots
- `snapshot:write:own` - Only write own snapshots
- `snapshot:admin` - Manage other users' snapshots
- `snapshot:export` - Export/backup snapshots (future tool)

**Impact:** Medium - Affects authorization design

**Decision needed:** When defining multi-user requirements

**Current approach:** Simple 3-scope model (read, write, delete)

### 5. Rate Limiting and Quotas

**Question:** Should rate limiting be part of authorization policy?

**Considerations:**
- Multi-user deployments may need per-user quotas
- Prevent abuse (excessive snapshot creation)
- Enforce storage limits

**Options:**
1. **No rate limiting:**
   - Trust platform/infrastructure to handle
   - Pros: Simpler server
   - Cons: No built-in protection

2. **Policy-level rate limiting:**
   - AuthorizationPolicy checks rate limits
   - Pros: Flexible, policy-specific
   - Cons: State management complexity

3. **External rate limiting:**
   - Platform/proxy handles rate limits
   - Pros: Server stays simple
   - Cons: Requires external infrastructure

**Impact:** Low - Nice-to-have for production deployments

**Decision needed:** When designing multi-user production deployments

**Current approach:** No rate limiting (local desktop mode)

### 6. Audit Logging

**Question:** Should authorization events be logged for audit trails?

**Considerations:**
- Multi-user deployments may require compliance audit logs
- Track who accessed which snapshots when
- Monitor authorization failures

**Options:**
1. **No logging:**
   - Keep server simple
   - Pros: Low overhead
   - Cons: No audit trail

2. **Policy-level logging:**
   - AuthorizationPolicy logs events
   - Pros: Flexible, policy-specific
   - Cons: Server needs logging infrastructure

3. **External logging:**
   - Platform handles audit logs
   - Pros: Centralized, server stays simple
   - Cons: Requires platform support

**Impact:** Low-Medium - Compliance requirement for some deployments

**Decision needed:** When defining production deployment requirements

**Current approach:** No audit logging (local desktop mode)

### 7. HTTP Transport for MCP

**Question:** Will MCP support HTTP transport for cloud deployments?

**Current state:**
- MCP SDK v1.0.4 supports stdio only
- Cloud deployments typically use HTTP
- Protected resource metadata requires HTTP endpoint

**Options:**
1. **Wait for MCP HTTP transport:**
   - Official MCP SDK support
   - Pros: Standard, well-supported
   - Cons: Unknown timeline

2. **Custom HTTP wrapper:**
   - Wrap stdio MCP server in HTTP API
   - Pros: Works now
   - Cons: Non-standard, maintenance burden

3. **WebSocket transport:**
   - Real-time bidirectional communication
   - Pros: Fits MCP model well
   - Cons: Requires MCP SDK support

**Impact:** High - Affects cloud deployment architecture

**Decision needed:** Monitor MCP SDK roadmap

**Current approach:** stdio transport (local desktop)

## Vendor Lock-in Considerations

### Platform Neutrality Maintained

✅ **Design decisions to preserve neutrality:**
1. Auth-neutral (no bundled auth server)
2. Generic deployment options (not platform-specific)
3. Standard OAuth 2.1 (not proprietary auth)
4. Documentation uses generic examples
5. No platform-specific code or configuration

✅ **Avoided lock-in risks:**
1. No platform-specific APIs
2. No vendor-specific auth integrations
3. No telemetry or phone-home behavior
4. No cloud-only features

### Future Considerations

**If adding platform integrations:**
1. Make them optional (plugins/extensions)
2. Keep core server vendor-neutral
3. Document integration patterns, not implementations
4. Allow users to choose their platform

## Implementation-Time Responsibilities

### Snapshot MCP Server Responsibilities (Implemented)

✅ **Server provides:**
1. Authorization hook interface
2. Default NoAuthPolicy
3. Tool schema definitions
4. Scope mapping
5. Documentation and examples

### Deployment-Time Responsibilities (Operator/Platform)

❌ **Operator/platform must provide:**
1. OAuth 2.1 authorization server (if multi-user)
2. OAuthPolicy implementation (future)
3. User authentication mechanism
4. Token issuance and management
5. Per-user database isolation (if multi-user)
6. Network security (TLS, firewall)
7. Audit logging (if required)
8. Rate limiting and quotas (if required)

**Clarification:** This repo does NOT ship an auth server or full OAuth implementation.

## Timeline Dependencies

### Phase 6 (Complete)

✅ **No external dependencies:**
- Authorization hooks implemented
- Documentation complete
- Tests passing
- Backward compatible

### Future OAuth Implementation (Post-June 2025)

⏳ **Dependencies:**
1. **MCP OAuth 2.1 specification finalized** (June 2025+)
2. **MCP SDK support for authorization headers** (unknown timeline)
3. **Optional: MCP HTTP transport** (unknown timeline)

**Cannot proceed with full OAuth until:**
- Spec is stable (avoid incompatible implementation)
- SDK supports header passing (or workaround defined)

## Recommendations

### For Phase 7+ (Future Work)

1. **Monitor MCP Specification:**
   - Watch for OAuth 2.1 spec release (June 2025+)
   - Review spec for header passing mechanism
   - Update docs when spec is finalized

2. **Implement OAuthPolicy (Post-Spec):**
   - JWT validation using `jsonwebtoken` or `jose`
   - Token expiration and audience checks
   - Scope validation
   - Integration tests with test OAuth server

3. **Add Per-User Database Isolation:**
   - Design based on deployment requirements
   - Consider separate DB files vs single DB with user_id
   - Document migration path from single-user to multi-user

4. **Optional Enhancements:**
   - Token caching for performance
   - Audit logging integration
   - Rate limiting (if needed)
   - Protected resource metadata endpoint (when HTTP transport available)

### For Operators Planning OAuth Deployments

1. **Choose Authorization Server:**
   - Auth0, Keycloak, AWS Cognito, etc.
   - Must support OAuth 2.1 with PKCE
   - Must provide JWKS endpoint for signature validation

2. **Plan Database Strategy:**
   - Per-user DB files or single DB with user_id
   - Backup and recovery procedures
   - Storage quotas and retention policies

3. **Network Security:**
   - TLS for all connections
   - Firewall rules and network isolation
   - Secure token transmission

4. **Compliance:**
   - Audit logging requirements
   - Data retention policies
   - User consent and privacy

## Summary

**Phase 6 status:**
- ✅ Authorization hooks implemented and tested
- ✅ Documentation comprehensive and vendor-neutral
- ✅ Backward compatibility maintained
- ✅ Design blueprints ready for future implementation

**Deferred to future:**
- OAuth 2.1 validation logic (waiting for spec)
- Per-user database isolation (multi-user deployments)
- Protected resource metadata (waiting for HTTP transport)
- Token caching and audit logging (optional enhancements)

**Open questions:**
- MCP SDK authorization header support mechanism
- Per-user database isolation strategy
- Token caching approach
- Scope granularity for multi-user
- Rate limiting and audit logging approach

**No blockers for Phase 6 completion:**
- All objectives met
- Design-only items clearly documented
- Implementation timeline depends on MCP spec (June 2025+)

---

**Last Updated:** 2025-11-18 (Phase 6 Completion)
