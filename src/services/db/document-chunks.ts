// ============================================================
// NOCTURNE — Document Chunks Repository (for AI retrieval)
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { getDb, nowIso } from './database';
import type { DocumentChunk, SearchResult } from '../../types';

type ChunkRow = {
  id: string;
  document_id: string;
  page_index: number;
  chunk_index: number;
  content: string;
  char_count: number;
  created_at: string;
};

function rowToChunk(row: ChunkRow): DocumentChunk {
  return {
    id: row.id,
    documentId: row.document_id,
    pageIndex: row.page_index,
    chunkIndex: row.chunk_index,
    content: row.content,
    charCount: row.char_count,
    createdAt: row.created_at,
  };
}

export async function insertChunks(chunks: {
  documentId: string;
  pageIndex: number;
  chunkIndex: number;
  content: string;
}[]): Promise<void> {
  const db = await getDb();
  const now = nowIso();

  for (const chunk of chunks) {
    const id = uuidv4();
    await db.execute(
      `INSERT OR REPLACE INTO document_chunks
         (id, document_id, page_index, chunk_index, content, char_count, created_at)
       VALUES (?,?,?,?,?,?,?)`,
      [id, chunk.documentId, chunk.pageIndex, chunk.chunkIndex,
       chunk.content, chunk.content.length, now]
    );
  }
}

export async function deleteChunksForDocument(documentId: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    `DELETE FROM document_chunks WHERE document_id = ?`, [documentId]
  );
}

export async function getChunksForPage(
  documentId: string,
  pageIndex: number
): Promise<DocumentChunk[]> {
  const db = await getDb();
  const rows = await db.select<ChunkRow>(
    `SELECT * FROM document_chunks
     WHERE document_id = ? AND page_index = ?
     ORDER BY chunk_index ASC`,
    [documentId, pageIndex]
  );
  return rows.map(rowToChunk);
}

export async function getPageText(documentId: string, pageIndex: number): Promise<string> {
  const chunks = await getChunksForPage(documentId, pageIndex);
  return chunks.map(c => c.content).join(' ');
}

/**
 * Full-text search across document chunks using SQLite LIKE.
 * FTS5 virtual table requires more complex triggers to keep in sync;
 * for now we use case-insensitive LIKE which is sufficient for M3.
 * FTS5 can be layered on top once we need BM25 ranking.
 */
export async function searchChunks(
  documentId: string,
  query: string,
  limit = 8
): Promise<SearchResult[]> {
  const db = await getDb();
  const terms = query.trim().split(/\s+/).filter(t => t.length > 2);

  if (terms.length === 0) return [];

  // Simple multi-term LIKE search — each term must appear somewhere
  const conditions = terms.map(() => `LOWER(content) LIKE ?`).join(' AND ');
  const params: unknown[] = [
    ...terms.map(t => `%${t.toLowerCase()}%`),
    documentId,
    limit,
  ];

  const rows = await db.select<ChunkRow & { score: number }>(
    `SELECT *, 1.0 as score FROM document_chunks
     WHERE ${conditions} AND document_id = ?
     ORDER BY page_index ASC
     LIMIT ?`,
    params
  );

  return rows.map(row => {
    // Extract a relevant snippet around the first matching term
    const termPos = row.content.toLowerCase().indexOf(terms[0].toLowerCase());
    const snippetStart = Math.max(0, termPos - 60);
    const snippetEnd = Math.min(row.content.length, termPos + 120);
    const snippet = row.content.slice(snippetStart, snippetEnd).trim();

    return {
      chunk: rowToChunk(row),
      score: row.score,
      snippet: (snippetStart > 0 ? '…' : '') + snippet + (snippetEnd < row.content.length ? '…' : ''),
    };
  });
}

export async function hasChunks(documentId: string): Promise<boolean> {
  const db = await getDb();
  const rows = await db.select<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM document_chunks WHERE document_id = ?`,
    [documentId]
  );
  return (rows[0]?.cnt ?? 0) > 0;
}
