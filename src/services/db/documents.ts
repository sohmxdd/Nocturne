// ============================================================
// NOCTURNE — Documents Repository
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { getDb, nowIso } from './database';
import type { Document, DocumentWithProgress, ImportStatus } from '../../types';

type DocumentRow = {
  id: string;
  file_path: string;
  file_size_bytes: number;
  fingerprint: string;
  title: string | null;
  author: string | null;
  page_count: number | null;
  import_status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

function rowToDocument(row: DocumentRow): Document {
  return {
    id: row.id,
    filePath: row.file_path,
    fileSizeBytes: row.file_size_bytes,
    fingerprint: row.fingerprint,
    title: row.title,
    author: row.author,
    pageCount: row.page_count,
    importStatus: row.import_status as ImportStatus,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createDocument(params: {
  filePath: string;
  fileSizeBytes: number;
  fingerprint: string;
  title?: string | null;
  author?: string | null;
}): Promise<Document> {
  const db = await getDb();
  const id = uuidv4();
  const now = nowIso();

  await db.execute(
    `INSERT INTO documents
       (id, file_path, file_size_bytes, fingerprint, title, author,
        page_count, import_status, error_message, created_at, updated_at)
     VALUES (?,?,?,?,?,?,NULL,'pending',NULL,?,?)`,
    [id, params.filePath, params.fileSizeBytes, params.fingerprint,
     params.title ?? null, params.author ?? null, now, now]
  );

  const rows = await db.select<DocumentRow>(
    `SELECT * FROM documents WHERE id = ?`, [id]
  );
  return rowToDocument(rows[0]);
}

export async function getDocumentById(id: string): Promise<Document | null> {
  const db = await getDb();
  const rows = await db.select<DocumentRow>(
    `SELECT * FROM documents WHERE id = ?`, [id]
  );
  return rows.length > 0 ? rowToDocument(rows[0]) : null;
}

export async function getDocumentByFingerprint(fingerprint: string): Promise<Document | null> {
  const db = await getDb();
  const rows = await db.select<DocumentRow>(
    `SELECT * FROM documents WHERE fingerprint = ?`, [fingerprint]
  );
  return rows.length > 0 ? rowToDocument(rows[0]) : null;
}

export async function getAllDocuments(): Promise<DocumentWithProgress[]> {
  const db = await getDb();
  const rows = await db.select<DocumentRow & {
    last_opened_at: string | null;
    page_index: number | null;
    scroll_top: number | null;
    zoom_level: number | null;
  }>(
    `SELECT d.*,
       rp.last_opened_at,
       rp.page_index,
       rp.scroll_top,
       rp.zoom_level
     FROM documents d
     LEFT JOIN reading_progress rp ON rp.document_id = d.id
     ORDER BY COALESCE(rp.last_opened_at, d.created_at) DESC`
  );

  return rows.map(row => ({
    ...rowToDocument(row),
    lastOpenedAt: row.last_opened_at,
    currentPage: row.page_index ?? 0,
    scrollTop: row.scroll_top ?? 0,
    zoomLevel: row.zoom_level ?? 1.0,
  }));
}

export async function updateDocumentStatus(params: {
  id: string;
  importStatus: ImportStatus;
  title?: string | null;
  author?: string | null;
  pageCount?: number | null;
  errorMessage?: string | null;
}): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE documents SET
       import_status = ?,
       title = COALESCE(?, title),
       author = COALESCE(?, author),
       page_count = COALESCE(?, page_count),
       error_message = ?,
       updated_at = ?
     WHERE id = ?`,
    [params.importStatus, params.title ?? null, params.author ?? null,
     params.pageCount ?? null, params.errorMessage ?? null, nowIso(), params.id]
  );
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await getDb();
  await db.execute(`DELETE FROM documents WHERE id = ?`, [id]);
}

export async function relinkDocument(id: string, newPath: string, newFingerprint: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE documents SET
       file_path = ?,
       fingerprint = ?,
       import_status = 'ready',
       error_message = NULL,
       updated_at = ?
     WHERE id = ?`,
    [newPath, newFingerprint, nowIso(), id]
  );
}
