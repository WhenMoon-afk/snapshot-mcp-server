# Phase 3: Open Questions and Issues

**Date:** 2025-11-18
**Phase:** 3 (Documentation, UX, and Examples)
**Branch:** `claude/phase-3-docs-01JsfyQkNUygffV3x2BvAPGg`

## Overview

This document captures open questions, potential improvements, and future considerations identified during Phase 3 documentation work. These items are **not blockers** for Phase 3 completion but may inform future phases.

## Documentation and UX

### 1. Video/GIF Tutorials

**Question:** Should we add visual tutorials for first-time setup?

**Context:**
- Current docs are text and code examples only
- Some users prefer visual walkthroughs
- GIFs could show Claude Desktop config process

**Considerations:**
- Maintenance burden (screenshots change with UI updates)
- GitHub README supports images and GIFs
- Could reduce support burden for setup issues

**Recommendation:** Low priority, consider if user feedback indicates need

### 2. Interactive Examples / Playground

**Question:** Should we provide an interactive testing environment?

**Context:**
- Users could test snapshot commands without full setup
- Could be web-based MCP client simulator
- Would demonstrate functionality before installation

**Considerations:**
- Significant development effort
- Maintenance overhead
- Current npx approach already low-friction

**Recommendation:** Future enhancement, not critical for current release

### 3. Migration Guides for Database Changes

**Question:** Do we need migration guides for users upgrading between versions?

**Context:**
- Database schema has automatic migration (continuation_prompt column)
- Future schema changes may require user action
- No documented migration process yet

**Considerations:**
- Current migration is transparent (auto-adds missing columns)
- Future breaking changes would need clear guides
- Should document migration strategy in CLAUDE.md

**Recommendation:** Add migration guide template to CLAUDE.md in future phase

## Client Integration Examples

### 4. Additional Client Examples

**Question:** Should we add examples for more MCP clients?

**Current coverage:**
- ✅ Claude Desktop
- ✅ Claude Code on Web (conceptual)
- ✅ Generic MCP host

**Missing:**
- Cursor IDE integration
- Continue.dev integration
- Custom stdio client (Node.js, Python examples)
- HTTP transport example (if MCP spec supports)

**Considerations:**
- Each client may have unique config requirements
- Maintenance burden for multiple client versions
- Generic host example may suffice for most custom integrations

**Recommendation:** Add client examples based on user requests and popularity

### 5. Code-Execution Deeper Examples

**Question:** Should we expand code-execution examples beyond conceptual?

**Context:**
- Current example is conceptual JavaScript (README.md lines 107-118)
- Could add real working example with actual MCP client library
- Could demonstrate batch operations, error handling, etc.

**Considerations:**
- MCP client library not widely used in code-exec environments yet
- May confuse users who just want to use natural language commands
- Advanced users can extrapolate from conceptual example

**Recommendation:** Wait for user demand; conceptual example sufficient for now

## Security and Deployment

### 6. OAuth 2.1 Implementation Priority

**Question:** When should we implement OAuth 2.1 support?

**Context:**
- MCP spec target: June 2025
- Current local-only model sufficient for majority of users
- Multi-user/cloud scenarios are edge cases today

**Considerations:**
- Spec not finalized; early implementation may require rework
- No current user demand for multi-user deployments
- Design work complete (Phase 4 or parallel track)

**Timeline:**
- **Now:** Design and positioning (Phase 3 complete)
- **June 2025:** MCP spec finalized
- **Post-June 2025:** Evaluate user demand and implement if needed

**Recommendation:** Wait for spec finalization and user demand

### 7. Docker/Kubernetes Deployment Examples

**Question:** Should we provide containerized deployment examples?

**Context:**
- SECURITY.md mentions cloud/multi-tenant scenarios
- Docker would simplify deployment for some users
- K8s examples useful for enterprise scenarios

**Considerations:**
- Current local desktop focus doesn't require containers
- OAuth 2.1 support prerequisite for multi-tenant containers
- Would add complexity for majority of users

**Recommendation:** Future enhancement after OAuth 2.1 implementation

### 8. Encryption at Rest

**Question:** Should we implement database encryption?

**Context:**
- Current: Plaintext SQLite (SECURITY.md explicitly states this)
- Mitigation: Rely on OS-level disk encryption
- SQLite supports encryption extensions (SQLCipher, SEE)

**Considerations:**
- Adds complexity (key management, performance overhead)
- OS-level encryption already available (FileVault, BitLocker, LUKS)
- Vast majority of users have disk encryption enabled
- Would only help if OS compromised but not user account

**Recommendation:** Document OS encryption approach; defer built-in encryption unless user demand emerges

## Operational and Reliability

### 9. Backup and Export Tools

**Question:** Should we build snapshot backup/export features?

**Context:**
- FAQ mentions manual backup: `cp ~/.claude-snapshots/snapshots.db`
- SQLite .dump command for SQL export
- No built-in export to JSON, YAML, or other formats

**Potential features:**
- `export_snapshot` tool to JSON
- `import_snapshot` tool from JSON
- Automatic periodic backups
- Cloud sync integration (Dropbox, iCloud, Google Drive)

**Considerations:**
- Manual backup already works and is simple
- Cloud sync adds complexity and security concerns
- Export/import useful for sharing snapshots between users

