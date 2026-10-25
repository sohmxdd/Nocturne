// ============================================================
// NOCTURNE — Document Import Service
// Orchestrates: file reading → fingerprint → DB insert →
//               metadata extraction → text extraction.
// ============================================================

import { computeBufferFingerprint, extractMetadata, extractAllText, loadPdfFromBuffer } from './pdf-service';
import {
  createDocument,
  getDocumentByFingerprint,
  updateDocumentStatus,
} from '../db/documents';
import { insertChunks } from '../db/document-chunks';
import type { Document, NocturneError } from '../../types';

export type ImportResult =
  | { ok: true; document: Document; isDuplicate: false }
  | { ok: true; document: Document; isDuplicate: true }
  | { ok: false; error: NocturneError };

export type ExtractionProgressCallback = (progress: {
  pageIndex: number;
  totalPages: number;
  done: boolean;
}) => void;

/**
 * Import a PDF from an ArrayBuffer (e.g. loaded via Tauri file read or
 * drag-and-drop File API in browser dev mode).
 */
export async function importPdfFromBuffer(
  buffer: ArrayBuffer,
  filePath: string,
  fileSizeBytes: number,
  onExtractionProgress?: ExtractionProgressCallback,
  signal?: AbortSignal
): Promise<ImportResult> {
  // 1. Compute fingerprint
  const fingerprint = await computeBufferFingerprint(buffer);

  // 2. Check for duplicate
  const existing = await getDocumentByFingerprint(fingerprint);
  if (existing) {
    return { ok: true, document: existing, isDuplicate: true };
  }

  // 3. Try to load PDF
  let pdf;
  try {
    pdf = await loadPdfFromBuffer(buffer);
  } catch {
    return {
      ok: false,
      error: {
        code: 'INVALID_PDF',
        message: 'This file could not be read as a PDF.',
        detail: 'The file may be corrupted, password-protected, or not a valid PDF.',
      },
    };
  }

  // 4. Extract metadata
  const metadata = await extractMetadata(pdf);

  // 5. Create document record
  const doc = await createDocument({
    filePath,
    fileSizeBytes,
    fingerprint,
    title: metadata.title,
    author: metadata.author,
  });

  // 6. Update with page count & ready status
  await updateDocumentStatus({
    id: doc.id,
    importStatus: 'ready',
    title: metadata.title,
    author: metadata.author,
    pageCount: metadata.pageCount,
  });

  // 7. Extract text in background (non-blocking for large PDFs)
  if (metadata.hasTextLayer) {
    extractTextBackground(doc.id, pdf, onExtractionProgress, signal);
  }

  return { ok: true, document: { ...doc, importStatus: 'ready', pageCount: metadata.pageCount }, isDuplicate: false };
}

/** Fire-and-forget background text extraction */
async function extractTextBackground(
  documentId: string,
  pdf: import('pdfjs-dist').PDFDocumentProxy,
  onProgress?: ExtractionProgressCallback,
  signal?: AbortSignal
) {
  try {
    const chunkBatch: Parameters<typeof insertChunks>[0] = [];

    for await (const { chunks, progress } of extractAllText(pdf, signal)) {
      for (const chunk of chunks) {
        chunkBatch.push({ ...chunk, documentId });
      }
      // Insert in batches of 50 pages worth of chunks
      if (chunkBatch.length >= 200 || progress.done) {
        await insertChunks(chunkBatch.splice(0));
      }
      onProgress?.(progress);
    }
  } catch (e) {
    console.error('[Import] Text extraction failed:', e);
  }
}

/**
 * Import a PDF from a File object (drag-and-drop in browser dev mode).
 */
export async function importPdfFromFile(
  file: File,
  onExtractionProgress?: ExtractionProgressCallback,
  signal?: AbortSignal
): Promise<ImportResult> {
  const buffer = await file.arrayBuffer();
  return importPdfFromBuffer(
    buffer,
    file.name,
    file.size,
    onExtractionProgress,
    signal
  );
}
