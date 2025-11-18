# MCP Authorization Integration Options

This document describes authorization options for the Snapshot MCP Server, including MCP OAuth 2.1 integration patterns, deployment models, and implementation guidance.

## Table of Contents

- [Overview](#overview)
- [MCP OAuth 2.1 Concepts](#mcp-oauth-21-concepts)
- [Architecture: Resource Server Pattern](#architecture-resource-server-pattern)
- [Authorization Check Integration Points](#authorization-check-integration-points)
- [Deployment Options](#deployment-options)
- [Implementation Guidance](#implementation-guidance)
- [Scope and Audience Design](#scope-and-audience-design)
- [Timeline and Compatibility](#timeline-and-compatibility)

## Overview

### Current Security Model

**The Snapshot MCP Server is currently designed for local, trusted desktop environments:**
- No authentication or authorization required
- Data stored locally on user's machine (SQLite)
- Communication via stdio (no network exposure)
- Single-user access model

See [SECURITY.md](../SECURITY.md) for current security characteristics.

### Future: MCP OAuth 2.1 Support

**When MCP OAuth 2.1 specification is finalized (target: June 2025+):**
- Multi-user and cloud deployment support
- Token-based authorization
- External authorization server integration
- Backward compatible with local desktop mode

**This document provides design guidance only. The Snapshot MCP Server does NOT currently implement OAuth or ship an authorization server.**

## MCP OAuth 2.1 Concepts

### Key Standards

**MCP OAuth 2.1 builds on established RFCs:**
- **OAuth 2.1:** Core authorization framework (successor to OAuth 2.0)
- **PKCE (RFC 7636):** Proof Key for Code Exchange - mandatory for all clients
- **Resource Indicators (RFC 8707):** Specify token audience per resource server
- **Protected Resource Metadata (RFC 9728):** Server discovery and capability advertisement
- **Dynamic Client Registration (RFC 7591):** Automatic client registration (recommended)
- **Authorization Server Metadata (RFC 8414):** Authorization server discovery

### Terminology

**Authorization Server:**
- Issues access tokens to clients after authenticating the user
- Manages user credentials, consent, and token lifecycle
- Examples: Auth0, Keycloak, Okta, AWS Cognito, custom OAuth server
- **Not provided by this repository**

**Resource Server:**
- Validates access tokens and enforces authorization policies
- Serves protected resources (in this case, snapshot tools)
- **The Snapshot MCP Server acts as a resource server when OAuth is enabled**

**Client:**
- Application requesting access to protected resources
- MCP hosts, generated code-execution clients, or custom integrations
- Must use PKCE for all authorization flows

**Resource Indicator:**
- URI identifying a specific resource server
- Included in token request to specify intended audience
- Example: `https://snapshot.example.com` or `urn:mcp:snapshot`

**Scope:**
- Permissions requested by client and granted by user
- Examples: `snapshot:read`, `snapshot:write`, `snapshot:delete`
- Resource server validates scopes in access token

**Audience (aud claim):**
- JWT claim specifying intended recipient(s) of the token
- Resource server must validate token audience matches its identifier
- Prevents token misuse across different resource servers

## Architecture: Resource Server Pattern

### MCP OAuth 2.1 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  User (Resource Owner)                                      │
│  - Authenticates to authorization server                    │
│  - Grants consent for client to access snapshots            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ 1. Authentication & Consent
                        │
┌───────────────────────▼─────────────────────────────────────┐
│  Authorization Server (External, NOT in this repo)          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  - User authentication (credentials, SSO, MFA)         │ │
│  │  - Client registration and validation                  │ │
│  │  - Consent management                                  │ │
│  │  - Token issuance (access tokens, refresh tokens)      │ │
│  │  - Token revocation and expiration                     │ │
│  └────────────────────────────────────────────────────────┘ │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ 2. Access Token
                        │    (JWT with audience + scopes)
                        │
┌───────────────────────▼─────────────────────────────────────┐
│  Client (MCP Host or Generated Code Client)                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  - Initiates OAuth 2.1 flow with PKCE                  │ │
│  │  - Includes resource indicator in token request        │ │
│  │  - Receives and stores access token                    │ │
│  │  - Includes token in MCP requests (Authorization header)│ │
│  │  - Handles token refresh and expiration                │ │
│  └────────────────────────────────────────────────────────┘ │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ 3. MCP Request with Authorization Header
                        │    (Authorization: Bearer <access_token>)
                        │
┌───────────────────────▼─────────────────────────────────────┐
│  Snapshot MCP Server (Resource Server)                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Token Validation Middleware (NEW)                     │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │  1. Extract token from Authorization header      │  │ │
│  │  │  2. Validate JWT signature (using auth server's  │  │ │
│  │  │     public key from JWKS endpoint)               │  │ │
│  │  │  3. Verify token expiration (exp claim)          │  │ │
│  │  │  4. Verify audience (aud claim matches server ID)│  │ │
│  │  │  5. Check scopes for requested tool              │  │ │
│  │  │  6. Reject with 401 if validation fails          │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Tool Handlers (Existing)                              │ │
│  │  - save_snapshot (requires snapshot:write scope)       │ │
│  │  - load_snapshot (requires snapshot:read scope)        │ │
│  │  - list_snapshots (requires snapshot:read scope)       │ │
│  │  - delete_snapshot (requires snapshot:delete scope)    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Database Layer (Existing)                             │ │
│  │  - Per-user database isolation (NEW for multi-user)    │ │
│  │  - SQLite with WAL mode                                │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Key Design Principles

**1. External Authorization Server**
- The Snapshot MCP Server does NOT implement an authorization server
- Operators deploy and configure their own OAuth 2.1 server
- Centralized security aligned with enterprise architectures
- Server is auth-neutral and vendor-agnostic

**2. Resource Server Only**
- Server validates tokens but does not issue them
- Token validation logic is isolated and optional
- Backward compatible with local desktop mode (no auth)

**3. Discovery via Metadata**
- Server exposes `/.well-known/oauth-protected-resource` endpoint
- Clients discover authorization server URL and required scopes
- Standard OAuth 2.1 discovery flow

## Authorization Check Integration Points

### Where Authorization Checks Run

**The following integration points are designed but NOT yet implemented:**

#### 1. Request Middleware (Pre-Tool Handler)

```typescript
// Conceptual authorization hook (not yet implemented)
async function authorizeRequest(request: ToolCallRequest): Promise<AuthResult> {
  // 1. Extract access token from request headers
  const authHeader = request.headers?.['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return { authorized: false, error: 'missing_token' };
  }
  const token = authHeader.substring(7);

  // 2. Validate JWT signature
  const publicKey = await fetchAuthServerPublicKey();
  let payload;
  try {
    payload = jwt.verify(token, publicKey);
  } catch (error) {
    return { authorized: false, error: 'invalid_token' };
  }

  // 3. Verify token expiration
  if (Date.now() / 1000 > payload.exp) {
    return { authorized: false, error: 'token_expired' };
  }

  // 4. Verify audience matches this server
  const expectedAudience = process.env.MCP_SERVER_RESOURCE_ID;
  if (!payload.aud || !payload.aud.includes(expectedAudience)) {
    return { authorized: false, error: 'invalid_audience' };
  }

  // 5. Check scopes for requested tool
  const requiredScope = getScopeForTool(request.toolName);
  if (!payload.scope?.includes(requiredScope)) {
    return { authorized: false, error: 'insufficient_scope' };
  }

  // 6. Extract user ID for database isolation
  return {
    authorized: true,
    userId: payload.sub, // Subject claim (user ID)
    scopes: payload.scope.split(' ')
  };
}
```

**Integration point:** Before tool handler execution in `src/index.ts:188-198` (currently documented with comments from Phase 4)

#### 2. Tool-Specific Scope Requirements

```typescript
// Conceptual scope mapping (not yet implemented)
const TOOL_SCOPES = {
  'save_snapshot': 'snapshot:write',
  'load_snapshot': 'snapshot:read',
  'list_snapshots': 'snapshot:read',
  'delete_snapshot': 'snapshot:delete'
};

function getScopeForTool(toolName: string): string {
  return TOOL_SCOPES[toolName] || 'snapshot:read';
}
```

#### 3. Per-User Database Isolation

```typescript
// Conceptual per-user database (not yet implemented)
class SnapshotDatabase {
  constructor(private userId?: string) {
    // If userId provided (OAuth mode), use per-user database
    if (userId) {
      this.dbPath = `~/.claude-snapshots/users/${userId}/snapshots.db`;
    } else {
      // Local desktop mode (no auth)
      this.dbPath = '~/.claude-snapshots/snapshots.db';
    }
  }
}
```

#### 4. Protected Resource Metadata Endpoint

```typescript
// Conceptual metadata endpoint (not yet implemented)
// GET /.well-known/oauth-protected-resource
{
  "resource": "https://snapshot.example.com",
  "authorization_servers": ["https://auth.example.com"],
  "scopes_supported": [
    "snapshot:read",
    "snapshot:write",
    "snapshot:delete"
  ],
  "bearer_methods_supported": ["header"],
  "resource_documentation": "https://github.com/WhenMoon-afk/snapshot-mcp-server"
}
```

### Error Responses

**401 Unauthorized (token missing or invalid):**
```
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer realm="snapshot",
                  error="invalid_token",
                  error_description="Token signature verification failed"
Content-Type: application/json

{
  "code": "unauthorized",
  "message": "Invalid access token",
  "details": {
    "error": "invalid_token",
    "error_description": "Token signature verification failed"
  }
}
```

**403 Forbidden (insufficient scope):**
```
HTTP/1.1 403 Forbidden
WWW-Authenticate: Bearer realm="snapshot",
                  error="insufficient_scope",
                  scope="snapshot:write"
Content-Type: application/json

{
  "code": "insufficient_scope",
  "message": "Token does not have required scope",
  "details": {
    "required_scope": "snapshot:write",
    "provided_scopes": ["snapshot:read"]
  }
}
```

## Deployment Options

### Option 1: Local Desktop (Current)

**Use case:** Individual developer on personal computer

**Configuration:**
```json
{
  "mcpServers": {
    "snapshot": {
      "command": "npx",
      "args": ["-y", "@whenmoon-afk/snapshot-mcp-server"],
      "env": {
        "MCP_AUTH_MODE": "disabled"  // Default
      }
    }
  }
}
```

**Characteristics:**
- ✅ No authentication required
- ✅ Data stored locally
- ✅ No external dependencies
- ✅ Simple setup
- ⚠️ Single-user only
- ⚠️ No access control

**When to use:**
- Personal development environments
- Trusted local machines
- No multi-user requirements

### Option 2: Self-Hosted OAuth with IdP

**Use case:** Team or organization with existing identity provider

**Architecture:**
```
┌─────────────────────────────────────────────────┐
│  Identity Provider (Existing)                   │
│  - Active Directory, LDAP, Okta, etc.           │
└─────────────────┬───────────────────────────────┘
                  │
                  │ SAML / OIDC / LDAP
                  │
┌─────────────────▼───────────────────────────────┐
│  Self-Hosted OAuth 2.1 Authorization Server     │
│  Options:                                        │
│  - Keycloak (open source)                       │
│  - ORY Hydra (open source)                      │
│  - Authelia (open source)                       │
│  - Auth0 (managed)                               │
│  - AWS Cognito (managed)                         │
└─────────────────┬───────────────────────────────┘
                  │
                  │ OAuth 2.1 + JWT tokens
                  │
┌─────────────────▼───────────────────────────────┐
│  Snapshot MCP Server (Resource Server)          │
│  - Token validation enabled                     │
│  - Per-user database isolation                  │
└──────────────────────────────────────────────────┘
```

**Configuration:**
```json
{
  "mcpServers": {
    "snapshot": {
      "command": "node",
      "args": ["/path/to/snapshot-mcp-server/dist/index.js"],
      "env": {
        "MCP_AUTH_MODE": "oauth",
        "MCP_AUTH_SERVER": "https://auth.example.com",
        "MCP_AUTH_JWKS_URI": "https://auth.example.com/.well-known/jwks.json",
        "MCP_SERVER_RESOURCE_ID": "https://snapshot.example.com",
        "SNAPSHOT_DB_BASE_PATH": "/data/snapshots/users"
      }
    }
  }
}
```

**Operator responsibilities:**
1. Deploy and configure OAuth 2.1 authorization server
2. Integrate with identity provider (AD, LDAP, etc.)
3. Configure client registration (dynamic or manual)
4. Set up token signing keys and rotation
5. Configure token lifetime and refresh policies
6. Enable CORS and network security

**Characteristics:**
- ✅ Multi-user support
- ✅ Integration with existing IdP
- ✅ Centralized user management
- ✅ Full control over infrastructure
- ⚠️ Requires OAuth server deployment and maintenance
- ⚠️ More complex setup

**When to use:**
- Team or organization deployments
- Existing identity infrastructure
- On-premises or private cloud
- Compliance requirements (data residency, audit)

### Option 3: Managed Zero Trust Platform

**Use case:** Enterprise platform with built-in authentication and authorization

**Architecture:**
```
┌─────────────────────────────────────────────────┐
│  Zero Trust Platform (Managed)                  │
│  ┌───────────────────────────────────────────┐  │
│  │  Platform Security Layer                  │  │
│  │  - User authentication (SSO, MFA)         │  │
│  │  - Authorization policies                 │  │
│  │  - Audit logging                          │  │
│  │  - Network isolation                      │  │
│  │  - Resource quotas                        │  │
│  └───────────────┬───────────────────────────┘  │
│                  │                               │
│  ┌───────────────▼───────────────────────────┐  │
│  │  Agent Code Execution Sandbox             │  │
│  │  (Platform provides MCP host)             │  │
│  └───────────────┬───────────────────────────┘  │
│                  │                               │
│  ┌───────────────▼───────────────────────────┐  │
│  │  Snapshot MCP Server                      │  │
│  │  - No auth needed (platform handles it)   │  │
│  │  - Per-user database isolation            │  │
│  │  - Platform-managed lifecycle             │  │
│  └───────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

**Examples:**
- Anthropic-managed Claude Code on Web
- Enterprise AI agent platforms
- Cloud IDE environments with MCP support

**Configuration:** Platform-managed (automatic)

**Platform responsibilities:**
- User authentication and authorization
- MCP server lifecycle management
- Database isolation and storage
- Network security and isolation
- Audit logging and compliance
- Resource quotas and monitoring

**Snapshot server role:**
- Provide snapshot functionality only
- Operate within platform security boundary
- No auth logic needed (platform enforces access control)

**Characteristics:**
- ✅ Zero setup for users
- ✅ Platform-managed security
- ✅ Built-in compliance and audit
- ✅ Scalable and reliable
- ⚠️ Platform-specific (not portable)
- ⚠️ Limited control over infrastructure

**When to use:**
- Code-execution environments (Claude Code on Web)
- Enterprise AI platforms
- SaaS deployments
- Managed compliance environments

## Implementation Guidance

### Phase 1: Design and Planning (Current)

**Status:** Design-only, no implementation

**Artifacts:**
- This document (mcp-authorization-options.md)
- SECURITY.md updated with OAuth references
- Integration point comments in code (from Phase 4)

**Decision:** Wait for MCP OAuth 2.1 specification finalization (June 2025+) before implementing

### Phase 2: Authorization Hooks (Optional, Non-Breaking)

**Goal:** Add hook interfaces without changing default behavior

**Approach:**
```typescript
// Optional authorization hook interface
interface AuthorizationPolicy {
  /**
   * Authorize a tool call request.
   * @param request - Tool call request with headers
   * @returns Authorization result (authorized + user context)
   */
  authorize(request: ToolCallRequest): Promise<AuthResult>;
}

// Default no-op policy (preserves current behavior)
class NoAuthPolicy implements AuthorizationPolicy {
  async authorize(request: ToolCallRequest): Promise<AuthResult> {
    return { authorized: true }; // Always authorized (local mode)
  }
}

// OAuth policy (future implementation)
class OAuthPolicy implements AuthorizationPolicy {
  constructor(private config: OAuthConfig) {}

  async authorize(request: ToolCallRequest): Promise<AuthResult> {
    // Token validation logic here
  }
}

// Server accepts optional policy (defaults to no-op)
class SnapshotMCPServer {
  constructor(
    private db: SnapshotDatabase,
    private policy: AuthorizationPolicy = new NoAuthPolicy()
  ) {}

  async handleToolCall(request: ToolCallRequest) {
    // Check authorization
    const authResult = await this.policy.authorize(request);
    if (!authResult.authorized) {
      return this.unauthorizedError(authResult.error);
    }

    // Proceed with tool handler
    return this.executeTool(request, authResult.userId);
  }
}
```

**Benefits:**
- Backward compatible (default no-op policy)
- Testable with dummy policies
- Ready for OAuth implementation
- Clear separation of concerns

**Tests:**
```typescript
describe('Authorization Hooks', () => {
  test('NoAuthPolicy always authorizes', async () => {
    const policy = new NoAuthPolicy();
    const result = await policy.authorize({...});
    expect(result.authorized).toBe(true);
  });

  test('DummyPolicy rejects invalid tokens', async () => {
    const policy = new DummyPolicy();
    const result = await policy.authorize({ headers: {} });
    expect(result.authorized).toBe(false);
    expect(result.error).toBe('missing_token');
  });
});
```

### Phase 3: OAuth Implementation (Future)

**When:** After MCP OAuth 2.1 specification is finalized

**Tasks:**
1. Implement OAuthPolicy class with JWT validation
2. Add protected resource metadata endpoint
3. Implement per-user database isolation
4. Add configuration for OAuth mode
5. Update documentation with OAuth setup guide
6. Add integration tests with test OAuth server

**Dependencies:**
- `jsonwebtoken` or `jose` library for JWT validation
- MCP SDK support for authorization headers
- OAuth 2.1 specification finalization

## Scope and Audience Design

### Recommended Scopes

```
snapshot:read    - Load and list snapshots
snapshot:write   - Save new snapshots
snapshot:delete  - Delete snapshots
```

**Scope mapping to tools:**
- `save_snapshot` → `snapshot:write`
- `load_snapshot` → `snapshot:read`
- `list_snapshots` → `snapshot:read`
- `delete_snapshot` → `snapshot:delete`

### Resource Identifier

**Options:**

**1. HTTPS URI (recommended for hosted deployments):**
```
https://snapshot.example.com
```

**2. URN (recommended for local or multi-tenant):**
```
urn:mcp:snapshot
urn:mcp:snapshot:{tenant_id}
```

**Configuration:**
```bash
export MCP_SERVER_RESOURCE_ID="https://snapshot.example.com"
```

### Token Example

```json
{
  "iss": "https://auth.example.com",
  "sub": "user123",
  "aud": "https://snapshot.example.com",
  "exp": 1735689600,
  "iat": 1735686000,
  "scope": "snapshot:read snapshot:write",
  "client_id": "mcp-client-abc123"
}
```

## Timeline and Compatibility

### Current State (Phase 6)

- ✅ Design and architecture documented
- ✅ Integration points identified
- ✅ Optional authorization hooks (if implemented)
- ✅ Backward compatible (no breaking changes)
- ❌ No OAuth implementation yet

### Future Implementation

**Post-MCP OAuth 2.1 Specification (June 2025+):**
1. Implement OAuth 2.1 resource server logic
2. Add protected resource metadata endpoint
3. Implement per-user database isolation
4. Add OAuth configuration options
5. Maintain backward compatibility with local mode
6. Publish OAuth setup guide

**Versioning:**
- OAuth support will be a minor version bump (e.g., v1.3.0)
- Non-breaking (local mode still works)
- OAuth mode opt-in via configuration

### Compatibility Guarantees

**Backward compatibility:**
- Local desktop mode (no auth) remains default
- Existing configurations continue to work
- No breaking changes to tool schemas
- OAuth is opt-in, not mandatory

**Forward compatibility:**
- Authorization hook interfaces stable
- OAuth configuration environment variables reserved
- Protected resource metadata format follows RFC 9728

## Summary

**The Snapshot MCP Server is auth-neutral:**
- Does NOT ship an authorization server
- Does NOT implement authentication logic (yet)
- Designed to integrate with external OAuth 2.1 servers
- Backward compatible with local desktop mode

**Deployment options:**
1. **Local Desktop:** No auth, local storage (current default)
2. **Self-Hosted OAuth:** User deploys authorization server, server validates tokens
3. **Managed Platform:** Platform handles all security, server focuses on snapshots

**When to implement OAuth:**
- After MCP OAuth 2.1 specification is finalized (June 2025+)
- When multi-user or cloud deployments are needed
- As opt-in feature, not breaking change

**Next steps:**
- Monitor MCP OAuth 2.1 specification progress
- (Optional) Implement authorization hooks in Phase 6
- Wait for spec finalization before full OAuth implementation
- Maintain schema stability and backward compatibility

---

**For code-execution architecture and token efficiency, see:**
- [Code-Execution Architecture](architecture-mcp-code-execution.md)
- [SECURITY.md](../SECURITY.md)
