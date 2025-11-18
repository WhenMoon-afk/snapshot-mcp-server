#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { SnapshotDatabase, SaveSnapshotInput } from './database.js';

const DB_PATH = process.env.SNAPSHOT_DB_PATH || './snapshots.db';

class SnapshotMCPServer {
  private server: Server;
  private db: SnapshotDatabase;

  constructor() {
    this.db = new SnapshotDatabase(DB_PATH);
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
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
        };
      }
    });
  }

  private async handleSaveSnapshot(args: SaveSnapshotInput) {
    if (!args.summary || !args.context) {
      throw new Error('summary and context are required');
    }

    const snapshot = this.db.saveSnapshot(args);

    return {
      content: [
        {
          type: 'text',
          text: `Saved snapshot #${snapshot.id}${snapshot.name ? ` (${snapshot.name})` : ''}`,
        },
      ],
    };
  }

  private async handleLoadSnapshot(args: { id?: number; name?: string }) {
    let snapshot;

    if (args.id !== undefined) {
      snapshot = this.db.getSnapshotById(args.id);
      if (!snapshot) {
        throw new Error(`Snapshot with ID ${args.id} not found`);
      }
    } else if (args.name) {
      snapshot = this.db.getSnapshotByName(args.name);
      if (!snapshot) {
        throw new Error(`Snapshot with name "${args.name}" not found`);
      }
    } else {
      snapshot = this.db.getLatestSnapshot();
      if (!snapshot) {
        throw new Error('No snapshots found');
      }
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
      throw new Error('id is required');
    }

    const deleted = this.db.deleteSnapshot(args.id);

    if (!deleted) {
      throw new Error(`Snapshot with ID ${args.id} not found`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `Deleted snapshot #${args.id}`,
        },
      ],
    };
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
