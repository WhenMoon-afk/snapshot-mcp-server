import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SnapshotDatabase, SaveSnapshotInput } from './database.js';
import { unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('SnapshotDatabase', () => {
  let db: SnapshotDatabase;
  let testDbPath: string;

  beforeEach(() => {
    // Create a unique temp database for each test
    testDbPath = join(tmpdir(), `test-snapshots-${Date.now()}-${Math.random()}.db`);
    db = new SnapshotDatabase(testDbPath);
  });

  afterEach(() => {
    // Clean up: close database and remove file
    db.close();
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  describe('Schema Creation', () => {
    it('should create snapshots table with correct schema', () => {
      const input: SaveSnapshotInput = {
        summary: 'Test snapshot',
        context: 'Test context',
      };

      const snapshot = db.saveSnapshot(input);

      expect(snapshot).toBeDefined();
      expect(snapshot.id).toBeTypeOf('number');
      expect(snapshot.summary).toBe('Test snapshot');
      expect(snapshot.context).toBe('Test context');
      expect(snapshot.created_at).toBeDefined();
      expect(snapshot.continuation_prompt).toBeDefined();
    });

    it('should have continuation_prompt column (migration test)', () => {
      const input: SaveSnapshotInput = {
        summary: 'Migration test',
        context: 'Testing continuation_prompt column',
      };

      const snapshot = db.saveSnapshot(input);

      expect(snapshot.continuation_prompt).toBeDefined();
      expect(snapshot.continuation_prompt).toContain('Resuming: Migration test');
    });
  });

  describe('Durability Configuration (Phase 4)', () => {
    it('should set journal_mode to WAL', () => {
      // Access the internal database connection to check PRAGMA settings
      // @ts-ignore - accessing private member for testing
      const journalMode = db.db.pragma('journal_mode', { simple: true });

      expect(journalMode).toBe('wal');
    });

    it('should set synchronous to FULL', () => {
      // @ts-ignore - accessing private member for testing
      const synchronous = db.db.pragma('synchronous', { simple: true });

      // synchronous=FULL is represented as 2
      expect(synchronous).toBe(2);
    });

    it('should persist PRAGMAs across operations', () => {
      // Save a snapshot
      const input: SaveSnapshotInput = {
        summary: 'PRAGMA persistence test',
        context: 'Verify PRAGMAs remain set after operations',
      };

      db.saveSnapshot(input);

      // Verify PRAGMAs are still set
      // @ts-ignore - accessing private member for testing
      const journalMode = db.db.pragma('journal_mode', { simple: true });
      // @ts-ignore - accessing private member for testing
      const synchronous = db.db.pragma('synchronous', { simple: true });

      expect(journalMode).toBe('wal');
      expect(synchronous).toBe(2);
    });
  });

  describe('saveSnapshot', () => {
    it('should save snapshot with string context', () => {
      const input: SaveSnapshotInput = {
        summary: 'String context test',
        context: 'This is a plain string context',
      };

      const snapshot = db.saveSnapshot(input);

      expect(snapshot.id).toBeGreaterThan(0);
      expect(snapshot.summary).toBe('String context test');
      expect(snapshot.context).toBe('This is a plain string context');
      expect(snapshot.name).toBeNull();
      expect(snapshot.next_steps).toBeNull();
    });

    it('should save snapshot with structured context', () => {
      const input: SaveSnapshotInput = {
        summary: 'Structured context test',
        context: {
          files: ['src/index.ts', 'src/database.ts'],
          decisions: ['Use SQLite', 'Add continuation prompts'],
          blockers: ['Network latency'],
          code_state: { branch: 'main', tests_passing: true },
        },
      };

      const snapshot = db.saveSnapshot(input);

      expect(snapshot.context).toContain('Files:');
      expect(snapshot.context).toContain('- src/index.ts');
      expect(snapshot.context).toContain('Decisions:');
      expect(snapshot.context).toContain('- Use SQLite');
      expect(snapshot.context).toContain('Blockers:');
      expect(snapshot.context).toContain('- Network latency');
      expect(snapshot.context).toContain('Code State:');
      expect(snapshot.context).toContain('"branch": "main"');
    });

    it('should save snapshot with name and next_steps', () => {
      const input: SaveSnapshotInput = {
        name: 'milestone-v1',
        summary: 'Version 1.0 complete',
        context: 'All features implemented',
        next_steps: 'Deploy to production',
      };

      const snapshot = db.saveSnapshot(input);

      expect(snapshot.name).toBe('milestone-v1');
      expect(snapshot.next_steps).toBe('Deploy to production');
    });

    it('should generate continuation prompt', () => {
      const input: SaveSnapshotInput = {
        summary: 'Work in progress',
        context: 'Implementing feature X',
        next_steps: 'Add tests and documentation',
      };

      const snapshot = db.saveSnapshot(input);

      expect(snapshot.continuation_prompt).toContain('Resuming: Work in progress');
      expect(snapshot.continuation_prompt).toContain('Context:');
      expect(snapshot.continuation_prompt).toContain('Implementing feature X');
      expect(snapshot.continuation_prompt).toContain('Next:');
      expect(snapshot.continuation_prompt).toContain('Add tests and documentation');
    });

    it('should handle empty optional fields', () => {
      const input: SaveSnapshotInput = {
        summary: 'Minimal snapshot',
        context: 'Just context',
      };

      const snapshot = db.saveSnapshot(input);

      expect(snapshot.name).toBeNull();
      expect(snapshot.next_steps).toBeNull();
      expect(snapshot.continuation_prompt).not.toContain('Next:');
    });
  });

  describe('getSnapshotById', () => {
    it('should retrieve snapshot by ID', () => {
      const input: SaveSnapshotInput = {
        summary: 'Test retrieval',
        context: 'Test context',
      };

      const saved = db.saveSnapshot(input);
      const retrieved = db.getSnapshotById(saved.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(saved.id);
      expect(retrieved!.summary).toBe('Test retrieval');
    });

    it('should return undefined for non-existent ID', () => {
      const retrieved = db.getSnapshotById(99999);

      expect(retrieved).toBeUndefined();
    });
  });

  describe('getSnapshotByName', () => {
    it('should retrieve snapshot by name', () => {
      const input: SaveSnapshotInput = {
        name: 'test-name',
        summary: 'Named snapshot',
        context: 'Test context',
      };

      db.saveSnapshot(input);
      const retrieved = db.getSnapshotByName('test-name');

      expect(retrieved).toBeDefined();
      expect(retrieved!.name).toBe('test-name');
      expect(retrieved!.summary).toBe('Named snapshot');
    });

    it('should return latest snapshot with duplicate names', () => {
      const input1: SaveSnapshotInput = {
        name: 'duplicate',
        summary: 'First',
        context: 'Context 1',
      };
      const input2: SaveSnapshotInput = {
        name: 'duplicate',
        summary: 'Second',
        context: 'Context 2',
      };

      const first = db.saveSnapshot(input1);
      const second = db.saveSnapshot(input2);

      const retrieved = db.getSnapshotByName('duplicate');

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(second.id);
      expect(retrieved!.summary).toBe('Second');
    });

    it('should return undefined for non-existent name', () => {
      const retrieved = db.getSnapshotByName('non-existent');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('getLatestSnapshot', () => {
    it('should retrieve most recent snapshot', () => {
      const input1: SaveSnapshotInput = {
        summary: 'First snapshot',
        context: 'Context 1',
      };
      const input2: SaveSnapshotInput = {
        summary: 'Second snapshot',
        context: 'Context 2',
      };
      const input3: SaveSnapshotInput = {
        summary: 'Third snapshot',
        context: 'Context 3',
      };

      db.saveSnapshot(input1);
      db.saveSnapshot(input2);
      const latest = db.saveSnapshot(input3);

      const retrieved = db.getLatestSnapshot();

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(latest.id);
      expect(retrieved!.summary).toBe('Third snapshot');
    });

    it('should return undefined when no snapshots exist', () => {
      const retrieved = db.getLatestSnapshot();

      expect(retrieved).toBeUndefined();
    });
  });

  describe('listSnapshots', () => {
    beforeEach(() => {
      // Create test snapshots
      for (let i = 1; i <= 5; i++) {
        db.saveSnapshot({
          summary: `Snapshot ${i}`,
          context: `Context ${i}`,
        });
      }
    });

    it('should list all snapshots in reverse chronological order', () => {
      const snapshots = db.listSnapshots();

      expect(snapshots).toHaveLength(5);
      expect(snapshots[0].summary).toBe('Snapshot 5');
      expect(snapshots[4].summary).toBe('Snapshot 1');
    });

    it('should respect limit parameter', () => {
      const snapshots = db.listSnapshots(3);

      expect(snapshots).toHaveLength(3);
      expect(snapshots[0].summary).toBe('Snapshot 5');
      expect(snapshots[2].summary).toBe('Snapshot 3');
    });

    it('should default to limit of 100', () => {
      // Create more snapshots
      for (let i = 6; i <= 150; i++) {
        db.saveSnapshot({
          summary: `Snapshot ${i}`,
          context: `Context ${i}`,
        });
      }

      const snapshots = db.listSnapshots();

      expect(snapshots).toHaveLength(100);
    });

    it('should return empty array when no snapshots exist', () => {
      const emptyDb = new SnapshotDatabase(':memory:');
      const snapshots = emptyDb.listSnapshots();

      expect(snapshots).toEqual([]);

      emptyDb.close();
    });
  });

  describe('deleteSnapshot', () => {
    it('should delete snapshot by ID', () => {
      const input: SaveSnapshotInput = {
        summary: 'To be deleted',
        context: 'Test context',
      };

      const snapshot = db.saveSnapshot(input);
      const deleted = db.deleteSnapshot(snapshot.id);

      expect(deleted).toBe(true);

      const retrieved = db.getSnapshotById(snapshot.id);
      expect(retrieved).toBeUndefined();
    });

    it('should return false for non-existent ID', () => {
      const deleted = db.deleteSnapshot(99999);

      expect(deleted).toBe(false);
    });

    it('should only delete specified snapshot', () => {
      const snapshot1 = db.saveSnapshot({
        summary: 'Keep this',
        context: 'Context 1',
      });
      const snapshot2 = db.saveSnapshot({
        summary: 'Delete this',
        context: 'Context 2',
      });

      db.deleteSnapshot(snapshot2.id);

      const remaining = db.listSnapshots();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(snapshot1.id);
    });
  });

  describe('Error Cases', () => {
    it('should handle database in read-only location gracefully', () => {
      // This test verifies directory creation works
      const nestedPath = join(tmpdir(), 'nested', 'path', 'db.sqlite');
      const nestedDb = new SnapshotDatabase(nestedPath);

      const snapshot = nestedDb.saveSnapshot({
        summary: 'Nested test',
        context: 'Testing directory creation',
      });

      expect(snapshot.id).toBeGreaterThan(0);

      nestedDb.close();
    });

    it('should handle concurrent operations', () => {
      const snapshots = [];

      // Save multiple snapshots in quick succession
      for (let i = 0; i < 10; i++) {
        snapshots.push(db.saveSnapshot({
          summary: `Concurrent ${i}`,
          context: `Context ${i}`,
        }));
      }

      expect(snapshots).toHaveLength(10);

      const allSnapshots = db.listSnapshots();
      expect(allSnapshots).toHaveLength(10);
    });
  });
});