**Recommendation:**
- **Low priority:** Export to JSON for sharing (Phase 7+)
- **Not recommended:** Automatic backups or cloud sync (adds complexity)

### 10. Database Durability and WAL Mode

**Question:** Should we enable WAL mode by default?

**Context:**
- Phase 2 (SQLite Durability Analysis) will evaluate this
- SECURITY.md notes current lack of durability guarantees
- Trade-offs between performance, durability, and complexity

**Considerations:**
- WAL mode improves read performance and concurrency
- synchronous=NORMAL acceptable for snapshots (losing recent saves OK)
- May reduce corruption risk in some crash scenarios

**Status:** Covered in Phase 2 scope, not a Phase 3 issue

**Recommendation:** Defer to Phase 2 analysis and implementation

### 11. Multi-Database Support

**Question:** Should we support multiple databases for different projects?

**Context:**
- FAQ mentions: "configure multiple MCP server entries with different SNAPSHOT_DB_PATH"
- Current: One database per MCP server instance
- Alternative: One server, multiple databases with project namespacing

**Approaches:**
1. **Current:** Multiple server configs in claude_desktop_config.json
2. **Alternative:** Project-aware single server with `project` parameter

**Considerations:**
- Current approach works but clutters config file
- Project-aware server more elegant but adds complexity
- Need clear way to specify "active project" in commands

**Recommendation:** Keep current multi-instance approach; consider project support in Phase 7 based on user feedback

## Testing and Quality

### 12. Example Testing

**Question:** Should we test the documentation examples?

**Context:**
- README has JSON config examples
- Manual testing only (no automated verification)
- Config examples could become stale

**Potential approach:**
- Automated testing: Parse and validate JSON examples
- E2E tests: Actually run server with documented configs
- Link checking: Ensure all referenced files/URLs valid

**Considerations:**
- Test framework not yet established (Phase 6 scope)
- Manual review during PR process catches most issues
- Examples are relatively stable

**Recommendation:** Defer to Phase 6 (Testing Infrastructure); manual review sufficient for now

### 13. Browser-Based Documentation

**Question:** Should we publish docs to GitHub Pages or similar?

**Context:**
- Current: README.md and SECURITY.md in repo
- Alternative: Dedicated docs site (Docusaurus, MkDocs, etc.)
- Would enable search, better navigation, versioning

**Considerations:**
- Current Markdown docs render well on GitHub
- Small project doesn't need complex docs infrastructure
- Would add maintenance burden

**Recommendation:** Defer unless project grows significantly; GitHub README sufficient

## Feature Enhancements

### 14. Full-Text Search

**Question:** Should we add search across snapshot summaries and context?

**Context:**
- Current: List shows all snapshots, manual filtering
- Large snapshot collections hard to navigate
- SQLite FTS5 extension available

**Potential features:**
- `search_snapshots` tool with query string
- Search by summary, context, next_steps
- Relevance ranking

**Considerations:**
- FTS5 adds database complexity
- Users can export to SQL and search manually
- Most users have < 100 snapshots (list command sufficient)

**Recommendation:** Future enhancement if user feedback indicates need (Phase 7+)

### 15. Snapshot Tags and Organization

**Question:** Should we add tagging or categorization?

**Context:**
- Current: Named snapshots provide some organization
- Alternative: Tags (e.g., "bug-fix", "feature", "experiment")
- Could enable filtering by tag

**Potential schema change:**
```sql
CREATE TABLE tags (
  snapshot_id INTEGER,
  tag TEXT,
  FOREIGN KEY (snapshot_id) REFERENCES snapshots(id)
);
```

**Considerations:**
- Adds schema complexity
- Named snapshots + list command may suffice
- Tag management commands needed (add_tag, remove_tag, list_tags)

**Recommendation:** Defer to Phase 7+ based on user demand; current approach sufficient

### 16. Snapshot Diff Tool

**Question:** Should we add a tool to diff snapshots?

**Context:**
- Useful for understanding changes between saved states
- Could show what changed in context, summary, next_steps

**Potential features:**
- `diff_snapshots` tool with two snapshot IDs
- Textual diff output
- Structured diff for structured context

**Considerations:**
- Adds complexity
- Users can manually compare or use external diff tools
- Utility depends on snapshot usage patterns

**Recommendation:** Nice-to-have, low priority, Phase 7+

## Summary

**Blockers:** None identified - Phase 3 is complete

**High priority for future phases:**
- OAuth 2.1 implementation (post-spec finalization, Phase 4)
- Testing infrastructure (Phase 6)
- Migration guide documentation (Phase 7)

**Medium priority:**
- Export/import JSON tools (Phase 7+)
- Additional client integration examples (as requested)

**Low priority (user-demand driven):**
- Visual tutorials
- Full-text search
- Tagging system
- Snapshot diff tool
- Multi-database/project support

**Not recommended:**
- Automatic backups or cloud sync (complexity vs benefit)
- Dedicated docs site (GitHub rendering sufficient)
- Database encryption (OS-level sufficient)

All issues documented here are for future consideration and do not block Phase 3 completion or merge.

---

**Status:** Phase 3 complete, ready for PR review
**Next:** Human review and merge, then proceed to Phase 2 or Phase 4
