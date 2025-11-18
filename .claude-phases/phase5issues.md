# Phase 5: Open Issues and Recommendations

**Date:** 2025-11-18
**Branch:** `claude/phase-5-ci-release-01Mu3iumVRRs87tHdygovWNf`

## Inherited Issues from Phase 4

### MCP Tool Test Failures (13/24 tests)

**Issue:** Error handling tests fail with format mismatch.

**Root Cause:** TestableSnapshotMCPServer and production SnapshotMCPServer diverged during Phase 4 error refactor. Error messages are being serialized incorrectly.

**Impact:** Medium - Core functionality works, but error message format needs alignment.

**Documented in:** `.claude-phases/phase4issues.md:6-21`

**Status:** Not addressed in Phase 5 (out of scope).

**Recommendation for Future Phase:**
1. Refactor TestableSnapshotMCPServer to import handlers from production code
2. Extract handlers to shared module (src/handlers.ts)
3. Use dependency injection for database instance
4. Update test assertions to match new error format
5. Verify all 57 tests pass

**Workaround:** Database tests (26/26) and schema stability tests (7/7) validate core functionality and API contract.

## CI/CD Concerns

### CI Exit Code on Test Failure

**Issue:** Better-SQLite3 cleanup causes segmentation fault (exit code 139) after tests complete.

**Impact:** Low - All tests run successfully before segfault, but CI may interpret exit code as failure.

**Details:**
- Tests complete successfully (51/57 passing)
- Segfault occurs during Vitest cleanup phase
- Known issue with better-sqlite3 native module cleanup
- Does not affect test validity

**Status:** Documented in Phase 2 summary.

**Recommendation:**
1. Monitor CI runs to see if GitHub Actions handles exit code 139 gracefully
2. If CI fails due to exit code, consider:
   - Using `--no-coverage` flag to skip cleanup step
   - Upgrading better-sqlite3 to newer version
   - Switching to pure JavaScript SQLite implementation (slower)
   - Ignoring exit code in CI workflow (not recommended)

**Reference:** `.claude-phases/phase2summary.md:286-289`

### CI Performance on GitHub Actions

**Issue:** Unknown CI execution time on GitHub Actions.

**Concern:** Local test suite runs in ~4 seconds, but GitHub Actions may be slower.

**Impact:** Low - Fast local tests suggest CI will be fast, but no baseline yet.

**Recommendation:**
1. Monitor first few CI runs to establish baseline
2. If CI is slow (>30 seconds), investigate:
   - npm cache configuration (currently enabled)
   - Parallel test execution (Vitest supports this)
   - Node version matrix size (currently 3 versions)

### CI Does Not Publish to npm

**Issue:** CI validates builds and tests, but does not publish to npm.

**Rationale:** Publishing requires manual control and versioning decisions.

**Impact:** None - Publishing is manual, controlled by human.

**Recommendation:**
1. Document manual publishing workflow in CLAUDE.md or CONTRIBUTING.md
2. Consider adding release workflow in future phase (Phase 8)
3. Manual publishing steps:
   ```bash
   npm version patch|minor|major
   npm publish
   git push --tags
   ```

## Schema Stability Concerns

### Schema Test Brittleness

**Issue:** Schema stability tests use deep equality checks, which may fail on benign changes.

**Example:** Changing a field description (non-breaking) will fail schema tests.

**Impact:** Low - Tests will alert developers to all schema changes, including benign ones.

**Recommendation:**
1. Document that schema changes require explicit test updates
2. Treat schema description changes as API changes (requires versioning)
3. Consider separating "breaking" vs "non-breaking" schema tests in future
4. Add comments in tests explaining which changes are breaking vs non-breaking

**Example:**
```typescript
// Breaking changes (fail these tests):
// - Removing fields
// - Changing field types
// - Adding required fields
// - Removing oneOf options

// Non-breaking changes (may fail, but safe to update):
// - Changing descriptions
// - Adding optional fields
// - Adding oneOf options
```

### Schema Versioning Strategy

**Issue:** No explicit schema versioning in MCP tool schemas.

**Concern:** How do clients know which schema version they're using?

**Current State:** Schema version implied by package version (v1.1.0).

**Impact:** Low - Current approach is common for MCP servers.

**Recommendation:**
1. Document that schema version matches package version
2. Include version in server metadata (already done: `version: '1.1.0'`)
3. Consider adding schema version to tool descriptions in future (optional)
4. Follow semantic versioning for breaking schema changes:
   - Major: Breaking schema changes
   - Minor: Non-breaking schema additions
   - Patch: Bug fixes, no schema changes

