// ============================================================
// NOCTURNE — Database Layer
// Typed wrapper over tauri-plugin-sql (SQLite).
// In non-Tauri mode, uses an in-memory store for UI development.
// ============================================================

import { IS_TAURI } from '../../lib/tauri';
import Database from '@tauri-apps/plugin-sql';

// ── DB Connection ─────────────────────────────────────────
export type SqlResult = { rowsAffected: number; lastInsertId: number };
export type SqlRow = Record<string, unknown>;

export interface DatabaseAPI {
  execute(sql: string, params?: unknown[]): Promise<SqlResult>;
  select<T = SqlRow>(sql: string, params?: unknown[]): Promise<T[]>;
  close(): Promise<void>;
}

let _db: DatabaseAPI | null = null;
let _initPromise: Promise<void> | null = null;

// In-memory fallback for browser/dev/test mode
export class InMemoryDB implements DatabaseAPI {
  private tables: Map<string, SqlRow[]> = new Map();

  private getTable(name: string): SqlRow[] {
    const tableKey = name.toLowerCase().trim();
    if (!this.tables.has(tableKey)) {
      this.tables.set(tableKey, []);
    }
    return this.tables.get(tableKey)!;
  }

  async execute(sql: string, params: unknown[] = []): Promise<SqlResult> {
    const trimmed = sql.trim();
    const upper = trimmed.toUpperCase();

    // INSERT INTO table (col1, col2, ...) VALUES (?, ?, ...)
    if (upper.startsWith('INSERT INTO') || upper.startsWith('INSERT OR REPLACE INTO')) {
      const match = trimmed.match(/INSERT(?:\s+OR\s+REPLACE)?\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES/i);
      if (match) {
        const table = match[1];
        const cols = match[2].split(',').map(c => c.trim().toLowerCase());
        const row: SqlRow = {};
        cols.forEach((col, idx) => {
          row[col] = params[idx] !== undefined ? params[idx] : null;
        });

        const rows = this.getTable(table);
        // If primary key (id or document_id) exists, update or append
        const pkCol = row['id'] !== undefined ? 'id' : row['document_id'] !== undefined ? 'document_id' : null;
        if (pkCol) {
          const existingIdx = rows.findIndex(r => r[pkCol] === row[pkCol]);
          if (existingIdx >= 0) {
            rows[existingIdx] = { ...rows[existingIdx], ...row };
            return { rowsAffected: 1, lastInsertId: 0 };
          }
        }
        rows.push(row);
        return { rowsAffected: 1, lastInsertId: rows.length };
      }
    }

    // UPDATE table SET col1 = ?, ... WHERE ...
    if (upper.startsWith('UPDATE')) {
      const match = trimmed.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i);
      if (match) {
        const table = match[1];
        const setClause = match[2];
        const whereClause = match[3];
        const rows = this.getTable(table);

        const setAssignments = setClause.split(',').map(s => s.trim().split('=')[0].trim().toLowerCase());
        let paramIdx = 0;
        const updates: Record<string, unknown> = {};
        for (const col of setAssignments) {
          updates[col] = params[paramIdx++];
        }

        let count = 0;
        for (let i = 0; i < rows.length; i++) {
          let matches = true;
          if (whereClause) {
            const whereColMatch = whereClause.match(/(\w+)\s*=\s*\?/);
            if (whereColMatch) {
              const col = whereColMatch[1].toLowerCase();
              const val = params[paramIdx];
              matches = rows[i][col] === val;
            }
          }
          if (matches) {
            rows[i] = { ...rows[i], ...updates };
            count++;
          }
        }
        return { rowsAffected: count, lastInsertId: 0 };
      }
    }

    // DELETE FROM table WHERE ...
    if (upper.startsWith('DELETE FROM')) {
      const match = trimmed.match(/DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?$/i);
      if (match) {
        const table = match[1];
        const whereClause = match[2];
        const rows = this.getTable(table);

        if (!whereClause) {
          const count = rows.length;
          rows.length = 0;
          return { rowsAffected: count, lastInsertId: 0 };
        }

        const whereColMatch = whereClause.match(/(\w+)\s*=\s*\?/);
        if (whereColMatch) {
          const col = whereColMatch[1].toLowerCase();
          const val = params[0];
          const initialLen = rows.length;
          const filtered = rows.filter(r => r[col] !== val);
          this.tables.set(table.toLowerCase(), filtered);
          return { rowsAffected: initialLen - filtered.length, lastInsertId: 0 };
        }
      }
    }

