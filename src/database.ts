import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export interface Snapshot {
  id: number;
  name: string | null;
  summary: string;
  context: string;
  next_steps: string | null;
  created_at: string;
}

export interface SaveSnapshotInput {
  name?: string;
  summary: string;
  context: string;
  next_steps?: string;
}

export class SnapshotDatabase {
  private db: Database.Database;

  constructor(dbPath: string) {
    // Ensure directory exists
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.initializeSchema();
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        summary TEXT NOT NULL,
        context TEXT NOT NULL,
        next_steps TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_snapshots_created_at
        ON snapshots(created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_snapshots_name
        ON snapshots(name) WHERE name IS NOT NULL;
    `);
  }

  saveSnapshot(input: SaveSnapshotInput): Snapshot {
    const stmt = this.db.prepare(`
      INSERT INTO snapshots (name, summary, context, next_steps)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      input.name || null,
      input.summary,
      input.context,
      input.next_steps || null
    );

    return this.getSnapshotById(result.lastInsertRowid as number)!;
  }

  getSnapshotById(id: number): Snapshot | undefined {
    const stmt = this.db.prepare(`
      SELECT * FROM snapshots WHERE id = ?
    `);
    return stmt.get(id) as Snapshot | undefined;
  }

  getSnapshotByName(name: string): Snapshot | undefined {
    const stmt = this.db.prepare(`
      SELECT * FROM snapshots WHERE name = ? ORDER BY created_at DESC, id DESC LIMIT 1
    `);
    return stmt.get(name) as Snapshot | undefined;
  }

  getLatestSnapshot(): Snapshot | undefined {
    const stmt = this.db.prepare(`
      SELECT * FROM snapshots ORDER BY created_at DESC, id DESC LIMIT 1
    `);
    return stmt.get() as Snapshot | undefined;
  }

  listSnapshots(limit?: number): Snapshot[] {
    const stmt = this.db.prepare(`
      SELECT * FROM snapshots ORDER BY created_at DESC, id DESC LIMIT ?
    `);
    return stmt.all(limit || 100) as Snapshot[];
  }

  deleteSnapshot(id: number): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM snapshots WHERE id = ?
    `);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  close(): void {
    this.db.close();
  }
}
