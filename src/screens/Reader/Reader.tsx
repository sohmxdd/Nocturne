import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getDocumentById } from '../../services/db/documents';
import { getReadingProgress, upsertReadingProgress, touchLastOpened } from '../../services/db/reading-progress';
import { getAnnotationsForDocument } from '../../services/db/annotations';
import { getBookmarksForDocument } from '../../services/db/bookmarks';
import { getThreadsForDocument } from '../../services/db/agent-threads';
import { loadPdfFromUrl } from '../../services/pdf/pdf-service';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { Document, PdfMetadata } from '../../types';
import { extractMetadata } from '../../services/pdf/pdf-service';
import ReaderToolbar from './ReaderToolbar';
import ReaderSidebar from './ReaderSidebar';
import PdfCanvas from './PdfCanvas';
import AnnotationLayer from './AnnotationLayer';
import BeaconPanel from '../Beacon/BeaconPanel';
import styles from './Reader.module.css';

export default function Reader() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useApp();

  // Reader state
  const [doc, setDoc] = useState<Document | null>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [meta, setMeta] = useState<PdfMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const [focusMode, setFocusMode] = useState(false);

  // Progress save timer
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  const ZOOM_LEVELS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0];

  // ── Load document ────────────────────────────────────────
  useEffect(() => {
    if (!documentId) { navigate('/'); return; }

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);

      try {
        const docRecord = await getDocumentById(documentId!);
        if (!docRecord) { setError('Document not found.'); setLoading(false); return; }

        setDoc(docRecord);
        dispatch({ type: 'SET_CURRENT_DOCUMENT', payload: documentId! });

        // Load progress
        await touchLastOpened(documentId!);
        const progress = await getReadingProgress(documentId!);
        const savedPage = progress?.pageIndex ?? 0;
        const savedZoom = progress?.zoomLevel ?? 1.0;

        setCurrentPage(savedPage);
        setZoom(savedZoom);
        dispatch({ type: 'SET_READING_PROGRESS', payload: progress });

        // Load annotations and bookmarks
        const [annotations, bookmarks, threads] = await Promise.all([
          getAnnotationsForDocument(documentId!),
          getBookmarksForDocument(documentId!),
          getThreadsForDocument(documentId!),
        ]);
        dispatch({ type: 'SET_ANNOTATIONS', payload: annotations });
        dispatch({ type: 'SET_BOOKMARKS', payload: bookmarks });
        dispatch({ type: 'SET_THREADS', payload: threads });

        // Load PDF
        if (!cancelled) {
          try {
            const pdfDoc = await loadPdfFromUrl(
              // In Tauri we'd use asset:// protocol; in browser dev we'd need a blob URL
              // For now, use the file path directly (works in browser dev with local server or data URLs)
              docRecord.filePath
            );
            if (!cancelled) {
              const pdfMeta = await extractMetadata(pdfDoc);
              setPdf(pdfDoc);
              setMeta(pdfMeta);
              setLoading(false);
            }
          } catch {
            if (!cancelled) {
              setError('Could not open this PDF. The file may have been moved, deleted, or is not a valid PDF.');
              setLoading(false);
            }
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError('Failed to load document data.');
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [documentId, navigate, dispatch]);

  // ── Save progress (debounced) ─────────────────────────────
  const saveProgress = useCallback((page: number, zoomLevel: number) => {
    if (!documentId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await upsertReadingProgress({
          documentId,
          pageIndex: page,
          scrollTop: 0,
          zoomLevel,
        });
      } catch (e) {
        console.error('[Reader] Failed to save progress:', e);
      }
    }, 500);
  }, [documentId]);

  // Save on page or zoom change
  useEffect(() => { saveProgress(currentPage, zoom); }, [currentPage, zoom, saveProgress]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (documentId) {
        upsertReadingProgress({ documentId, pageIndex: currentPage, scrollTop: 0, zoomLevel: zoom })
          .catch(() => {});
      }
    };
  }, [documentId, currentPage, zoom]);

  // ── Zoom controls ─────────────────────────────────────────
  const zoomIn = useCallback(() => {
    setZoom(z => {
      const next = ZOOM_LEVELS.find(l => l > z) ?? ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
      return next;
    });
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(z => {
      const prev = [...ZOOM_LEVELS].reverse().find(l => l < z) ?? ZOOM_LEVELS[0];
      return prev;
    });
  }, []);

  const zoomFitWidth = useCallback(() => {
    if (!pdfContainerRef.current || !pdf) return;
    // Compute scale for fit-width
    pdf.getPage(currentPage + 1).then(page => {
      const vp = page.getViewport({ scale: 1 });
      const containerWidth = pdfContainerRef.current!.clientWidth - 80; // margin
      setZoom(Math.max(0.5, Math.min(4.0, containerWidth / vp.width)));
    });
  }, [pdf, currentPage]);

  // ── Keyboard shortcuts ────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'j') {
        if (!e.ctrlKey && !e.metaKey) setCurrentPage(p => Math.min((pdf?.numPages ?? 1) - 1, p + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'k') {
        if (!e.ctrlKey && !e.metaKey) setCurrentPage(p => Math.max(0, p - 1));
      } else if ((e.ctrlKey || e.metaKey) && e.key === '=') {
        e.preventDefault(); zoomIn();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault(); zoomOut();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault(); setZoom(1.0);
      } else if (e.key === 'Escape') {
        if (state.beaconOpen) dispatch({ type: 'SET_BEACON_OPEN', payload: false });
        else if (state.sidebarOpen && focusMode) dispatch({ type: 'SET_SIDEBAR_OPEN', payload: false });
        else if (focusMode) setFocusMode(false);
      } else if (e.key === 'f' && !e.ctrlKey && !e.metaKey) {
        setFocusMode(f => !f);
      } else if (e.key === 'b' && !e.ctrlKey && !e.metaKey) {
        dispatch({ type: 'SET_BEACON_OPEN', payload: !state.beaconOpen });
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pdf, zoomIn, zoomOut, state.beaconOpen, state.sidebarOpen, focusMode, dispatch]);

  // ── Page annotations ──────────────────────────────────────
  const pageAnnotations = useMemo(
    () => state.annotations.filter(a => a.pageIndex === currentPage),
    [state.annotations, currentPage]
  );

  // ── Render ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.loadingSpinner} role="status" aria-label="Loading document" />
        <p>Opening document…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorState}>
        <div className={styles.errorIcon}>⚠</div>
        <h2>Cannot open document</h2>
        <p>{error}</p>
        <button className={styles.backBtn} onClick={() => navigate('/')}>← Back to library</button>
      </div>
    );
  }

  if (!pdf || !doc) return null;

  return (
    <div className={`${styles.root} ${focusMode ? styles.focusMode : ''}`}>
      {/* Toolbar */}
      {!focusMode && (
        <ReaderToolbar
          doc={doc}
          pdf={pdf}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          zoom={zoom}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onZoomFitWidth={zoomFitWidth}
          onZoomChange={setZoom}
          onFocusMode={() => setFocusMode(true)}
          onBack={() => navigate('/')}
          hasTextLayer={meta?.hasTextLayer ?? false}
        />
      )}

      <div className={styles.body}>
        {/* Sidebar */}
        {!focusMode && state.sidebarOpen && (
          <ReaderSidebar
            pdf={pdf}
            outline={meta?.outline ?? []}
            annotations={state.annotations}
            bookmarks={state.bookmarks}
            currentPage={currentPage}
            onNavigate={setCurrentPage}
            documentId={doc.id}
          />
        )}

        {/* PDF canvas area */}
        <div className={styles.canvasArea} ref={pdfContainerRef}>
          <div className={styles.pageWrapper}>
            {!meta?.hasTextLayer && (
              <div className={styles.noTextBanner} role="status">
                <span>⚠</span>
                This PDF has no text layer — search, highlight, and AI features are unavailable for this document.
              </div>
            )}
            <PdfCanvas
              pdf={pdf}
              pageIndex={currentPage}
              scale={zoom}
              onPageChange={setCurrentPage}
            />
            <AnnotationLayer
              annotations={pageAnnotations}
              scale={zoom}
              pageIndex={currentPage}
              documentId={doc.id}
              pdf={pdf}
              onAnnotationCreated={ann => dispatch({ type: 'ADD_ANNOTATION', payload: ann })}
              onAnnotationSelect={id => dispatch({ type: 'SET_SELECTED_ANNOTATION', payload: id })}
            />
          </div>
        </div>

        {/* Context Beacon panel */}
        {state.beaconOpen && (
          <BeaconPanel
            documentId={doc.id}
            currentPage={currentPage}
            selectedText={state.selectedText}
            onClose={() => dispatch({ type: 'SET_BEACON_OPEN', payload: false })}
            doc={doc}
          />
        )}
      </div>

      {/* Beacon trigger */}
      <button
        className={`${styles.beaconTrigger} ${state.beaconOpen ? styles.beaconActive : ''}`}
        onClick={() => dispatch({ type: 'SET_BEACON_OPEN', payload: !state.beaconOpen })}
        title={state.beaconOpen ? 'Close Context Beacon (B)' : 'Open Context Beacon (B)'}
        aria-label={state.beaconOpen ? 'Close Context Beacon' : 'Open Context Beacon'}
        data-testid="beacon-trigger"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      </button>

      {/* Focus mode exit hint */}
      {focusMode && (
        <button className={styles.focusExitHint} onClick={() => setFocusMode(false)} aria-label="Exit focus mode">
          Press Esc or click to exit focus mode
        </button>
      )}
    </div>
  );
}