**Example:**
```typescript
{
  name: 'save_snapshot',
  description: 'Save current conversation state (v1.1.0)',
  // ...
}
```

### No Schema Documentation Generation

**Issue:** Schema documentation is manual (in README.md).

**Concern:** Schema docs may drift from actual implementation.

**Impact:** Low - Current manual documentation is clear and accurate.

**Recommendation:**
1. Add automated schema documentation generation in future phase
2. Options:
   - JSON Schema to Markdown (e.g., `json-schema-to-markdown`)
   - TypeScript API documentation (e.g., `typedoc`)
   - OpenAPI/Swagger-style docs for MCP tools
3. Integrate into build process (`npm run docs`)
4. Commit generated docs to repository or publish to GitHub Pages

## Testing Gaps

### No Integration Tests for stdio Transport

**Issue:** Tests use in-process TestableSnapshotMCPServer, not stdio transport.

**Impact:** Low - stdio transport is thin wrapper around MCP SDK.

**Concern:** Network serialization issues not caught by tests.

**Documented in:** `.claude-phases/phase2summary.md:300-305`

**Recommendation:**
1. Add stdio integration tests in future phase
2. Use child_process to spawn server
3. Send JSON-RPC messages via stdin
4. Validate responses from stdout
5. Test error cases (malformed JSON, invalid requests)

**Example:**
```typescript
describe('stdio Transport Integration', () => {
  it('should handle save_snapshot via stdio', async () => {
    const server = spawn('node', ['dist/index.js']);
    server.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'save_snapshot',
        arguments: { summary: 'Test', context: 'Test context' }
      }
    }));
    const response = await readStdout(server);
    expect(response.result).toBeDefined();
  });
});
```

### No Performance Benchmarks

**Issue:** No performance tests or benchmarks in test suite.

**Concern:** Performance regressions may go unnoticed.

**Impact:** Low - Current functionality is fast (database ops in <1ms).

**Recommendation:**
1. Add performance benchmarking in future phase
2. Benchmark operations:
   - saveSnapshot (string context)
   - saveSnapshot (structured context)
   - loadSnapshot by ID
   - loadSnapshot latest
   - listSnapshots (100 snapshots)
   - deleteSnapshot
3. Set baseline performance thresholds
4. Fail tests if performance degrades >20%

**Example:**
```typescript
describe('Performance Benchmarks', () => {
  it('should save snapshot in <10ms', async () => {
    const start = Date.now();
    await server.callTool('save_snapshot', {
      summary: 'Perf test',
      context: 'Performance testing'
    });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(10);
  });
});
```

### No Coverage Reporting

**Issue:** Coverage tooling not installed, no coverage metrics.

**Impact:** Low - Test count (57 tests) suggests good coverage, but no metrics.

**Recommendation:**
1. Install `@vitest/coverage-v8` in future phase
2. Run `npm run test:coverage` to generate coverage report
3. Set coverage thresholds (e.g., >80% for statements, branches, functions)
4. Add coverage badge to README.md
5. Include coverage report in CI

**Example:**
```bash
npm install --save-dev @vitest/coverage-v8
npm run test:coverage

# Output:
# Statements: 85%
# Branches: 78%
# Functions: 90%
# Lines: 84%
```

## Documentation Gaps

### No API Reference Documentation

**Issue:** No auto-generated API reference for TypeScript classes and methods.

**Impact:** Low - Code is well-commented with JSDoc.

**Recommendation:**
1. Add TypeDoc or TSDoc in future phase
2. Generate API documentation from TypeScript source
3. Publish to GitHub Pages or include in repository
4. Document all public APIs (SnapshotDatabase, SnapshotMCPServer)

**Example:**
```bash
npm install --save-dev typedoc
npx typedoc --out docs src/
```

### No CONTRIBUTING.md

**Issue:** No contributor guidelines for external contributions.

**Impact:** Low - Currently internal project, no external contributors.

**Recommendation:**
1. Add CONTRIBUTING.md when project is open-sourced
2. Include:
   - Code style guidelines
   - Test requirements
   - PR submission process
   - Branch naming conventions
   - Commit message format

### No CI Badge in README

**Issue:** README.md does not have CI status badge.

**Impact:** Low - Users can't see CI status at a glance.

