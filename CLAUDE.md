# Claude Code Development Guide

This document provides guidelines for AI-assisted development on the Snapshot MCP Server project using Claude Code or similar tools.

## Environment Expectations

### Node.js Version
- **Minimum Required:** Node.js 18+
- **Tested Versions:** v18.x, v20.x, v22.x
- **Current VM:** v22.21.1
- **Check Version:** `node --version`

### Operating System
- **Supported Platforms:** macOS, Windows, Linux
- **VM Environment:** Linux 4.4.0 (Claude Code on Web)
- **File Paths:** Use platform-specific paths (see database.ts and install.js)

### Dependencies
- **Package Manager:** npm (included with Node.js)
- **TypeScript:** v5.7.2 (devDependency)
- **MCP SDK:** @modelcontextprotocol/sdk v1.0.4
- **Database:** better-sqlite3 v11.8.1

## Standard Commands

### Installation
```bash
# Install all dependencies
npm install

# Dependencies are installed to node_modules/
# Automatically runs prepare script (npm run build)
```

### Build
```bash
# Compile TypeScript to JavaScript
npm run build

# Output directory: dist/
# Generated files: *.js, *.d.ts, *.js.map, *.d.ts.map
```

### Watch Mode (Development)
```bash
# Auto-recompile on file changes
npm run watch

# Useful for active development
```

### Testing (Future)
```bash
# Run tests (not yet implemented)
npm test

# See Phase 6 in projectplan.md for testing roadmap
```

### Install Snapshot Server (Local Testing)
```bash
# Run installer to configure Claude Desktop
node install.js

# Or via npx (published package)
npx @whenmoon-afk/snapshot-mcp-server
```

## Project Structure

```
snapshot-mcp-server/
├── .claude-phases/          # AI development phases and documentation
│   ├── projectplan.md       # 8-phase roadmap and architecture
│   ├── phase1summary.md     # Phase 1 completion summary
│   ├── phase1verification.json
│   └── phase1issues.md      # Open questions and considerations
├── src/                     # TypeScript source files
│   ├── index.ts            # MCP server implementation
│   └── database.ts         # SQLite database layer
├── dist/                    # Compiled JavaScript (generated)
├── install.js              # Installer script (npx entry point)
├── package.json            # Project metadata and dependencies
├── tsconfig.json           # TypeScript compiler configuration
├── README.md               # User-facing documentation
├── CHANGELOG.md            # Version history
└── CLAUDE.md               # This file
```

## .claude-phases Conventions

### Purpose
The `.claude-phases/` directory contains AI-assisted development documentation:
- **Project Plan:** Overall architecture and phase roadmap
- **Phase Summaries:** Completion reports for each phase
- **Verification Files:** Pass/fail checklists for phase objectives
- **Issues Tracking:** Open questions and design considerations

### Phase Workflow
1. **Plan:** Review projectplan.md for current phase objectives
2. **Execute:** Complete phase tasks on dedicated branch
3. **Document:** Create phase summary and verification files
4. **Commit:** Push phase branch for human PR review
5. **Review:** Human reviews and merges PR
6. **Next:** Start next phase from updated main

### Documentation Files
- **projectplan.md:** Master plan (updated as needed)
- **phase{N}summary.md:** What was accomplished in phase N
- **phase{N}verification.json:** Pass/fail checklist for phase N
- **phase{N}issues.md:** Open questions identified in phase N

## Git and PR Workflow

### Branch Naming Convention
```
claude/phase-{number}-{description}

Examples:
- claude/phase-1-baseline
- claude/phase-2-sqlite-durability
- claude/phase-4-auth-positioning
```

### Development Workflow

1. **Start Phase:**
   ```bash
   # Ensure on main branch with latest changes
   git checkout main
   git pull origin main

   # Create phase branch
   git checkout -b claude/phase-2-sqlite-durability
   ```

2. **Develop:**
   ```bash
   # Make changes, test, iterate
   npm run build
   node install.js  # Test installer

   # Commit frequently with clear messages
   git add .
   git commit -m "Phase 2: Add WAL mode configuration"
   ```

3. **Push:**
   ```bash
   # Push to remote (with retry on network failure)
   git push -u origin claude/phase-2-sqlite-durability

   # If push fails with network error, retry up to 4 times
   # with exponential backoff: 2s, 4s, 8s, 16s
   ```

4. **Pull Request (Human Action):**
   - Human creates PR on GitHub
   - Human reviews .claude-phases documentation
   - Human reviews code changes
   - Human merges PR after approval

### VM Restrictions

**NEVER in VM Environment:**
- ❌ Merge branches to main
- ❌ Push directly to main branch
- ❌ Delete remote branches
- ❌ Force push (unless explicitly requested)

**ALWAYS in VM Environment:**
- ✅ Push to phase-specific branches
- ✅ Create clear commit messages
- ✅ Update .claude-phases documentation
- ✅ Run build and validation before pushing

### Commit Message Guidelines

**Format:**
```
Phase {N}: {Clear description of change}

Examples:
- Phase 1: baseline analysis and project scaffolding
- Phase 2: add WAL mode configuration with durability analysis
- Phase 3: optimize continuation prompt format for token efficiency
- Phase 6: add Jest test framework with 80% coverage
```

**Best Practices:**
- Start with phase number for easy tracking
- Use imperative mood ("add" not "added")
- Be specific about what changed
- Reference issues or design decisions if applicable

## Code Style and Conventions

### TypeScript
- **Target:** ES2022
- **Module:** Node16 (ESM)
- **Strict Mode:** Enabled
- **Style:** Follow existing patterns in codebase

