// ============================================================
// NOCTURNE — PDF.js Service
// Handles loading, rendering, text extraction, and fingerprinting.
// ============================================================

import * as pdfjs from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

// Configure PDF.js worker
// We use the bundled worker via URL to avoid cross-origin issues in Tauri
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export type PdfMetadata = {
  title: string | null;
  author: string | null;
  pageCount: number;
  outline: PdfOutlineItem[];
  isEncrypted: boolean;
  hasTextLayer: boolean; // false for scanned/image PDFs
};

export type PdfOutlineItem = {
  title: string;
  pageIndex: number | null;
  children: PdfOutlineItem[];
};

export type TextContent = Awaited<ReturnType<PDFPageProxy['getTextContent']>>;
export type TextItem = { str: string; dir?: string; width?: number; height?: number; transform?: number[]; fontName?: string; hasEOL?: boolean };
export type RenderParameters = Parameters<PDFPageProxy['render']>[0];
export type RefProxy = Parameters<PDFDocumentProxy['getPageIndex']>[0];

export type RenderResult = {
  canvas: HTMLCanvasElement;
  textContent: TextContent | null;
};

export type ExtractionProgress = {
  pageIndex: number;
  totalPages: number;
  done: boolean;
};

// ── Document loading ──────────────────────────────────────
export async function loadPdfFromBuffer(buffer: ArrayBuffer): Promise<PDFDocumentProxy> {
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  return loadingTask.promise;
}

export async function loadPdfFromUrl(url: string): Promise<PDFDocumentProxy> {
  const loadingTask = pdfjs.getDocument({ url });
  return loadingTask.promise;
}

// ── Metadata extraction ───────────────────────────────────
export async function extractMetadata(pdf: PDFDocumentProxy): Promise<PdfMetadata> {
  let title: string | null = null;
  let author: string | null = null;

  try {
    const meta = await pdf.getMetadata();
    const info = meta.info as Record<string, unknown>;
    title = (info['Title'] as string) || null;
    author = (info['Author'] as string) || null;
  } catch {
    // Metadata extraction failure is not fatal
  }

  // Build outline
  let outline: PdfOutlineItem[] = [];
  try {
    const rawOutline = await pdf.getOutline();
    if (rawOutline) {
      outline = await buildOutline(pdf, rawOutline);
    }
  } catch {
    // No outline is fine
  }

  // Check if PDF has text layer by sampling first page
  let hasTextLayer = false;
  try {
    const page = await pdf.getPage(1);
    const textContent = await page.getTextContent();
    hasTextLayer = textContent.items.length > 0;
  } catch {
    // Assume no text layer
  }

  return {
    title,
    author,
    pageCount: pdf.numPages,
    outline,
    isEncrypted: false, // PDF.js throws on encrypted PDFs before we get here
    hasTextLayer,
  };
}

type RawOutlineItem = {
  title: string;
  dest: unknown;
  items: RawOutlineItem[];
};

async function buildOutline(
  pdf: PDFDocumentProxy,
  items: RawOutlineItem[]
): Promise<PdfOutlineItem[]> {
  const result: PdfOutlineItem[] = [];
  for (const item of items) {
    let pageIndex: number | null = null;
    try {
      if (item.dest) {
        let dest = item.dest;
        if (typeof dest === 'string') {
          dest = (await pdf.getDestination(dest)) as unknown as unknown[];
        }
        if (Array.isArray(dest) && dest.length > 0) {
          const ref = dest[0];
          if (typeof ref === 'object' && ref !== null && 'num' in ref) {
            pageIndex = await pdf.getPageIndex(ref as RefProxy);
          }
        }
      }
    } catch {
      // Ignore destination resolution errors
    }

    result.push({
      title: item.title,
      pageIndex,
      children: item.items?.length > 0
        ? await buildOutline(pdf, item.items)
        : [],
    });
  }
  return result;
}

// ── Page rendering ────────────────────────────────────────
export async function renderPage(
  page: PDFPageProxy,
  canvas: HTMLCanvasElement,
  scale: number
): Promise<void> {
  const viewport = page.getViewport({ scale });
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get 2D canvas context');

  const renderContext: RenderParameters = {
    canvasContext: ctx,
    viewport,
  };

  const renderTask = page.render(renderContext);
  await renderTask.promise;
}

// ── Page dimensions ───────────────────────────────────────
export function getPageDimensions(
  page: PDFPageProxy,
  scale: number
): { width: number; height: number } {
  const viewport = page.getViewport({ scale });
  return { width: viewport.width, height: viewport.height };
}

// ── Text content ──────────────────────────────────────────
export async function getPageTextContent(
  page: PDFPageProxy
): Promise<TextContent | null> {
  try {
    return await page.getTextContent();
  } catch {
    return null;
  }
}

export function textContentToString(textContent: TextContent): string {
  return textContent.items
    .map(item => ('str' in item ? (item as { str: string }).str : ''))
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Text extraction for AI indexing ──────────────────────
export type ChunkParams = {
  documentId: string;
  pageIndex: number;
  chunkIndex: number;
  content: string;
};

export async function* extractAllText(
  pdf: PDFDocumentProxy,
  signal?: AbortSignal
): AsyncGenerator<{ chunks: ChunkParams[]; progress: ExtractionProgress }> {
  const CHUNK_SIZE = 600; // characters per chunk
  const OVERLAP = 100;

  for (let i = 1; i <= pdf.numPages; i++) {
    if (signal?.aborted) break;

    const chunks: ChunkParams[] = [];
    try {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const fullText = textContentToString(textContent);

      if (fullText.length > 0) {
        // Split into overlapping chunks
        let pos = 0;
        let chunkIndex = 0;
        while (pos < fullText.length) {
          const end = Math.min(pos + CHUNK_SIZE, fullText.length);
          const content = fullText.slice(pos, end).trim();
          if (content.length > 20) { // Skip very short chunks
            chunks.push({
              documentId: '', // filled by caller
              pageIndex: i - 1, // 0-based
              chunkIndex,
              content,
            });
            chunkIndex++;
          }
          pos += CHUNK_SIZE - OVERLAP;
        }
      }
    } catch {
      // Page extraction failure — skip page
    }

    yield {
      chunks,
      progress: {
        pageIndex: i - 1,
        totalPages: pdf.numPages,
        done: i === pdf.numPages,
      },
    };
  }
}

// ── Fingerprint ───────────────────────────────────────────
/**
 * Compute a lightweight fingerprint from the first 64KB of a PDF buffer.
 * Not cryptographically secure, but sufficient for duplicate detection.
 */
export async function computeBufferFingerprint(buffer: ArrayBuffer): Promise<string> {
  const SAMPLE_SIZE = Math.min(65536, buffer.byteLength);
  const sample = buffer.slice(0, SAMPLE_SIZE);

  if ('crypto' in globalThis && globalThis.crypto?.subtle) {
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', sample);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return `${hashHex}-${buffer.byteLength}`;
    } catch {
      // Fall through to manual hash
    }
  }

  // Fallback: FNV-1a 32-bit hash
  const view = new Uint8Array(sample);
  let hash = 2166136261;
  for (const byte of view) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return `fnv-${hash.toString(16)}-${buffer.byteLength}`;
}
