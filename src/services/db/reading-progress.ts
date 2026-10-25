// ============================================================
// NOCTURNE — Reading Progress Repository
// ============================================================

import { getDb, nowIso } from './database';
import type { ReadingProgress, ReadingMode } from '../../types';

type ProgressRow = {
  document_id: string;
  page_index: number;
  scroll_top: number;
  zoom_level: number;
  reading_mode: string;
  last_opened_at: string;
  updated_at: string;
};

function rowToProgress(row: ProgressRow): ReadingProgress {
  return {
    documentId: row.document_id,
    pageIndex: row.page_index,
    scrollTop: row.scroll_top,
    zoomLevel: row.zoom_level,
    readingMode: row.reading_mode as ReadingMode,
    lastOpenedAt: row.last_opened_at,
    updatedAt: row.updated_at,
  };
}

export async function upsertReadingProgress(params: {
  documentId: string;
  pageIndex: number;
  scrollTop: number;
  zoomLevel: number;
  readingMode?: ReadingMode;
}): Promise<void> {
  const db = await getDb();
  const now = nowIso();
  await db.execute(
    `INSERT INTO reading_progress
       (document_id, page_index, scroll_top, zoom_level, reading_mode,
        last_opened_at, updated_at)
     VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(document_id) DO UPDATE SET
       page_index = excluded.page_index,
       scroll_top = excluded.scroll_top,
       zoom_level = excluded.zoom_level,
       reading_mode = excluded.reading_mode,
       last_opened_at = excluded.last_opened_at,
       updated_at = excluded.updated_at`,
    [params.documentId, params.pageIndex, params.scrollTop,
     params.zoomLevel, params.readingMode ?? 'default', now, now]
  );
}

export async function getReadingProgress(documentId: string): Promise<ReadingProgress | null> {
  const db = await getDb();
  const rows = await db.select<ProgressRow>(
    `SELECT * FROM reading_progress WHERE document_id = ?`, [documentId]
  );
  return rows.length > 0 ? rowToProgress(rows[0]) : null;
}

export async function touchLastOpened(documentId: string): Promise<void> {
  const db = await getDb();
  const now = nowIso();
  await db.execute(
    `INSERT INTO reading_progress
       (document_id, page_index, scroll_top, zoom_level, reading_mode,
        last_opened_at, updated_at)
     VALUES (?,0,0.0,1.0,'default',?,?)
     ON CONFLICT(document_id) DO UPDATE SET
       last_opened_at = excluded.last_opened_at,
       updated_at = excluded.updated_at`,
    [documentId, now, now]
  );
}
