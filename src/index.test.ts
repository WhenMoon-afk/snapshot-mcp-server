import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { SnapshotDatabase } from './database.js';
import { unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Test helper class that mimics SnapshotMCPServer without stdio transport
 * This allows us to test MCP tool handlers in-process
 */
class TestableSnapshotMCPServer {
  private server: Server;
  private db: SnapshotDatabase;

  constructor(dbPath: string) {
    this.db = new SnapshotDatabase(dbPath);
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
            return await this.handleSaveSnapshot(args as any);

          case 'load_snapshot':
            return await this.handleLoadSnapshot(args as any);

          case 'list_snapshots':
            return await this.handleListSnapshots(args as any);

          case 'delete_snapshot':
            return await this.handleDeleteSnapshot(args as any);

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

  private async handleSaveSnapshot(args: any) {
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

  private async handleLoadSnapshot(args: any) {
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

    let promptText: string;

    if (snapshot.continuation_prompt && snapshot.continuation_prompt.trim() !== '') {
      promptText = snapshot.continuation_prompt;
    } else {
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

  private async handleListSnapshots(args: any) {
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

  private async handleDeleteSnapshot(args: any) {
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

  // Helper methods for tests - call handlers directly bypassing Server class
  async callTool(name: string, args: any) {
    const request = {
      method: 'tools/call',
      params: {
        name,
        arguments: args,
      },
    };

    // Manually invoke the handler logic
    try {
      switch (name) {
        case 'save_snapshot':
          return await this.handleSaveSnapshot(args);

        case 'load_snapshot':
          return await this.handleLoadSnapshot(args);

        case 'list_snapshots':
          return await this.handleListSnapshots(args);

        case 'delete_snapshot':
          return await this.handleDeleteSnapshot(args);

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
  }

  async listTools() {
    return {
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
    };
  }

  close() {
    this.db.close();
  }
}

describe('MCP Tool Handlers', () => {
  let server: TestableSnapshotMCPServer;
  let testDbPath: string;

  beforeEach(() => {
    testDbPath = join(tmpdir(), `test-mcp-${Date.now()}-${Math.random()}.db`);
    server = new TestableSnapshotMCPServer(testDbPath);
  });

  afterEach(() => {
    server.close();
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  describe('Tool Schema Validation', () => {
    it('should expose 4 MCP tools', async () => {
      const result = await server.listTools();

      expect(result.tools).toHaveLength(4);
      const toolNames = result.tools.map((t: any) => t.name);
      expect(toolNames).toContain('save_snapshot');
      expect(toolNames).toContain('load_snapshot');
      expect(toolNames).toContain('list_snapshots');
      expect(toolNames).toContain('delete_snapshot');
    });

    it('should have correct schema for save_snapshot', async () => {
      const result = await server.listTools();
      const saveTool = result.tools.find((t: any) => t.name === 'save_snapshot');

      expect(saveTool).toBeDefined();
      expect(saveTool.inputSchema.required).toEqual(['summary', 'context']);
      expect(saveTool.inputSchema.properties.context.oneOf).toHaveLength(2);
    });
  });

  describe('save_snapshot Tool', () => {
    it('should save snapshot with string context', async () => {
      const result = await server.callTool('save_snapshot', {
        summary: 'Test save',
        context: 'String context',
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toMatch(/Saved snapshot #\d+/);
    });

    it('should save snapshot with structured context', async () => {
      const result = await server.callTool('save_snapshot', {
        summary: 'Structured save',
        context: {
          files: ['test.ts'],
          decisions: ['Use Vitest'],
        },
      });

      expect(result.content[0].text).toMatch(/Saved snapshot #\d+/);
    });

    it('should save snapshot with name', async () => {
      const result = await server.callTool('save_snapshot', {
        name: 'test-milestone',
        summary: 'Named save',
        context: 'Context',
      });

      expect(result.content[0].text).toContain('test-milestone');
    });

    it('should return error when summary is missing', async () => {
      const result = await server.callTool('save_snapshot', {
        context: 'Context only',
      });

      expect(result.content[0].text).toContain('Error:');
      expect(result.content[0].text).toContain('summary and context are required');
    });

    it('should return error when context is missing', async () => {
      const result = await server.callTool('save_snapshot', {
        summary: 'Summary only',
      });

      expect(result.content[0].text).toContain('Error:');
      expect(result.content[0].text).toContain('summary and context are required');
    });
  });

  describe('load_snapshot Tool', () => {
    it('should load snapshot by ID', async () => {
      const saveResult = await server.callTool('save_snapshot', {
        summary: 'Test for loading',
        context: 'Load test context',
      });

      const idMatch = saveResult.content[0].text.match(/#(\d+)/);
      const id = parseInt(idMatch![1]);

      const loadResult = await server.callTool('load_snapshot', { id });

      expect(loadResult.content[0].text).toContain('Resuming: Test for loading');
      expect(loadResult.content[0].text).toContain('Load test context');
    });

    it('should load snapshot by name', async () => {
      await server.callTool('save_snapshot', {
        name: 'load-by-name',
        summary: 'Named snapshot',
        context: 'Named context',
      });

      const loadResult = await server.callTool('load_snapshot', {
        name: 'load-by-name',
      });

      expect(loadResult.content[0].text).toContain('Resuming: Named snapshot');
    });

    it('should load latest snapshot when no parameters', async () => {
      await server.callTool('save_snapshot', {
        summary: 'First',
        context: 'Context 1',
      });
      await server.callTool('save_snapshot', {
        summary: 'Latest',
        context: 'Context 2',
      });

      const loadResult = await server.callTool('load_snapshot', {});

      expect(loadResult.content[0].text).toContain('Resuming: Latest');
    });

    it('should return error for non-existent ID', async () => {
      const result = await server.callTool('load_snapshot', { id: 99999 });

      expect(result.content[0].text).toContain('Error:');
      expect(result.content[0].text).toContain('not found');
    });

    it('should return error for non-existent name', async () => {
      const result = await server.callTool('load_snapshot', {
        name: 'non-existent',
      });

      expect(result.content[0].text).toContain('Error:');
      expect(result.content[0].text).toContain('not found');
    });

    it('should return error when no snapshots exist', async () => {
      const result = await server.callTool('load_snapshot', {});

      expect(result.content[0].text).toContain('Error:');
      expect(result.content[0].text).toContain('No snapshots found');
    });

    it('should include next_steps in continuation prompt', async () => {
      await server.callTool('save_snapshot', {
        summary: 'With next steps',
        context: 'Some context',
        next_steps: 'Complete testing phase',
      });

      const loadResult = await server.callTool('load_snapshot', {});

      expect(loadResult.content[0].text).toContain('Next:');
      expect(loadResult.content[0].text).toContain('Complete testing phase');
    });
  });

  describe('list_snapshots Tool', () => {
    beforeEach(async () => {
      for (let i = 1; i <= 5; i++) {
        await server.callTool('save_snapshot', {
          summary: `Snapshot ${i}`,
          context: `Context ${i}`,
        });
      }
    });

    it('should list all snapshots', async () => {
      const result = await server.callTool('list_snapshots', {});

      expect(result.content[0].text).toContain('Snapshot 5');
      expect(result.content[0].text).toContain('Snapshot 1');

      const lines = result.content[0].text.split('\n');
      expect(lines).toHaveLength(5);
    });

    it('should respect limit parameter', async () => {
      const result = await server.callTool('list_snapshots', { limit: 3 });

      const lines = result.content[0].text.split('\n');
      expect(lines).toHaveLength(3);
    });

    it('should show snapshots in reverse chronological order', async () => {
      const result = await server.callTool('list_snapshots', {});

      const lines = result.content[0].text.split('\n');
      expect(lines[0]).toContain('Snapshot 5');
      expect(lines[4]).toContain('Snapshot 1');
    });

    it('should include snapshot names in listing', async () => {
      await server.callTool('save_snapshot', {
        name: 'important',
        summary: 'Important snapshot',
        context: 'Important context',
      });

      const result = await server.callTool('list_snapshots', {});

      expect(result.content[0].text).toContain('(important)');
    });

    it('should return message when no snapshots exist', async () => {
      const emptyServer = new TestableSnapshotMCPServer(':memory:');
      const result = await emptyServer.callTool('list_snapshots', {});

      expect(result.content[0].text).toBe('No snapshots found.');

      emptyServer.close();
    });
  });

  describe('delete_snapshot Tool', () => {
    it('should delete snapshot by ID', async () => {
      const saveResult = await server.callTool('save_snapshot', {
        summary: 'To be deleted',
        context: 'Delete test',
      });

      const idMatch = saveResult.content[0].text.match(/#(\d+)/);
      const id = parseInt(idMatch![1]);

      const deleteResult = await server.callTool('delete_snapshot', { id });

      expect(deleteResult.content[0].text).toBe(`Deleted snapshot #${id}`);

      // Verify deletion
      const loadResult = await server.callTool('load_snapshot', { id });
      expect(loadResult.content[0].text).toContain('Error:');
    });

    it('should return error for non-existent ID', async () => {
      const result = await server.callTool('delete_snapshot', { id: 99999 });

      expect(result.content[0].text).toContain('Error:');
      expect(result.content[0].text).toContain('not found');
    });

    it('should require id parameter', async () => {
      const result = await server.callTool('delete_snapshot', {});

      expect(result.content[0].text).toContain('Error:');
      expect(result.content[0].text).toContain('id is required');
    });
  });

  describe('Code-Exec Style Workflow', () => {
    /**
     * This test simulates a code-execution workflow where a script chains
     * multiple MCP tool calls together. This is typical in automated coding
     * sessions where snapshots are saved, listed, and loaded programmatically.
     */
    it('should support chained workflow: save → list → load latest', async () => {
      // Step 1: Save initial snapshot
      const save1 = await server.callTool('save_snapshot', {
        name: 'session-start',
        summary: 'Started new feature development',
        context: {
          files: ['src/feature.ts'],
          decisions: ['Use TypeScript', 'Add unit tests'],
        },
        next_steps: 'Implement core logic',
      });

      expect(save1.content[0].text).toContain('Saved snapshot');
      expect(save1.content[0].text).toContain('session-start');

      // Step 2: Save progress snapshot
      const save2 = await server.callTool('save_snapshot', {
        summary: 'Core logic implemented',
        context: {
          files: ['src/feature.ts', 'src/feature.test.ts'],
          decisions: ['Added error handling', 'Used async/await pattern'],
          code_state: { tests_passing: true, coverage: 85 },
        },
        next_steps: 'Add integration tests',
      });

      expect(save2.content[0].text).toContain('Saved snapshot');

      // Step 3: List snapshots to verify both exist
      const list = await server.callTool('list_snapshots', {});
      const lines = list.content[0].text.split('\n');

      expect(lines).toHaveLength(2);
      expect(list.content[0].text).toContain('session-start');
      expect(list.content[0].text).toContain('Core logic implemented');

      // Step 4: Load latest snapshot to resume work
      const load = await server.callTool('load_snapshot', {});

      expect(load.content[0].text).toContain('Resuming: Core logic implemented');
      expect(load.content[0].text).toContain('Files:');
      expect(load.content[0].text).toContain('src/feature.ts');
      expect(load.content[0].text).toContain('src/feature.test.ts');
      expect(load.content[0].text).toContain('Next:');
      expect(load.content[0].text).toContain('Add integration tests');

      // Step 5: Save final snapshot
      const save3 = await server.callTool('save_snapshot', {
        name: 'feature-complete',
        summary: 'Feature complete and tested',
        context: {
          files: ['src/feature.ts', 'src/feature.test.ts', 'tests/integration.test.ts'],
          decisions: ['All tests passing', 'Ready for PR'],
          code_state: { tests_passing: true, coverage: 95 },
        },
      });

      expect(save3.content[0].text).toContain('feature-complete');

      // Step 6: Load by name to verify milestone
      const loadByName = await server.callTool('load_snapshot', {
        name: 'feature-complete',
      });

      expect(loadByName.content[0].text).toContain('Feature complete and tested');

      // Step 7: Clean up intermediate snapshot
      const idMatch = save2.content[0].text.match(/#(\d+)/);
      const id = parseInt(idMatch![1]);

      const deleteResult = await server.callTool('delete_snapshot', { id });
      expect(deleteResult.content[0].text).toContain('Deleted');

      // Step 8: Verify final state
      const finalList = await server.callTool('list_snapshots', {});
      const finalLines = finalList.content[0].text.split('\n');

      expect(finalLines).toHaveLength(2);
      expect(finalList.content[0].text).toContain('session-start');
      expect(finalList.content[0].text).toContain('feature-complete');
    });

    it('should support iterative development workflow', async () => {
      // Simulate iterative coding with frequent saves
      const iterations = [
        { summary: 'Setup project', context: 'Created initial files' },
        { summary: 'Added basic functionality', context: 'Implemented core feature' },
        { summary: 'Fixed bugs', context: 'Resolved edge cases' },
        { summary: 'Optimized performance', context: 'Reduced memory usage' },
        { summary: 'Added documentation', context: 'Wrote README and comments' },
      ];

      for (const iteration of iterations) {
        const result = await server.callTool('save_snapshot', iteration);
        expect(result.content[0].text).toContain('Saved snapshot');
      }

      // Load latest
      const latest = await server.callTool('load_snapshot', {});
      expect(latest.content[0].text).toContain('Added documentation');

      // List all iterations
      const list = await server.callTool('list_snapshots', {});
      const lines = list.content[0].text.split('\n');
      expect(lines).toHaveLength(5);
    });
  });
});