    return { rowsAffected: 0, lastInsertId: 0 };
  }

  async select<T = SqlRow>(sql: string, params: unknown[] = []): Promise<T[]> {
    const trimmed = sql.trim();
    const upper = trimmed.toUpperCase();

    // SELECT ... FROM table [WHERE ...] [ORDER BY ...] [LIMIT ...]
    const fromMatch = trimmed.match(/FROM\s+(\w+)/i);
    if (!fromMatch) return [] as T[];

    const table = fromMatch[1];
    let rows = [...this.getTable(table)];

    // Basic WHERE matching
    const whereMatch = trimmed.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|$)/i);
    if (whereMatch) {
      const condition = whereMatch[1];
      const eqMatches = Array.from(condition.matchAll(/(\w+)\s*=\s*\?/g));
      if (eqMatches.length > 0) {
        rows = rows.filter(row => {
          return eqMatches.every((m, idx) => {
            const col = m[1].toLowerCase();
            const val = params[idx];
            return row[col] === val;
          });
        });
      }
    }

    // Basic ORDER BY
    const orderMatch = trimmed.match(/ORDER\s+BY\s+(\w+)(?:\s+(ASC|DESC))?/i);
    if (orderMatch) {
      const col = orderMatch[1].toLowerCase();
      const desc = orderMatch[2]?.toUpperCase() === 'DESC';
      rows.sort((a, b) => {
        const valA = a[col] as string | number;
        const valB = b[col] as string | number;
        if (valA < valB) return desc ? 1 : -1;
        if (valA > valB) return desc ? -1 : 1;
        return 0;
      });
    }

    // Basic LIMIT
    const limitMatch = trimmed.match(/LIMIT\s+(\d+|\?)/i);
    if (limitMatch) {
      const limitVal = limitMatch[1] === '?' ? Number(params[params.length - 1]) : parseInt(limitMatch[1], 10);
      if (!isNaN(limitVal)) {
        rows = rows.slice(0, limitVal);
      }
    }

    return rows as unknown as T[];
  }

  async close(): Promise<void> {
    this.tables.clear();
  }
}

export async function getDb(): Promise<DatabaseAPI> {
  if (_db) return _db;
  if (_initPromise) {
    await _initPromise;
    return _db!;
  }

  _initPromise = (async () => {
    if (!IS_TAURI) {
      _db = new InMemoryDB();
      return;
    }

    try {
      const conn = await Database.load('sqlite:nocturne.db');

      _db = {
        execute: (sql, params) => conn.execute(sql, params),
        select: <T>(sql: string, params?: unknown[]) =>
          conn.select<T>(sql, params),
        close: () => conn.close(),
      };

      await runMigrations(_db);
    } catch (e) {
      console.error('[DB] Failed to connect to SQLite:', e);
      _db = new InMemoryDB();
    }
  })();

  await _initPromise;
  return _db!;
}

