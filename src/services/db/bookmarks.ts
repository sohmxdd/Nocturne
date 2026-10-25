// ============================================================
// NOCTURNE — Bookmarks Repository
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { getDb, nowIso } from './database';
import type { Bookmark } from '../../types';

type BookmarkRow = {
  id: string;
  document_id: string;
  page_index: number;
  scroll_top: number;
  label: string | null;
  created_at: string;
  updated_at: string;
};

function rowToBookmark(row: BookmarkRow): Bookmark {
  return {
    id: row.id,
    documentId: row.document_id,
    pageIndex: row.page_index,
    scrollTop: row.scroll_top,
    label: row.label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createBookmark(params: {
  documentId: string;
  pageIndex: number;
  scrollTop: number;
  label?: string | null;
}): Promise<Bookmark> {
  const db = await getDb();
  const id = uuidv4();
  const now = nowIso();
  await db.execute(
    `INSERT INTO bookmarks (id, document_id, page_index, scroll_top, label, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?)`,
    [id, params.documentId, params.pageIndex, params.scrollTop,
     params.label ?? null, now, now]
  );
  const rows = await db.select<BookmarkRow>(
    `SELECT * FROM bookmarks WHERE id = ?`, [id]
  );
  return rowToBookmark(rows[0]);
}

export async function getBookmarksForDocument(documentId: string): Promise<Bookmark[]> {
  const db = await getDb();
  const rows = await db.select<BookmarkRow>(
    `SELECT * FROM bookmarks WHERE document_id = ? ORDER BY page_index ASC, created_at ASC`,
    [documentId]
  );
  return rows.map(rowToBookmark);
}

export async function updateBookmark(id: string, label: string | null): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE bookmarks SET label = ?, updated_at = ? WHERE id = ?`,
    [label, nowIso(), id]
  );
}

export async function deleteBookmark(id: string): Promise<void> {
  const db = await getDb();
  await db.execute(`DELETE FROM bookmarks WHERE id = ?`, [id]);
}