### Naming
- **Classes:** PascalCase (SnapshotMCPServer, SnapshotDatabase)
- **Methods:** camelCase (saveSnapshot, getLatestSnapshot)
- **Constants:** UPPER_SNAKE_CASE (DB_PATH)
- **Interfaces:** PascalCase with I prefix or descriptive name (Snapshot, SaveSnapshotInput)

### Error Handling
- Use try-catch blocks in MCP request handlers
- Return errors in MCP text content format
- Include descriptive error messages for users
- Validate inputs before processing

### Comments
- Add JSDoc comments for public APIs
- Explain non-obvious logic
- Document assumptions and trade-offs
- Keep comments up-to-date with code changes

## Testing Guidelines (Phase 6)

### Test Framework (Future)
- **Planned:** Jest or Vitest
- **Coverage Target:** >80%
- **Test Types:** Unit, integration, E2E

### Test Structure (Future)
```typescript
describe('SnapshotDatabase', () => {
  describe('saveSnapshot', () => {
    it('should save snapshot with string context', () => {
      // Test implementation
    });

    it('should save snapshot with structured context', () => {
      // Test implementation
    });
  });
});
```

### Running Tests (Future)
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## Debugging

### MCP Server Debugging
```bash
# Run server directly (stdio)
node dist/index.js

# Check database path
echo $SNAPSHOT_DB_PATH

# Inspect database
sqlite3 ~/.claude-snapshots/snapshots.db
.schema
SELECT * FROM snapshots;
```

### Common Issues

**Build Errors:**
- Check TypeScript version: `npx tsc --version`
- Clear dist/ and rebuild: `rm -rf dist && npm run build`
- Verify Node.js version: `node --version`

**Installer Issues:**
- Check Claude Desktop config path (platform-specific)
- Verify node path in config (should be absolute)
- Check database directory permissions

**Database Issues:**
- Verify SNAPSHOT_DB_PATH environment variable
- Check file permissions on database directory
- Inspect schema with sqlite3 command-line tool

## Performance Considerations

### SQLite Optimization (Phase 2)
- **WAL Mode:** Consider enabling for better concurrency
- **Synchronous:** Evaluate NORMAL vs FULL for durability trade-offs
- **Indexes:** Already optimized (created_at, name)

### Token Efficiency (Phase 3)
- **Current:** 20-30% reduction vs raw context (v1.1.0)
- **Optimization:** Pre-generated continuation prompts
- **Future:** Consider format tweaks, compression for large contexts

### Build Performance
- **Watch Mode:** Use for active development
- **Incremental:** TypeScript compiles only changed files
- **Source Maps:** Enabled for debugging (disable for production)

## Security Best Practices

### Current Model (Local Desktop)
- SQLite database stored locally (user-writable directory)
- No network exposure (stdio transport only)
- No authentication required (trusted environment)
- Standard filesystem permissions apply

### Future OAuth 2.1 (Phase 4 Design)
- Resource server architecture (external auth server)
- Token validation middleware
- PKCE for all clients
- Resource indicators (RFC 8707)
- Protected resource metadata (RFC 9728)

### Data Privacy
- User context data stored locally
- No telemetry or analytics (unless explicitly added)
- No cloud sync (unless explicitly added)
- User controls data location via SNAPSHOT_DB_PATH

## Contributing Guidelines

### Before Starting Work
1. Review .claude-phases/projectplan.md for current phase
2. Check phase{N}issues.md for open questions
3. Understand architecture in projectplan.md

### During Development
1. Follow existing code patterns and style
2. Add comments for non-obvious logic
3. Update documentation for user-facing changes
4. Test locally before committing

### Before Pushing
1. Run `npm run build` to verify compilation
2. Check for TypeScript errors
3. Update .claude-phases documentation
4. Create phase summary and verification files
5. Write clear commit messages

### After Pushing
1. Human creates PR on GitHub
2. Human reviews changes
3. Human merges after approval
4. Continue with next phase from updated main

## Resources

### Documentation
- **README.md:** User-facing documentation
- **CHANGELOG.md:** Version history and release notes
- **.claude-phases/projectplan.md:** Architecture and roadmap
- **MCP Spec:** https://modelcontextprotocol.io/

### External References
- **TypeScript:** https://www.typescriptlang.org/docs/
- **better-sqlite3:** https://github.com/WiseLibs/better-sqlite3
- **MCP TypeScript SDK:** https://github.com/modelcontextprotocol/typescript-sdk
- **SQLite:** https://www.sqlite.org/docs.html

### Support
- **Issues:** https://github.com/WhenMoon-afk/snapshot-mcp-server/issues
- **Discussions:** GitHub Discussions (if enabled)
- **License:** MIT (see LICENSE file)

## Quick Reference

### Essential Commands
```bash
# Install dependencies
npm install

# Build project
npm run build

# Watch for changes
npm run watch

# Run installer
node install.js

# Check Node version
node --version

# Inspect database
sqlite3 ~/.claude-snapshots/snapshots.db
```

### Key Files
- **src/index.ts:** MCP server and tool handlers
- **src/database.ts:** SQLite operations and schema
- **install.js:** Installer for Claude Desktop config
- **.claude-phases/projectplan.md:** Architecture and roadmap

### Current Phase
- **Phase:** 1 (Baseline Analysis)
- **Status:** Complete
- **Next:** Phase 2 (SQLite Durability)
- **Branch:** claude/phase-1-baseline-011qKuoQL17BXJMqBAkjryxh

---

**Last Updated:** 2025-11-17 (Phase 1 Completion)
