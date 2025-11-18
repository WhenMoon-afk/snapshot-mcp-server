/**
 * Authorization Policy Interfaces and Implementations
 *
 * This module provides optional authorization hooks for the Snapshot MCP Server.
 * By default, the server uses NoAuthPolicy which always authorizes requests
 * (preserving current local desktop behavior).
 *
 * Future OAuth 2.1 Integration:
 * When MCP OAuth 2.1 specification is finalized, an OAuthPolicy can be
 * implemented that validates JWT tokens, checks scopes, and enforces
 * per-user database isolation.
 *
 * See docs/mcp-authorization-options.md for architecture and deployment options.
 */

/**
 * Authorization result returned by authorization policies.
 */
export interface AuthResult {
  /**
   * Whether the request is authorized.
   */
  authorized: boolean;

  /**
   * User ID extracted from token (for per-user database isolation).
   * Only present when authorized is true and auth mode is enabled.
   */
  userId?: string;

  /**
   * Scopes granted to the user (e.g., ['snapshot:read', 'snapshot:write']).
   * Only present when authorized is true and auth mode is enabled.
   */
  scopes?: string[];

  /**
   * Error code if authorization failed.
   * Examples: 'missing_token', 'invalid_token', 'token_expired',
   * 'invalid_audience', 'insufficient_scope'
   */
  error?: string;

  /**
   * Human-readable error description.
   */
  errorDescription?: string;

  /**
   * Required scope for the requested operation (used in 403 responses).
   */
  requiredScope?: string;
}

/**
 * Tool call request context for authorization checks.
 */
export interface ToolCallContext {
  /**
   * Name of the tool being called.
   */
  toolName: string;

  /**
   * Request headers (may contain Authorization header with Bearer token).
   */
  headers?: Record<string, string>;

  /**
   * Tool arguments (for content-based authorization policies).
   */
  arguments?: unknown;
}

/**
 * Authorization policy interface.
 *
 * Implementations validate tool call requests and return authorization results.
 * The server calls authorize() before executing any tool handler.
 */
export interface AuthorizationPolicy {
  /**
   * Authorize a tool call request.
   *
   * @param context - Tool call context with name, headers, and arguments
   * @returns Authorization result (authorized + user context, or error)
   */
  authorize(context: ToolCallContext): Promise<AuthResult>;
}

/**
 * No-op authorization policy (default).
 *
 * Always authorizes requests without checking credentials.
 * This preserves the current local desktop behavior where no
 * authentication is required.
 *
 * Use this for:
 * - Local trusted desktop environments
 * - Single-user deployments
 * - Development and testing
 */
export class NoAuthPolicy implements AuthorizationPolicy {
  /**
   * Always authorizes requests (no authentication).
   */
  async authorize(_context: ToolCallContext): Promise<AuthResult> {
    return {
      authorized: true,
      // No userId or scopes in local desktop mode
    };
  }
}

/**
 * Dummy authorization policy for testing.
 *
 * Rejects requests without valid authorization headers.
 * Used in tests to verify authorization hook integration.
 *
 * NOT for production use - implement OAuthPolicy for real authorization.
 */
export class DummyAuthPolicy implements AuthorizationPolicy {
  /**
   * Check for Authorization header and validate dummy token.
   */
  async authorize(context: ToolCallContext): Promise<AuthResult> {
    // Extract Authorization header
    const authHeader = context.headers?.['authorization'];

    if (!authHeader) {
      return {
        authorized: false,
        error: 'missing_token',
        errorDescription: 'Authorization header is required',
      };
    }

    if (!authHeader.startsWith('Bearer ')) {
      return {
        authorized: false,
        error: 'invalid_token',
        errorDescription: 'Authorization header must use Bearer scheme',
      };
    }

    const token = authHeader.substring(7);

    // Dummy validation: accept "valid-token" for testing
    if (token !== 'valid-token') {
      return {
        authorized: false,
        error: 'invalid_token',
        errorDescription: 'Token validation failed',
      };
    }

    // Check scope for tool (dummy scope mapping)
    const requiredScope = this.getScopeForTool(context.toolName);
    const grantedScopes = ['snapshot:read', 'snapshot:write']; // Dummy scopes

    if (!grantedScopes.includes(requiredScope)) {
      return {
        authorized: false,
        error: 'insufficient_scope',
        errorDescription: `Required scope: ${requiredScope}`,
        requiredScope,
      };
    }

    // Authorized with dummy user context
    return {
      authorized: true,
      userId: 'test-user-123',
      scopes: grantedScopes,
    };
  }

  /**
   * Map tool names to required scopes (dummy implementation).
   */
  private getScopeForTool(toolName: string): string {
    const scopeMap: Record<string, string> = {
      save_snapshot: 'snapshot:write',
      load_snapshot: 'snapshot:read',
      list_snapshots: 'snapshot:read',
      delete_snapshot: 'snapshot:delete',
    };

    return scopeMap[toolName] || 'snapshot:read';
  }
}

/**
 * Scope mapping for MCP tools.
 *
 * Defines which OAuth scopes are required for each tool.
 * Used by OAuth policies to validate token scopes.
 */
export const TOOL_SCOPES: Record<string, string> = {
  save_snapshot: 'snapshot:write',
  load_snapshot: 'snapshot:read',
  list_snapshots: 'snapshot:read',
  delete_snapshot: 'snapshot:delete',
};

/**
 * Get required scope for a tool.
 *
 * @param toolName - Name of the tool
 * @returns Required OAuth scope (defaults to 'snapshot:read')
 */
export function getScopeForTool(toolName: string): string {
  return TOOL_SCOPES[toolName] || 'snapshot:read';
}
