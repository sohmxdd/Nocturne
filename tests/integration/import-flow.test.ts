import { describe, it, expect, beforeEach } from 'vitest';
import { getDb } from '../../src/services/db/database';
import {
  createDocument,
  getDocumentById,
  updateDocumentStatus,
  getAllDocuments,
} from '../../src/services/db/documents';
import {
  upsertReadingProgress,
  getReadingProgress,
} from '../../src/services/db/reading-progress';
import {
  createBookmark,
  getBookmarksForDocument,
} from '../../src/services/db/bookmarks';
import {
  createAnnotation,
  getAnnotationsForDocument,
} from '../../src/services/db/annotations';

describe('PDF Lifecycle Integration Flow', () => {
  beforeEach(async () => {
    const db = await getDb();
    await db.close();
  });

  it('runs complete lifecycle: import doc -> index -> read page -> annotate -> bookmark -> resume', async () => {
    // 1. Initial import of document
    const doc = await createDocument({
      filePath: 'C:/university/distributed-algorithms.pdf',
      fileSizeBytes: 4194304,
      fingerprint: 'sha256-dist-algo-v1',
      title: 'Distributed Algorithms',
      author: 'Nancy Lynch',
    });

    expect(doc.importStatus).toBe('pending');

    // 2. Background PDF processing completes
    await updateDocumentStatus({
      id: doc.id,
      importStatus: 'ready',
      pageCount: 300,
    });

    const readyDoc = await getDocumentById(doc.id);
    expect(readyDoc?.importStatus).toBe('ready');
    expect(readyDoc?.pageCount).toBe(300);

    // 3. User navigates and saves reading progress
    await upsertReadingProgress({
      documentId: doc.id,
      pageIndex: 12,
      scrollTop: 0.45,
      zoomLevel: 1.25,
      readingMode: 'default',
    });

    const progress = await getReadingProgress(doc.id);
    expect(progress?.pageIndex).toBe(12);
    expect(progress?.zoomLevel).toBe(1.25);

    // 4. User creates a highlight with a note
    const ann = await createAnnotation({
      documentId: doc.id,
      pageIndex: 12,
      rects: [{ x: 72, y: 300, width: 450, height: 16 }],
      selectedText: 'Byzantine agreements require strictly greater than 3m servers',
      color: 'amber',
      noteContent: '3m + 1 fault tolerance threshold',
    });

    expect(ann.id).toBeDefined();

    // 5. User bookmarks page
    const bm = await createBookmark({
      documentId: doc.id,
      pageIndex: 12,
      scrollTop: 0.45,
      label: 'Byzantine Fault Tolerance Bound',
    });

    expect(bm.id).toBeDefined();

    // 6. Verify library query includes aggregated progress
    const libraryDocs = await getAllDocuments();
    const docInLib = libraryDocs.find(d => d.id === doc.id);

    expect(docInLib).toBeDefined();
    expect(docInLib?.currentPage).toBe(12);
    expect(docInLib?.zoomLevel).toBe(1.25);

    // 7. Verify annotations and bookmarks query returns saved items
    const docAnns = await getAnnotationsForDocument(doc.id);
    expect(docAnns.length).toBe(1);
    expect(docAnns[0].selectedText).toContain('Byzantine agreements');

    const docBms = await getBookmarksForDocument(doc.id);
    expect(docBms.length).toBe(1);
    expect(docBms[0].label).toBe('Byzantine Fault Tolerance Bound');
  });
});