// ── Migrations ────────────────────────────────────────────
const MIGRATIONS: { version: number; sql: string }[] = [
  {
    version: 1,
    sql: `
      PRAGMA journal_mode=WAL;
      PRAGMA foreign_keys=ON;

      CREATE TABLE IF NOT EXISTS _meta (
        key   TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS documents (
        id              TEXT PRIMARY KEY NOT NULL,
        file_path       TEXT NOT NULL,
        file_size_bytes INTEGER NOT NULL DEFAULT 0,
        fingerprint     TEXT NOT NULL,
        title           TEXT,
        author          TEXT,
        page_count      INTEGER,
        import_status   TEXT NOT NULL DEFAULT 'pending',
        error_message   TEXT,
        created_at      TEXT NOT NULL,
        updated_at      TEXT NOT NULL,
        CONSTRAINT documents_fingerprint_unique UNIQUE (fingerprint),
        CONSTRAINT documents_status_check CHECK (
          import_status IN ('pending','ready','error','fingerprint_mismatch')
        )
      );

      CREATE INDEX IF NOT EXISTS idx_documents_created_at
        ON documents(created_at DESC);

      CREATE TABLE IF NOT EXISTS reading_progress (
        document_id   TEXT PRIMARY KEY NOT NULL
          REFERENCES documents(id) ON DELETE CASCADE,
        page_index    INTEGER NOT NULL DEFAULT 0,
        scroll_top    REAL NOT NULL DEFAULT 0.0,
        zoom_level    REAL NOT NULL DEFAULT 1.0,
        reading_mode  TEXT NOT NULL DEFAULT 'default',
        last_opened_at TEXT NOT NULL,
        updated_at    TEXT NOT NULL,
        CONSTRAINT reading_progress_mode CHECK (
          reading_mode IN ('default','focus')
        )
      );

      CREATE TABLE IF NOT EXISTS bookmarks (
        id          TEXT PRIMARY KEY NOT NULL,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        page_index  INTEGER NOT NULL,
        scroll_top  REAL NOT NULL DEFAULT 0.0,
        label       TEXT,
        created_at  TEXT NOT NULL,
        updated_at  TEXT NOT NULL,
        CONSTRAINT bookmarks_label_length CHECK (label IS NULL OR length(label) <= 200)
      );

      CREATE INDEX IF NOT EXISTS idx_bookmarks_document_page
        ON bookmarks(document_id, page_index);

      CREATE TABLE IF NOT EXISTS annotations (
        id            TEXT PRIMARY KEY NOT NULL,
        document_id   TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        page_index    INTEGER NOT NULL,
        rects_json    TEXT NOT NULL,
        selected_text TEXT NOT NULL,
        anchor_prefix TEXT,
        anchor_suffix TEXT,
        color         TEXT NOT NULL DEFAULT 'amber',
        note_content  TEXT,
        is_deleted    INTEGER NOT NULL DEFAULT 0,
        created_at    TEXT NOT NULL,
        updated_at    TEXT NOT NULL,
        CONSTRAINT annotations_color_check CHECK (
          color IN ('amber','teal','violet','rose')
        ),
        CONSTRAINT annotations_text_len CHECK (length(selected_text) <= 500),
        CONSTRAINT annotations_note_len CHECK (
          note_content IS NULL OR length(note_content) <= 4000
        )
      );

      CREATE INDEX IF NOT EXISTS idx_annotations_document_page
        ON annotations(document_id, page_index) WHERE is_deleted = 0;

      CREATE INDEX IF NOT EXISTS idx_annotations_document
        ON annotations(document_id) WHERE is_deleted = 0;

      CREATE TABLE IF NOT EXISTS reading_sessions (
        id               TEXT PRIMARY KEY NOT NULL,
        document_id      TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        started_at       TEXT NOT NULL,
        ended_at         TEXT,
        duration_seconds INTEGER,
        first_page       INTEGER NOT NULL DEFAULT 0,
        last_page        INTEGER NOT NULL DEFAULT 0,
        pages_visited    TEXT NOT NULL DEFAULT '[]'
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_document
        ON reading_sessions(document_id, started_at DESC);

      CREATE TABLE IF NOT EXISTS agent_threads (
        id          TEXT PRIMARY KEY NOT NULL,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        title       TEXT,
        mode        TEXT NOT NULL DEFAULT 'explain',
        created_at  TEXT NOT NULL,
        updated_at  TEXT NOT NULL,
        CONSTRAINT agent_threads_mode CHECK (
          mode IN ('explain','connect','challenge','apply')
        )
      );

      CREATE INDEX IF NOT EXISTS idx_agent_threads_document
        ON agent_threads(document_id, updated_at DESC);

      CREATE TABLE IF NOT EXISTS agent_messages (
        id          TEXT PRIMARY KEY NOT NULL,
        thread_id   TEXT NOT NULL REFERENCES agent_threads(id) ON DELETE CASCADE,
        role        TEXT NOT NULL,
        content     TEXT NOT NULL,
        source_refs TEXT NOT NULL DEFAULT '[]',
        status      TEXT NOT NULL DEFAULT 'complete',
        created_at  TEXT NOT NULL,
        CONSTRAINT agent_messages_role CHECK (role IN ('user','assistant','system')),
        CONSTRAINT agent_messages_status CHECK (
          status IN ('streaming','complete','error')
        )
      );

      CREATE INDEX IF NOT EXISTS idx_agent_messages_thread
        ON agent_messages(thread_id, created_at ASC);

      CREATE TABLE IF NOT EXISTS thought_trails (
        id          TEXT PRIMARY KEY NOT NULL,
        title       TEXT NOT NULL,
        description TEXT,
        created_at  TEXT NOT NULL,
        updated_at  TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS thought_trail_items (
        id         TEXT PRIMARY KEY NOT NULL,
        trail_id   TEXT NOT NULL REFERENCES thought_trails(id) ON DELETE CASCADE,
        item_type  TEXT NOT NULL,
        item_id    TEXT NOT NULL,
        position   INTEGER NOT NULL DEFAULT 0,
        note       TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS document_chunks (
        id          TEXT PRIMARY KEY NOT NULL,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        page_index  INTEGER NOT NULL,
        chunk_index INTEGER NOT NULL,
        content     TEXT NOT NULL,
        char_count  INTEGER NOT NULL,
        created_at  TEXT NOT NULL,
        CONSTRAINT document_chunks_unique UNIQUE (document_id, page_index, chunk_index)
      );

      CREATE INDEX IF NOT EXISTS idx_chunks_document_page
        ON document_chunks(document_id, page_index);

      CREATE VIRTUAL TABLE IF NOT EXISTS document_chunks_fts USING fts5(
        content,
        document_id UNINDEXED,
        page_index UNINDEXED,
        content=document_chunks,
        content_rowid=rowid
      );
    `
  },
];

async function runMigrations(db: DatabaseAPI): Promise<void> {
  // Ensure _meta exists
  await db.execute(`
    CREATE TABLE IF NOT EXISTS _meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    )
  `);

  const meta = await db.select<{ value: string }>(
    `SELECT value FROM _meta WHERE key = 'schema_version'`
  );
  const currentVersion = meta.length > 0 ? parseInt(meta[0].value, 10) : 0;

  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      console.info(`[DB] Running migration v${migration.version}`);
      // Split by semicolons and run each statement
      const statements = migration.sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const stmt of statements) {
        await db.execute(stmt);
      }

      await db.execute(
        `INSERT OR REPLACE INTO _meta (key, value) VALUES ('schema_version', ?)`,
        [String(migration.version)]
      );
    }
  }
}

// ── Helpers ───────────────────────────────────────────────
export function nowIso(): string {
  return new Date().toISOString();
}
