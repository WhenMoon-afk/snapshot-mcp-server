# MCP Code-Execution Architecture

This document describes reference architectures for using the Snapshot MCP Server in code-execution environments where AI agents write and execute code that orchestrates MCP tools programmatically.

## Table of Contents

- [Overview](#overview)
- [Architecture Patterns](#architecture-patterns)
- [Generated Client Approach](#generated-client-approach)
- [Orchestration Patterns](#orchestration-patterns)
- [Platform Examples](#platform-examples)
- [Token Efficiency Considerations](#token-efficiency-considerations)
- [Best Practices](#best-practices)

## Overview

### What is Code-Execution?

Code-execution environments allow AI agents to:
1. Write code (TypeScript, Python, etc.) to solve problems
2. Execute that code in a sandboxed environment
3. Use MCP tools via generated clients instead of chat-based tool calling
4. Orchestrate complex workflows with programming constructs

**Key difference from chat-based tool calling:**
- **Chat-based:** Agent requests tool call → Host executes → Returns result → Agent continues chat
- **Code-execution:** Agent writes code → Code calls generated client → Direct MCP communication → Results in code

### Benefits for Snapshot Server

**Reduced token overhead:**
- No repeated tool schema descriptions in chat
- Code orchestrates multiple operations without chat round-trips
- Structured data handled natively in code

**Better workflows:**
- Complex snapshot management (batch operations, conditional logic)
- Integration with other APIs and services
- Local state management across multiple tool calls
- Error handling and retry logic in code

**Example scenario:**
```typescript
// Agent writes this code instead of multiple chat messages:
const snapshot = await snapshotClient.saveSnapshot({
  summary: "Feature complete",
  context: {
    files: changedFiles,
    tests_passing: await runTests(),
    decisions: ["Used JWT for auth"]
  }
});

if (snapshot.id) {
  await notifyTeam(`Snapshot ${snapshot.id} saved`);
}
```

## Architecture Patterns

### Pattern 1: Generated TypeScript Client

**Architecture:**
```
┌─────────────────────────────────────────────────┐
│  Code-Execution Environment (VM/Sandbox)        │
│                                                  │
│  ┌────────────────────────────────────────┐    │
│  │  Agent-Written Code                    │    │
│  │  ┌──────────────────────────────────┐  │    │
│  │  │ import { SnapshotClient }        │  │    │
│  │  │ from '@mcp/snapshot-client'      │  │    │
│  │  │                                  │  │    │
│  │  │ const client = new SnapshotClient()│ │    │
│  │  │ await client.saveSnapshot(...)   │  │    │
│  │  └──────────────────────────────────┘  │    │
│  └─────────────────┬──────────────────────┘    │
│                    │                             │
│  ┌─────────────────▼──────────────────────┐    │
│  │  Generated MCP Client                   │    │
│  │  ┌──────────────────────────────────┐  │    │
│  │  │ class SnapshotClient {           │  │    │
│  │  │   async saveSnapshot(args) {     │  │    │
│  │  │     return mcpHost.callTool(     │  │    │
│  │  │       'save_snapshot', args)     │  │    │
│  │  │   }                              │  │    │
│  │  │ }                                │  │    │
│  │  └──────────────────────────────────┘  │    │
│  └─────────────────┬──────────────────────┘    │
└────────────────────┼──────────────────────────┘
                     │ MCP Protocol (stdio/http)
                     │
┌────────────────────▼──────────────────────────┐
│  Snapshot MCP Server                          │
│  ┌──────────────────────────────────────────┐ │
│  │  Tool Handlers                           │ │
│  │  - save_snapshot                         │ │
│  │  - load_snapshot                         │ │
│  │  - list_snapshots                        │ │
│  │  - delete_snapshot                       │ │
│  └──────────────────┬───────────────────────┘ │
│                     │                          │
│  ┌──────────────────▼───────────────────────┐ │
│  │  SQLite Database                         │ │
│  │  ~/.claude-snapshots/snapshots.db        │ │
│  └──────────────────────────────────────────┘ │
└───────────────────────────────────────────────┘
```

**Key components:**
1. **Agent-written code:** TypeScript/JavaScript code that imports and uses the client
2. **Generated client:** Auto-generated from MCP tool schemas
3. **MCP host/transport:** Platform-provided MCP communication layer
4. **Snapshot MCP server:** This package (stdio transport)

### Pattern 2: Direct MCP Host API

**Architecture:**
```typescript
// Agent writes code using platform's MCP host directly:
const result = await mcpHost.callTool('snapshot', 'save_snapshot', {
  summary: "Milestone complete",
  context: { files: ["src/auth.ts"] }
});
```

**Simpler but less type-safe:**
- No generated client layer
- Tool names and parameters as strings
- No TypeScript IntelliSense
- More prone to runtime errors

**When to use:**
- Quick scripts and prototypes
- Platform doesn't support client generation
- Minimal overhead preferred

## Generated Client Approach

### Client Generation from MCP Schemas

**Input:** MCP tool schemas (JSON Schema format)

**Example schema (save_snapshot):**
```json
{
  "name": "save_snapshot",
  "description": "Save conversation state for later resumption",
  "inputSchema": {
    "type": "object",
    "required": ["summary", "context"],
    "properties": {
      "summary": {
        "type": "string",
        "description": "Brief description of conversation state"
      },
      "context": {
        "oneOf": [
          { "type": "string" },
          {
            "type": "object",
            "properties": {
              "files": { "type": "array", "items": { "type": "string" } },
              "decisions": { "type": "array", "items": { "type": "string" } }
            }
          }
        ]
      }
    }
  }
}
```

**Generated TypeScript client:**
```typescript
// Auto-generated from schema
export interface SaveSnapshotInput {
  summary: string;
  context: string | {
    files?: string[];
    decisions?: string[];
    blockers?: string[];
    code_state?: Record<string, any>;
    [key: string]: any;
  };
  name?: string;
  next_steps?: string;
}

export interface SnapshotResult {
  id: number;
  created_at: string;
}

export class SnapshotClient {
  constructor(private mcpHost: MCPHost) {}

  /**
   * Save conversation state for later resumption.
   *
   * @param input - Snapshot parameters
   * @returns Snapshot ID and timestamp
   */
  async saveSnapshot(input: SaveSnapshotInput): Promise<SnapshotResult> {
    const result = await this.mcpHost.callTool('save_snapshot', input);
    return this.parseResult(result);
  }

  /**
   * Load snapshot by ID, name, or latest.
   *
   * @param input - Optional ID or name filter
   * @returns Continuation prompt with snapshot context
   */
  async loadSnapshot(input?: { id?: number; name?: string }): Promise<string> {
    const result = await this.mcpHost.callTool('load_snapshot', input || {});
    return this.parseResult(result);
  }

  /**
   * List all snapshots with optional limit.
   *
   * @param input - Optional limit (default: 100)
   * @returns List of snapshots
   */
  async listSnapshots(input?: { limit?: number }): Promise<string> {
    const result = await this.mcpHost.callTool('list_snapshots', input || {});
    return this.parseResult(result);
  }

  /**
   * Delete snapshot by ID.
   *
   * @param input - Snapshot ID to delete
   * @returns Deletion confirmation
   */
  async deleteSnapshot(input: { id: number }): Promise<string> {
    const result = await this.mcpHost.callTool('delete_snapshot', input);
    return this.parseResult(result);
  }

  private parseResult(result: MCPToolResult): any {
    // Parse MCP text content format or throw errors
    if (result.isError) {
      throw new Error(result.content[0].text);
    }
    return result.content[0].text;
  }
}
```

### Schema Stability Guarantees

**Phase 5 schema stability tests** ensure:
- Tool count remains stable (4 tools)
- Tool names don't change
- Schema structures are backward compatible
- Generated clients won't break between versions

**CI enforcement:**
```typescript
// Phase 5 test (src/index.test.ts)
test('should have stable tool count (4 tools)', () => {
  expect(server.tools).toHaveLength(4);
});

test('should have stable save_snapshot schema', () => {
  const tool = server.tools.find(t => t.name === 'save_snapshot');
  expect(tool.inputSchema).toEqual(expectedSchema); // Deep equality
});
```

**Versioning policy:**
- Breaking schema changes require major version bump
- Adding optional fields is non-breaking (minor version)
- CI fails if schemas change unexpectedly

## Orchestration Patterns

### Pattern 1: Save-Execute-Verify

**Use case:** Save snapshot after completing a task with verification

```typescript
// Agent writes code to orchestrate workflow
async function completeFeature() {
  // 1. Run tests to verify feature
  const testResults = await runTests();

  // 2. Get list of changed files
  const changedFiles = await git.diff('--name-only', 'HEAD');

  // 3. Save snapshot only if tests pass
  if (testResults.passing) {
    const snapshot = await snapshotClient.saveSnapshot({
      summary: `Feature: ${featureName} complete`,
      context: {
        files: changedFiles.split('\n'),
        decisions: [
          "Used React hooks for state management",
          "Chose Zustand over Redux for simplicity"
        ],
        code_state: {
          tests_passing: true,
          coverage: testResults.coverage
        }
      },
      name: `feature-${featureName}`,
      next_steps: "Deploy to staging and monitor metrics"
    });

    console.log(`Snapshot ${snapshot.id} saved`);
    return snapshot;
  } else {
    console.error('Tests failed, snapshot not saved');
    throw new Error('Tests must pass before saving snapshot');
  }
}
```

**Benefits:**
- Complex conditional logic in code (not chat)
- Multiple tool calls without token overhead
- Error handling and validation
- Integration with external tools (git, testing frameworks)

### Pattern 2: Batch Snapshot Management

**Use case:** Clean up old snapshots while preserving important milestones

```typescript
async function cleanupSnapshots() {
  // 1. List all snapshots
  const listResult = await snapshotClient.listSnapshots({ limit: 1000 });
  const snapshots = parseSnapshotList(listResult);

  // 2. Filter snapshots to delete (older than 30 days, unnamed)
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const toDelete = snapshots.filter(s =>
    !s.name && // Unnamed (not a milestone)
    new Date(s.created_at).getTime() < thirtyDaysAgo
  );

  // 3. Delete in batch
  console.log(`Deleting ${toDelete.length} old snapshots...`);
  for (const snapshot of toDelete) {
    await snapshotClient.deleteSnapshot({ id: snapshot.id });
    console.log(`Deleted snapshot ${snapshot.id}`);
  }

  console.log('Cleanup complete');
}
```

**Benefits:**
- Batch operations without chat round-trips
- Complex filtering logic
- Progress reporting
- Error recovery (continue on individual failures)

### Pattern 3: Snapshot-Driven State Machine

**Use case:** Multi-session project with state transitions

```typescript
enum ProjectState {
  Planning = 'planning',
  Implementation = 'implementation',
  Testing = 'testing',
  Review = 'review',
  Complete = 'complete'
}

async function transitionProjectState(newState: ProjectState) {
  // 1. Load current snapshot to get state
  const currentSnapshot = await snapshotClient.loadSnapshot();
  const currentState = parseCurrentState(currentSnapshot);

  // 2. Validate state transition
  if (!isValidTransition(currentState.state, newState)) {
    throw new Error(`Invalid transition: ${currentState.state} → ${newState}`);
  }

  // 3. Save new snapshot with updated state
  const snapshot = await snapshotClient.saveSnapshot({
    summary: `Project state: ${currentState.state} → ${newState}`,
    context: {
      ...currentState.context,
      state: newState,
      transitioned_at: new Date().toISOString()
    },
    next_steps: getNextStepsForState(newState)
  });

  console.log(`Transitioned to ${newState}, snapshot ${snapshot.id}`);
  return snapshot;
}
```

**Benefits:**
- State machine logic in code
- Validation and business rules
- Audit trail via snapshots
- Resumable multi-session workflows

### Pattern 4: Integration with External APIs

**Use case:** Save snapshot after external API operations

```typescript
async function deployAndSnapshot(environment: 'staging' | 'production') {
  // 1. Deploy to cloud platform
  const deployment = await cloudAPI.deploy({
    environment,
    version: await git.getCurrentCommit()
  });

  // 2. Wait for health checks
  await deployment.waitForHealthy();

  // 3. Save snapshot with deployment info
  const snapshot = await snapshotClient.saveSnapshot({
    summary: `Deployed to ${environment}`,
    context: {
      files: await git.diff('--name-only', 'HEAD~1', 'HEAD'),
      decisions: [`Deployed version ${deployment.version}`],
      code_state: {
        deployment_id: deployment.id,
        environment,
        deployed_at: deployment.created_at,
        health_status: 'healthy'
      }
    },
    name: `deploy-${environment}-${deployment.version}`,
    next_steps: environment === 'staging'
      ? 'Monitor staging metrics, then deploy to production'
      : 'Monitor production metrics and user feedback'
  });

  console.log(`Deployment ${deployment.id} complete, snapshot ${snapshot.id}`);
  return { deployment, snapshot };
}
```

**Benefits:**
- Coordinates multiple external services
- Captures deployment state in snapshots
- Resumable deployment workflows
- Audit trail for compliance

## Platform Examples

**Note:** These are reference examples. The Snapshot MCP Server is vendor-neutral and works with any platform that supports MCP.

### Example 1: Claude Code on Web

**Platform characteristics:**
- Anthropic-managed VM environment
- MCP host provided automatically
- Sandboxed code execution
- No user configuration needed

**Usage pattern:**
```typescript
// Platform provides mcpHost automatically
import { getSnapshotClient } from '@mcp/snapshot';

const client = getSnapshotClient();

// Agent writes code during coding session
await client.saveSnapshot({
  summary: "Implemented user authentication",
  context: {
    files: ["src/auth/login.ts", "src/auth/register.ts"],
    tests_passing: true
  }
});
```

**Platform handles:**
- MCP server lifecycle (start/stop)
- Transport configuration (stdio)
- Database path configuration
- Sandboxing and isolation

### Example 2: Custom MCP Host

**Platform characteristics:**
- Self-hosted environment
- Custom MCP host implementation
- User manages configuration

**Configuration:**
```typescript
// User configures MCP host
const mcpHost = new MCPHost({
  servers: {
    snapshot: {
      command: 'node',
      args: ['/path/to/snapshot-mcp-server/dist/index.js'],
      env: {
        SNAPSHOT_DB_PATH: '/path/to/snapshots.db'
      }
    }
  }
});

// Initialize connection
await mcpHost.connect('snapshot');

// Generate client
const client = new SnapshotClient(mcpHost);

// Agent code uses client
await client.saveSnapshot({...});
```

**User responsibilities:**
- Install and build Snapshot MCP Server
- Configure MCP host
- Manage database location and backups
- Handle server lifecycle

### Example 3: Enterprise Platform with Zero Trust

**Platform characteristics:**
- Multi-user environment
- Centralized authentication
- Platform-provided security boundary

**Architecture:**
```
┌─────────────────────────────────────────────┐
│  Enterprise AI Platform                     │
│  ┌───────────────────────────────────────┐  │
│  │  Platform Security Layer              │  │
│  │  - User authentication (SSO/OAuth)    │  │
│  │  - Authorization policies             │  │
│  │  - Audit logging                      │  │
│  │  - Network isolation                  │  │
│  └───────────────┬───────────────────────┘  │
│                  │                           │
│  ┌───────────────▼───────────────────────┐  │
│  │  Agent Code Execution Sandbox         │  │
│  │  ┌─────────────────────────────────┐  │  │
│  │  │ const client = getSnapshotClient()│ │  │
│  │  │ await client.saveSnapshot(...)   │  │  │
│  │  └─────────────────────────────────┘  │  │
│  └───────────────┬───────────────────────┘  │
│                  │                           │
│  ┌───────────────▼───────────────────────┐  │
│  │  Platform MCP Host                    │  │
│  │  - Per-user database isolation        │  │
│  │  - Resource quotas                    │  │
│  │  - Usage monitoring                   │  │
│  └───────────────┬───────────────────────┘  │
└──────────────────┼─────────────────────────┘
                   │
┌──────────────────▼─────────────────────────┐
│  Snapshot MCP Server (per-user instances)  │
│  - Isolated databases                      │
│  - Platform-managed lifecycle              │
└────────────────────────────────────────────┘
```

**Platform responsibilities:**
- User authentication and authorization
- Per-user database isolation
- Audit logging and compliance
- Resource management and quotas

**Snapshot server role:**
- Provide snapshot functionality
- Operate within platform security boundary
- No auth logic needed (platform handles it)

## Token Efficiency Considerations

### Chat vs Code-Execution Token Usage

**Chat-based workflow:**
```
User: Save a snapshot with summary "Feature complete" and context...
Assistant: [Uses save_snapshot tool]
[Tool schema included in context: ~200 tokens]
[Tool execution and response: ~50 tokens]
[Assistant response: ~50 tokens]
Total: ~300 tokens per tool call
```

**Code-execution workflow:**
```typescript
// Agent writes code (one-time overhead):
const snapshot = await client.saveSnapshot({
  summary: "Feature complete",
  context: { files: ["auth.ts"], tests_passing: true }
});
// Schema loaded once during client generation: ~200 tokens
// Each subsequent call: ~10 tokens (just parameters)
// Multiple calls in same code block: No repeated schema overhead
```

**Token savings:**
- **First call:** Similar overhead (schema + parameters)
- **Subsequent calls:** ~95% reduction (no repeated schema)
- **Complex workflows:** 70-90% reduction (batch operations, loops)

### Continuation Prompt Efficiency

**The Snapshot MCP Server already optimizes continuation prompts:**
- Pre-generated prompts stored in database (Phase 3 optimization)
- ~20-30% reduction vs raw context
- Code-execution benefits from same optimization

**Example:**
```typescript
// Load snapshot in code
const continuationPrompt = await client.loadSnapshot({ name: 'feature-x' });

// Use prompt in next chat message (if needed)
// Or extract context data programmatically
const context = parseContext(continuationPrompt);
```

## Best Practices

### 1. Use Type-Safe Generated Clients

**Recommended:**
```typescript
// Type-safe, IntelliSense support
await client.saveSnapshot({
  summary: "Feature complete",
  context: { files: ["auth.ts"] } // TypeScript validates structure
});
```

**Avoid:**
```typescript
// Stringly-typed, error-prone
await mcpHost.callTool('save_snapshot', {
  summery: "Feature complete", // Typo not caught
  contxt: { files: ["auth.ts"] }
});
```

### 2. Implement Error Handling

```typescript
try {
  await client.saveSnapshot({ summary, context });
} catch (error) {
  // Parse MCP error codes (Phase 4 error infrastructure)
  if (error.code === 'validation_error') {
    console.error('Invalid input:', error.details);
  } else if (error.code === 'database_error') {
    console.error('Database error, retrying...');
    await retry(() => client.saveSnapshot({ summary, context }));
  } else {
    throw error; // Unexpected error
  }
}
```

### 3. Orchestrate Complex Workflows

```typescript
// Good: Orchestrate multiple operations in code
async function completeAndDeploy() {
  // Run tests
  const tests = await runTests();
  if (!tests.passing) throw new Error('Tests failed');

  // Save snapshot
  const snapshot = await snapshotClient.saveSnapshot({
    summary: "Tests passing, ready to deploy",
    context: { tests_passing: true, coverage: tests.coverage }
  });

  // Deploy
  await deploy();

  // Update snapshot with deployment info
  await snapshotClient.saveSnapshot({
    summary: "Deployed to production",
    context: { deployment_id: deployment.id }
  });
}

// Avoid: Multiple chat messages for same workflow
```

### 4. Leverage Schema Stability

```typescript
// Generated clients are stable across versions
// No breaking changes without major version bump
const client = new SnapshotClient(mcpHost);

// Safe to use in long-running automation
await client.saveSnapshot({...}); // Won't break in v1.x.x
```

### 5. Combine with Other MCP Tools

```typescript
// Snapshot works well with other MCP tools
const files = await filesystemClient.readFiles(['src/**/*.ts']);
const memory = await memoryClient.recall({ query: 'authentication' });

await snapshotClient.saveSnapshot({
  summary: "Context from multiple sources",
  context: {
    files: files.map(f => f.path),
    decisions: memory.decisions
  }
});
```

## Summary

**Code-execution environments enable:**
- Generated TypeScript clients from MCP schemas
- Complex orchestration without chat overhead
- Token-efficient multi-tool workflows
- Integration with external APIs and services

**The Snapshot MCP Server is designed for code-execution:**
- Stable schemas (Phase 5 CI enforcement)
- Structured context (flexible objects, not just strings)
- Token-efficient continuation prompts (Phase 3 optimization)
- Clear error codes (Phase 4 infrastructure)

**Vendor-neutral approach:**
- Works with any MCP host implementation
- No platform lock-in
- Standard MCP protocol (stdio transport)
- User controls deployment and configuration

**Next steps:**
- Platform providers: Generate clients from tool schemas
- Developers: Orchestrate workflows in code
- Contributors: Maintain schema stability via CI

---

**For authentication and authorization in multi-user environments, see:**
- [MCP Authorization Options](mcp-authorization-options.md)
- [SECURITY.md](../SECURITY.md)
