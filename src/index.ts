#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { SnapshotDatabase, SaveSnapshotInput } from './database.js';
import { MCPError, ErrorCode } from './mcp-error.js';
import { AuthorizationPolicy, NoAuthPolicy, ToolCallContext } from './authorization.js';

const DB_PATH = process.env.SNAPSHOT_DB_PATH || './snapshots.db';

class SnapshotMCPServer {
  private server: Server;
  private db: SnapshotDatabase;
  private authPolicy: AuthorizationPolicy;

  constructor(authPolicy?: AuthorizationPolicy) {
    this.db = new SnapshotDatabase(DB_PATH);
    this.authPolicy = authPolicy || new NoAuthPolicy();
    this.server = new Server(
      {
        name: 'snapshot-mcp-server',
        version: '1.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();

    // Handle cleanup
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
  }

  private cleanup(): void {
    this.db.close();
    process.exit(0);
  }

  /**
   * Check if an error is an MCPError.
   */
  private isMCPError(error: unknown): error is MCPError {
    return error instanceof MCPError;
  }

  /**
   * Format an error for MCP text content response.
   * This method creates a structured error message that can be:
   * - Displayed to users in Claude Desktop
   * - Parsed by automated clients
   * - Extended with OAuth error details in the future
   *
   * Future OAuth 2.1 Integration Point:
   * When OAuth is enabled, this method could also return WWW-Authenticate
   * headers for 401 errors and include scope information for authorization failures.
   */
  private formatError(error: MCPError): { content: Array<{ type: string; text: string }> } {
    const parts = [`Error: ${error.message}`];

    if (error.details) {
      parts.push(`Details: ${error.details}`);
    }

    parts.push(`Code: ${error.code}`);

    return {
      content: [
        {
          type: 'text',
          text: parts.join('\n'),
        },
      ],
    };
  }

  /**
   * Format an authorization error for MCP response.
   * Returns a structured error message compatible with OAuth 2.1 error format.
   *
   * In a future HTTP-based MCP implementation, this could also set:
   * - Status code: 401 Unauthorized or 403 Forbidden
   * - WWW-Authenticate header with error details
   */
  private formatAuthorizationError(authResult: { error?: string; errorDescription?: string; requiredScope?: string }): { content: Array<{ type: string; text: string }> } {
    const errorCode = authResult.error || 'unauthorized';
    const description = authResult.errorDescription || 'Authorization failed';

    const parts = ['Authorization Error', `Code: ${errorCode}`, `Details: ${description}`];

    if (authResult.requiredScope) {
      parts.push(`Required scope: ${authResult.requiredScope}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: parts.join('\n'),
        },
      ],
    };
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'save_snapshot',
          description: 'Save current conversation state',
          inputSchema: {
            type: 'object',
            properties: {
              summary: {
                type: 'string',
                description: 'Summary of work accomplished',
              },
              context: {
                oneOf: [
                  {
                    type: 'string',
                    description: 'Conversation context and state',
                  },
                  {
                    type: 'object',
                    description: 'Structured context',
                    properties: {
                      files: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Files modified',
                      },
                      decisions: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Decisions made',
                      },
                      blockers: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Blockers',
                      },
                      code_state: {
                        type: 'object',
                        description: 'Code state',
                      },
                    },
                  },
                ],
              },
              name: {
                type: 'string',
                description: 'Optional name',
              },
              next_steps: {
                type: 'string',
                description: 'Next steps',
              },
            },
            required: ['summary', 'context'],
          },
        },
        {
          name: 'load_snapshot',
          description: 'Load snapshot by ID, name, or latest',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'number',
                description: 'Snapshot ID',
              },
              name: {
                type: 'string',
                description: 'Snapshot name',
              },
            },
          },
        },
        {
          name: 'list_snapshots',
          description: 'List all snapshots',
          inputSchema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: 'Max snapshots (default: 100)',
              },
            },
          },
        },
        {
          name: 'delete_snapshot',
          description: 'Delete snapshot by ID',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'number',
                description: 'Snapshot ID',
              },
            },
            required: ['id'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // **OAuth 2.1 Authorization Hook (Phase 6):**
      // Check authorization policy before executing tool handler.
      // Default NoAuthPolicy always authorizes (preserves current behavior).
      // Future OAuthPolicy will validate JWT tokens, check scopes, etc.
      // See docs/mcp-authorization-options.md for details.
      const authContext: ToolCallContext = {
        toolName: name,
        headers: (request as any).headers, // MCP SDK may add headers in future
        arguments: args,
      };

      const authResult = await this.authPolicy.authorize(authContext);

      if (!authResult.authorized) {
        // Return authorization error
        return this.formatAuthorizationError(authResult);
      }

      // Authorization successful - proceed with tool execution
      // (authResult.userId can be used for per-user database isolation in future)

      try {
        switch (name) {
          case 'save_snapshot':
            return await this.handleSaveSnapshot(args as unknown as SaveSnapshotInput);

          case 'load_snapshot':
            return await this.handleLoadSnapshot(args as unknown as { id?: number; name?: string });

          case 'list_snapshots':
            return await this.handleListSnapshots(args as unknown as { limit?: number });

          case 'delete_snapshot':
            return await this.handleDeleteSnapshot(args as unknown as { id: number });

          default:
            return this.formatError(new MCPError(ErrorCode.UNKNOWN_TOOL, `Unknown tool: ${name}`));
        }
      } catch (error) {
        // Handle structured MCPError
        if (this.isMCPError(error)) {
          return this.formatError(error);
        }

        // Handle generic errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        return this.formatError(new MCPError(ErrorCode.INTERNAL_ERROR, errorMessage));
      }
    });
  }

  private async handleSaveSnapshot(args: SaveSnapshotInput) {
    if (!args.summary || !args.context) {
      throw new MCPError(ErrorCode.VALIDATION_ERROR, 'Missing required fields', 'Both summary and context are required');
    }

    try {
      const snapshot = this.db.saveSnapshot(args);

      return {
        content: [
          {
            type: 'text',
            text: `Saved snapshot #${snapshot.id}${snapshot.name ? ` (${snapshot.name})` : ''}`,
          },
        ],
      };
    } catch (error) {
      throw new MCPError(ErrorCode.DATABASE_ERROR, 'Failed to save snapshot', error instanceof Error ? error.message : String(error));
    }
  }

