import { describe, it, expect, beforeEach } from 'vitest';
import { getDb } from '../../src/services/db/database';
import {
  createDocument,
  getDocumentById,
  getAllDocuments,
  deleteDocument,
  updateDocumentStatus,
} from '../../src/services/db/documents';
import {
  upsertReadingProgress,
  getReadingProgress,
  touchLastOpened,
} from '../../src/services/db/reading-progress';
import {
  createBookmark,
  getBookmarksForDocument,
  deleteBookmark,
} from '../../src/services/db/bookmarks';
import {
  createAnnotation,
  getAnnotationsForDocument,
  updateAnnotationNote,
  softDeleteAnnotation,
} from '../../src/services/db/annotations';

describe('Database Repositories & In-Memory Store', () => {
  beforeEach(async () => {
    const db = await getDb();
    await db.close();
  });

  it('creates, retrieves, and updates document records', async () => {
    const doc = await createDocument({
      filePath: 'C:/docs/paper.pdf',
      fileSizeBytes: 2048576,
      fingerprint: 'sha256-test-fingerprint',
      title: 'Attention Is All You Need',
      author: 'Vaswani et al.',
    });

    expect(doc.id).toBeDefined();
    expect(doc.title).toBe('Attention Is All You Need');
    expect(doc.importStatus).toBe('pending');

    const fetched = await getDocumentById(doc.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.filePath).toBe('C:/docs/paper.pdf');

    await updateDocumentStatus({ id: doc.id, pageCount: 15, importStatus: 'ready' });
    const updated = await getDocumentById(doc.id);
    expect(updated?.pageCount).toBe(15);
    expect(updated?.importStatus).toBe('ready');

    const all = await getAllDocuments();
    expect(all.length).toBeGreaterThanOrEqual(1);

    await deleteDocument(doc.id);
    const afterDelete = await getDocumentById(doc.id);
    expect(afterDelete).toBeNull();
  });

  it('upserts and retrieves reading progress', async () => {
    const docId = 'doc-progress-test';
    await upsertReadingProgress({
      documentId: docId,
      pageIndex: 3,
      scrollTop: 0.25,
      zoomLevel: 1.25,
      readingMode: 'default',
    });

    const progress = await getReadingProgress(docId);
    expect(progress).not.toBeNull();
    expect(progress?.pageIndex).toBe(3);
    expect(progress?.zoomLevel).toBe(1.25);

    await touchLastOpened(docId);
    const updated = await getReadingProgress(docId);
    expect(updated?.lastOpenedAt).toBeDefined();
  });

  it('creates and manages bookmarks', async () => {
    const docId = 'doc-bm-test';
    const bm1 = await createBookmark({
      documentId: docId,
      pageIndex: 2,
      scrollTop: 0.1,
      label: 'Introduction Section',
    });

    expect(bm1.id).toBeDefined();
    expect(bm1.label).toBe('Introduction Section');

    const bms = await getBookmarksForDocument(docId);
    expect(bms.length).toBe(1);

    await deleteBookmark(bm1.id);
    const afterDelete = await getBookmarksForDocument(docId);
    expect(afterDelete.length).toBe(0);
  });

  it('creates, notes, and soft-deletes annotations', async () => {
    const docId = 'doc-ann-test';
    const ann = await createAnnotation({
      documentId: docId,
      pageIndex: 4,
      rects: [{ x: 50, y: 100, width: 300, height: 18 }],
      selectedText: 'Self-attention mechanism relates different positions',
      color: 'teal',
      noteContent: 'Crucial insight for parallelization',
    });

    expect(ann.id).toBeDefined();
    expect(ann.color).toBe('teal');

    const list = await getAnnotationsForDocument(docId);
    expect(list.length).toBe(1);
    expect(list[0].selectedText).toContain('Self-attention');

    await updateAnnotationNote(ann.id, 'Updated note comment');
    const updatedList = await getAnnotationsForDocument(docId);
    expect(updatedList[0].noteContent).toBe('Updated note comment');

    await softDeleteAnnotation(ann.id);
    const activeList = await getAnnotationsForDocument(docId);
    expect(activeList.length).toBe(0);
  });
});
