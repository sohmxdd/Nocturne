import { useEffect, useCallback, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getAllDocuments, deleteDocument } from '../../services/db/documents';
import { importPdfFromFile, importPdfFromBuffer } from '../../services/pdf/import-service';
import { openPdfDialog, IS_TAURI } from '../../lib/tauri';
import type { DocumentWithProgress } from '../../types';
import styles from './Library.module.css';

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 86400) return 'Today';
  if (diff < 172800) return 'Yesterday';
  return d.toLocaleDateString(undefined, {
    month: 'short', day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

function formatProgress(doc: DocumentWithProgress): string {
  if (!doc.pageCount) return '';
  const pct = Math.round(((doc.currentPage + 1) / doc.pageCount) * 100);
  return `p. ${doc.currentPage + 1} of ${doc.pageCount} · ${pct}%`;
}

// ── Icons ──────────────────────────────────────────────────
const BookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);
const MoonIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);
const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);
const KnowledgeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>
);

// ── Component ─────────────────────────────────────────────
export default function Library() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const loadDocuments = useCallback(async () => {
    dispatch({ type: 'SET_DOCUMENTS_LOADING', payload: true });
    try {
      const docs = await getAllDocuments();
      dispatch({ type: 'SET_DOCUMENTS', payload: docs });
    } catch (e) {
      console.error('[Library] Failed to load documents:', e);
      dispatch({ type: 'SET_DOCUMENTS', payload: [] });
    }
  }, [dispatch]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  const handleImportResult = useCallback(async (file: File) => {
    setImporting(true);
    setError(null);
    try {
      const result = await importPdfFromFile(file);
      if (result.ok) {
        if (result.isDuplicate) setError('This PDF is already in your library. Opening existing entry.');
        await loadDocuments();
        navigate(`/read/${result.document.id}`);
      } else {
        setError(result.error.message);
        setImporting(false);
      }
    } catch {
      setError('Unexpected error during import. Please try again.');
      setImporting(false);
    }
  }, [loadDocuments, navigate]);

  const handleOpenFile = useCallback(() => {
    if (importing) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,.pdf';
    input.style.display = 'none';
    input.onchange = () => {
      const file = input.files?.[0];
      document.body.removeChild(input);
      if (file) handleImportResult(file);
    };
    document.body.appendChild(input);
    input.click();
  }, [importing, handleImportResult]);

  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); dragCounter.current++; setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); dragCounter.current--; if (dragCounter.current === 0) setIsDragging(false); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    const file = Array.from(e.dataTransfer.files).find(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (!file) { setError('Please drop a valid PDF file.'); return; }
    await handleImportResult(file);
  }, [handleImportResult]);

  const handleDeleteDoc = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Remove this document from your library? All annotations and bookmarks will be deleted.')) return;
    try {
      await deleteDocument(id);
      await loadDocuments();
    } catch {
      setError('Failed to remove document.');
    }
  }, [loadDocuments]);

  const mostRecent = state.documents[0];

  return (
    <div
      className={`${styles.root} ${isDragging ? styles.dragging : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <MoonIcon />
          <span>Nocturne</span>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.iconBtn} onClick={() => navigate('/knowledge')} title="Knowledge space" aria-label="Knowledge space">
            <KnowledgeIcon />
          </button>
          <button className={styles.iconBtn} onClick={() => navigate('/settings')} title="Settings" aria-label="Settings">
            <SettingsIcon />
          </button>
        </div>
      </header>

      {/* Main */}
      <main className={styles.main}>
        {/* Import zone */}
        <section className={styles.importSection}>
          <div className={styles.importCard} onClick={!importing ? handleOpenFile : undefined} role={!importing ? 'button' : undefined} tabIndex={!importing ? 0 : undefined} onKeyDown={e => !importing && e.key === 'Enter' && handleOpenFile()}>
            {importing ? (
              <div className={styles.importingState}>
                <div className={styles.spinner} role="status" aria-label="Importing PDF" />
                <p>Importing PDF…</p>
              </div>
            ) : (
              <>
                <div className={styles.dropIcon}><BookIcon /></div>
                <h1 className={styles.importTitle}>Open a PDF</h1>
                <p className={styles.importSubtitle}>Drop a file here or click to browse</p>
                <div className={styles.openBtn} role="presentation">
                  <PlusIcon />
                  Open PDF
                </div>
              </>
            )}
          </div>
          {error && (
            <div className={styles.errorBanner} role="alert">
              <span>{error}</span>
              <button onClick={() => setError(null)} aria-label="Dismiss error">×</button>
            </div>
          )}
        </section>

        {/* Continue reading */}
        {mostRecent && (
          <section className={styles.continueSection}>
            <h2 className={styles.sectionTitle}>Continue reading</h2>
            <button className={styles.continueCard} onClick={() => navigate(`/read/${mostRecent.id}`)} data-testid="continue-reading-btn">
              <div className={styles.continueInfo}>
                <div className={styles.continueTitle}>{mostRecent.title ?? mostRecent.filePath.split(/[\\/]/).pop()}</div>
                {mostRecent.author && <div className={styles.continueAuthor}>{mostRecent.author}</div>}
                <div className={styles.continueMeta}>{formatProgress(mostRecent)} · {formatDate(mostRecent.lastOpenedAt)}</div>
              </div>
              {mostRecent.pageCount != null && (
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${Math.max(2, Math.round(((mostRecent.currentPage + 1) / mostRecent.pageCount) * 100))}%` }} />
                </div>
              )}
            </button>
          </section>
        )}

        {/* Document grid */}
        {state.documents.length > 0 && (
          <section className={styles.librarySection}>
            <h2 className={styles.sectionTitle}>Library · {state.documents.length} {state.documents.length === 1 ? 'document' : 'documents'}</h2>
            {state.documentsLoading ? (
              <div className={styles.grid}>
                {[1,2,3,4].map(i => <div key={i} className={`${styles.card} ${styles.cardSkeleton} skeleton`} />)}
              </div>
            ) : (
              <div className={styles.grid}>
                {state.documents.map(doc => (
                  <div
                    key={doc.id}
                    className={styles.card}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/read/${doc.id}`)}
                    onKeyDown={e => e.key === 'Enter' && navigate(`/read/${doc.id}`)}
                    data-testid={`doc-card-${doc.id}`}
                    aria-label={`Open ${doc.title ?? 'document'}`}
                  >
                    <div className={styles.cardIcon}><BookIcon /></div>
                    <div className={styles.cardBody}>
                      <div className={styles.cardTitle}>{doc.title ?? doc.filePath.split(/[\\/]/).pop() ?? 'Untitled'}</div>
                      {doc.author && <div className={styles.cardAuthor}>{doc.author}</div>}
                      <div className={styles.cardMeta}>{formatDate(doc.lastOpenedAt)} {doc.pageCount ? `· ${doc.pageCount} pages` : ''}</div>
                      {doc.importStatus === 'error' && <div className={styles.cardError}>⚠ {doc.errorMessage ?? 'Import error'}</div>}
                    </div>
                    {doc.pageCount != null && (
                      <div className={styles.cardProgress}>
                        <div className={styles.cardProgressFill} style={{ height: `${Math.max(4, Math.round(((doc.currentPage + 1) / doc.pageCount) * 100))}%` }} />
                      </div>
                    )}
                    <button className={styles.cardDelete} onClick={e => handleDeleteDoc(e, doc.id)} title="Remove from library" aria-label={`Remove ${doc.title ?? 'document'} from library`}>
                      <TrashIcon />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Empty state */}
        {!state.documentsLoading && state.documents.length === 0 && !importing && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}><BookIcon /></div>
            <h2>Your library is empty</h2>
            <p>Import a PDF to start reading. Your highlights, notes, and reading progress are saved automatically and persist across sessions.</p>
          </div>
        )}
      </main>

      {/* Global drag overlay */}
      {isDragging && (
        <div className={styles.globalDragOverlay} aria-hidden="true">
          <div className={styles.dropTarget}>
            <BookIcon />
            <span>Drop PDF to import</span>
          </div>
        </div>
      )}
    </div>
  );
}