  private async handleLoadSnapshot(args: { id?: number; name?: string }) {
    let snapshot;

    try {
      if (args.id !== undefined) {
        snapshot = this.db.getSnapshotById(args.id);
        if (!snapshot) {
          throw new MCPError(ErrorCode.NOT_FOUND, `Snapshot with ID ${args.id} not found`);
        }
      } else if (args.name) {
        snapshot = this.db.getSnapshotByName(args.name);
        if (!snapshot) {
          throw new MCPError(ErrorCode.NOT_FOUND, `Snapshot with name "${args.name}" not found`);
        }
      } else {
        snapshot = this.db.getLatestSnapshot();
        if (!snapshot) {
          throw new MCPError(ErrorCode.NOT_FOUND, 'No snapshots found', 'Database is empty');
        }
      }
    } catch (error) {
      if (this.isMCPError(error)) {
        throw error;
      }
      throw new MCPError(ErrorCode.DATABASE_ERROR, 'Failed to load snapshot', error instanceof Error ? error.message : String(error));
    }

    // Use pre-generated continuation prompt if available (token efficient!)
    // Otherwise generate on-the-fly for backward compatibility with old snapshots
    let promptText: string;

    if (snapshot.continuation_prompt && snapshot.continuation_prompt.trim() !== '') {
      promptText = snapshot.continuation_prompt;
    } else {
      // Backward compatibility: generate prompt for old snapshots
      const prompt = [
        `Resuming: ${snapshot.summary}`,
        '',
        'Context:',
        snapshot.context,
      ];

      if (snapshot.next_steps) {
        prompt.push('', 'Next:', snapshot.next_steps);
      }

      promptText = prompt.join('\n');
    }

    return {
      content: [
        {
          type: 'text',
          text: promptText,
        },
      ],
    };
  }

  private async handleListSnapshots(args: { limit?: number }) {
    const snapshots = this.db.listSnapshots(args.limit);

    if (snapshots.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No snapshots found.',
          },
        ],
      };
    }

    const lines = [];

    for (const snapshot of snapshots) {
      const namePart = snapshot.name ? ` (${snapshot.name})` : '';
      lines.push(`#${snapshot.id}${namePart} - ${snapshot.summary} [${snapshot.created_at}]`);
    }

    return {
      content: [
        {
          type: 'text',
          text: lines.join('\n'),
        },
      ],
    };
  }

  private async handleDeleteSnapshot(args: { id: number }) {
    if (args.id === undefined) {
      throw new MCPError(ErrorCode.VALIDATION_ERROR, 'Missing required field', 'id is required');
    }

    try {
      const deleted = this.db.deleteSnapshot(args.id);

      if (!deleted) {
        throw new MCPError(ErrorCode.NOT_FOUND, `Snapshot with ID ${args.id} not found`);
      }

      return {
        content: [
          {
            type: 'text',
            text: `Deleted snapshot #${args.id}`,
          },
        ],
      };
    } catch (error) {
      if (this.isMCPError(error)) {
        throw error;
      }
      throw new MCPError(ErrorCode.DATABASE_ERROR, 'Failed to delete snapshot', error instanceof Error ? error.message : String(error));
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Snapshot MCP Server running on stdio');
    console.error(`Database: ${DB_PATH}`);
  }
}

const server = new SnapshotMCPServer();
server.run().catch(console.error);
