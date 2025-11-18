/**
 * Error codes for MCP tool errors.
 * These codes provide structured error identification suitable for:
 * - Client error handling and retry logic
 * - Future OAuth 2.1 authorization scope validation
 * - Audit logging and monitoring
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'validation_error',
  NOT_FOUND = 'not_found',
  DATABASE_ERROR = 'database_error',
  UNKNOWN_TOOL = 'unknown_tool',
  INTERNAL_ERROR = 'internal_error',
}

/**
 * Structured error class for MCP tool errors.
 * Extends Error to ensure proper error handling and stack traces.
 * This format is designed to be:
 * - Compatible with current MCP text content responses
 * - Extensible for future OAuth 2.1 error responses (RFC 6749 Section 5.2)
 * - Parseable by both humans and automated clients
 */
export class MCPError extends Error {
  code: ErrorCode;
  details?: string;

  constructor(code: ErrorCode, message: string, details?: string) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = 'MCPError';
    // Maintain proper stack trace (for V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MCPError);
    }
  }
}
