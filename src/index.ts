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
        version: '1.0.0',
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
          description: 'Save the current conversation state as a snapshot',
          inputSchema: {
            type: 'object',
            properties: {
              summary: {
                type: 'string',
                description: 'Brief summary of what was accomplished',
              },
              context: {
                type: 'string',
                description: 'Full context of the conversation - code state, decisions, blockers',
              },
              name: {
                type: 'string',
                description: 'Optional name for easy retrieval',
              },
              next_steps: {
                type: 'string',
                description: 'What to do when resuming',
              },
            },
            required: ['summary', 'context'],
          },
        },
        {
          name: 'load_snapshot',
          description: 'Load a saved snapshot (defaults to latest if no ID or name provided)',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'number',
                description: 'Snapshot ID to load',
              },
              name: {
                type: 'string',
                description: 'Snapshot name to load',
              },
            },
          },
        },
        {
          name: 'list_snapshots',
          description: 'List all saved snapshots',
          inputSchema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: 'Maximum number of snapshots to return (default: 100)',
              },
            },
          },
        },
        {
          name: 'delete_snapshot',
          description: 'Delete a snapshot by ID',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'number',
                description: 'Snapshot ID to delete',
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
          text: `Snapshot saved successfully!\n\nID: ${snapshot.id}\nName: ${snapshot.name || '(unnamed)'}\nCreated: ${snapshot.created_at}\n\nTo resume this conversation later, use: load_snapshot with id=${snapshot.id}${snapshot.name ? ` or name="${snapshot.name}"` : ''}`,
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

    // Format as a prompt-ready text
    const prompt = [
      '# Resuming from Snapshot',
      '',
      `**Snapshot ID:** ${snapshot.id}`,
      `**Name:** ${snapshot.name || '(unnamed)'}`,
      `**Created:** ${snapshot.created_at}`,
      '',
      '## Summary',
      snapshot.summary,
      '',
      '## Context',
      snapshot.context,
    ];

    if (snapshot.next_steps) {
      prompt.push('', '## Next Steps', snapshot.next_steps);
    }

    return {
      content: [
        {
          type: 'text',
          text: prompt.join('\n'),
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

    const lines = ['# Saved Snapshots', ''];

    for (const snapshot of snapshots) {
      lines.push(`## ID: ${snapshot.id}${snapshot.name ? ` - ${snapshot.name}` : ''}`);
      lines.push(`**Created:** ${snapshot.created_at}`);
      lines.push(`**Summary:** ${snapshot.summary}`);
      lines.push('');
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
          text: `Snapshot ${args.id} deleted successfully.`,
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