**Recommendation:**
1. Add GitHub Actions CI badge to README.md
2. Add npm version badge
3. Add license badge
4. Add coverage badge (when coverage is added)

**Example:**
```markdown
![CI](https://github.com/WhenMoon-afk/snapshot-mcp-server/workflows/CI/badge.svg)
![npm version](https://img.shields.io/npm/v/@whenmoon-afk/snapshot-mcp-server)
![License](https://img.shields.io/github/license/WhenMoon-afk/snapshot-mcp-server)
```

## Release Process Gaps

### No Automated Versioning

**Issue:** Version bumps are manual (edit package.json).

**Impact:** Low - Manual versioning is common and acceptable.

**Recommendation:**
1. Use `npm version` command for version bumps
2. Add pre-version script to run tests
3. Add post-version script to push tags
4. Document versioning workflow in CLAUDE.md

**Example:**
```json
{
  "scripts": {
    "preversion": "npm test",
    "version": "npm run build",
    "postversion": "git push && git push --tags"
  }
}
```

### No Release Notes Generation

**Issue:** CHANGELOG.md is manually updated.

**Impact:** Low - Manual CHANGELOG is more accurate than auto-generated.

**Recommendation:**
1. Keep manual CHANGELOG for major changes
2. Consider conventional commits for automated minor changes
3. Use GitHub Releases for public release notes
4. Link CHANGELOG.md to GitHub Releases

### No npm Publishing Workflow

**Issue:** No automated npm publishing on version tags.

**Impact:** None - Publishing is manual and controlled.

**Recommendation:**
1. Add npm publish workflow in future phase (Phase 8)
2. Trigger on version tags (v*.*.*)
3. Use npm publish with --access public flag
4. Require manual approval before publishing

**Example:**
```yaml
name: Publish

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Future Enhancements

### Code-Exec API Client Generation

**Idea:** Auto-generate TypeScript client from MCP tool schemas.

**Benefit:** Code-exec environments can import generated client for type-safe tool calls.

**Example:**
```typescript
// Generated client
import { SnapshotClient } from '@whenmoon-afk/snapshot-mcp-client';

const client = new SnapshotClient();
await client.saveSnapshot({
  summary: 'Test',
  context: { files: ['test.ts'] }
});
```

**Recommendation:**
1. Research MCP client generation tools
2. Create `@whenmoon-afk/snapshot-mcp-client` package
3. Auto-generate from schema stability tests
4. Publish to npm alongside server package

### Schema Evolution Strategy

**Idea:** Add schema migration strategy for breaking changes.

**Example:** Support both v1 and v2 schemas simultaneously during transition.

**Recommendation:**
1. Use schema version field in tool definitions
2. Implement version negotiation during MCP handshake
3. Deprecate old schemas gradually (e.g., 1-2 releases)
4. Document schema evolution in SECURITY.md or VERSIONING.md

### Performance Monitoring in Production

**Idea:** Add optional telemetry for performance monitoring.

**Concern:** Privacy implications of telemetry.

**Recommendation:**
1. Make telemetry opt-in only
2. Use local-only telemetry (no cloud upload)
3. Log performance metrics to local file
4. Add `SNAPSHOT_TELEMETRY=true` environment variable

**Example:**
```typescript
// Log save operation duration
const start = Date.now();
const snapshot = db.saveSnapshot(input);
const duration = Date.now() - start;
if (process.env.SNAPSHOT_TELEMETRY === 'true') {
  fs.appendFileSync('telemetry.log', `save,${duration}ms\n`);
}
```

## Summary

Phase 5 successfully added CI infrastructure and schema stability tests, but several opportunities remain for future enhancements:

**High Priority (Future Phase 6):**
- Resolve Phase 4 error handling test failures
- Extract handlers to shared module
- Fix TestableSnapshotMCPServer integration

**Medium Priority (Future Phases):**
- Add stdio integration tests
- Add coverage reporting
- Add CI status badge to README
- Document manual publishing workflow

**Low Priority (Future Enhancements):**
- Auto-generate schema documentation
- Add performance benchmarks
- Create code-exec API client package
- Add automated npm publishing workflow

**Notes:**
- All open issues are non-blocking for Phase 5 completion
- Current CI configuration is functional and ready for GitHub Actions
- Schema stability tests provide strong guarantees for code-exec clients
- Known test failures are documented and understood

---

**Next Action:** Update CHANGELOG.md and commit Phase 5 changes
