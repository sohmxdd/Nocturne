// ============================================================
// NOCTURNE — Annotations Repository
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { getDb, nowIso } from './database';
import type { Annotation, AnnotationRect, HighlightColor } from '../../types';

type AnnotationRow = {
  id: string;
  document_id: string;
  page_index: number;
  rects_json: string;
  selected_text: string;
  anchor_prefix: string | null;
  anchor_suffix: string | null;
  color: string;
  note_content: string | null;
  is_deleted: number;
  created_at: string;
  updated_at: string;
};

function rowToAnnotation(row: AnnotationRow): Annotation {
  return {
    id: row.id,
    documentId: row.document_id,
    pageIndex: row.page_index,
    rectsJson: JSON.parse(row.rects_json) as AnnotationRect[],
    selectedText: row.selected_text,
    anchorPrefix: row.anchor_prefix,
    anchorSuffix: row.anchor_suffix,
    color: row.color as HighlightColor,
    noteContent: row.note_content,
    isDeleted: row.is_deleted === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createAnnotation(params: {
  documentId: string;
  pageIndex: number;
  rects: AnnotationRect[];
  selectedText: string;
  anchorPrefix?: string | null;
  anchorSuffix?: string | null;
  color: HighlightColor;
  noteContent?: string | null;
}): Promise<Annotation> {
  const db = await getDb();
  const id = uuidv4();
  const now = nowIso();
  const rectsJson = JSON.stringify(params.rects);

  // Enforce max lengths
  const selectedText = params.selectedText.slice(0, 500);
  const anchorPrefix = params.anchorPrefix?.slice(0, 100) ?? null;
  const anchorSuffix = params.anchorSuffix?.slice(0, 100) ?? null;
  const noteContent = params.noteContent?.slice(0, 4000) ?? null;

  await db.execute(
    `INSERT INTO annotations
       (id, document_id, page_index, rects_json, selected_text,
        anchor_prefix, anchor_suffix, color, note_content,
        is_deleted, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,0,?,?)`,
    [id, params.documentId, params.pageIndex, rectsJson, selectedText,
     anchorPrefix, anchorSuffix, params.color, noteContent, now, now]
  );

  const rows = await db.select<AnnotationRow>(
    `SELECT * FROM annotations WHERE id = ?`, [id]
  );
  return rowToAnnotation(rows[0]);
}

export async function getAnnotationsForDocument(documentId: string): Promise<Annotation[]> {
  const db = await getDb();
  const rows = await db.select<AnnotationRow>(
    `SELECT * FROM annotations
     WHERE document_id = ? AND is_deleted = 0
     ORDER BY page_index ASC, created_at ASC`,
    [documentId]
  );
  return rows.map(rowToAnnotation);
}

export async function getAnnotationsForPage(
  documentId: string,
  pageIndex: number
): Promise<Annotation[]> {
  const db = await getDb();
  const rows = await db.select<AnnotationRow>(
    `SELECT * FROM annotations
     WHERE document_id = ? AND page_index = ? AND is_deleted = 0
     ORDER BY created_at ASC`,
    [documentId, pageIndex]
  );
  return rows.map(rowToAnnotation);
}

export async function updateAnnotationNote(id: string, noteContent: string | null): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE annotations SET note_content = ?, updated_at = ? WHERE id = ?`,
    [noteContent?.slice(0, 4000) ?? null, nowIso(), id]
  );
}

export async function updateAnnotationColor(id: string, color: HighlightColor): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE annotations SET color = ?, updated_at = ? WHERE id = ?`,
    [color, nowIso(), id]
  );
}

export async function softDeleteAnnotation(id: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE annotations SET is_deleted = 1, updated_at = ? WHERE id = ?`,
    [nowIso(), id]
  );
}

export async function restoreAnnotation(id: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE annotations SET is_deleted = 0, updated_at = ? WHERE id = ?`,
    [nowIso(), id]
  );
}

export async function hardDeleteAnnotation(id: string): Promise<void> {
  const db = await getDb();
  await db.execute(`DELETE FROM annotations WHERE id = ?`, [id]);
}

export async function searchAnnotations(
  documentId: string,
  query: string
): Promise<Annotation[]> {
  const db = await getDb();
  const q = `%${query.toLowerCase()}%`;
  const rows = await db.select<AnnotationRow>(
    `SELECT * FROM annotations
     WHERE document_id = ?
       AND is_deleted = 0
       AND (LOWER(selected_text) LIKE ? OR LOWER(note_content) LIKE ?)
     ORDER BY page_index ASC`,
    [documentId, q, q]
  );
  return rows.map(rowToAnnotation);
}

export async function searchAllAnnotations(query: string): Promise<Annotation[]> {
  const db = await getDb();
  const q = `%${query.toLowerCase()}%`;
  const rows = await db.select<AnnotationRow>(
    `SELECT * FROM annotations
     WHERE is_deleted = 0
       AND (LOWER(selected_text) LIKE ? OR LOWER(note_content) LIKE ?)
     ORDER BY created_at DESC
     LIMIT 100`,
    [q, q]
  );
  return rows.map(rowToAnnotation);
}
