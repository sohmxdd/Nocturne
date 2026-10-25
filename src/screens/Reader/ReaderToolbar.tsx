import { useState, useCallback } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { Document } from '../../types';
import styles from './ReaderToolbar.module.css';

interface Props {
  doc: Document;
  pdf: PDFDocumentProxy;
  currentPage: number;
  onPageChange: (page: number) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFitWidth: () => void;
  onZoomChange: (zoom: number) => void;
  onFocusMode: () => void;
  onBack: () => void;
  hasTextLayer: boolean;
}

export default function ReaderToolbar({
  doc, pdf, currentPage, onPageChange, zoom, onZoomIn, onZoomOut,
  onZoomFitWidth, onFocusMode, onBack, hasTextLayer,
}: Props) {
  const [pageInput, setPageInput] = useState('');
  const [editing, setEditing] = useState(false);
  const totalPages = pdf.numPages;
  const zoomPct = Math.round(zoom * 100);

  const handlePageSubmit = useCallback(() => {
    const n = parseInt(pageInput, 10);
    if (!isNaN(n) && n >= 1 && n <= totalPages) {
      onPageChange(n - 1); // 0-based
    }
    setEditing(false);
    setPageInput('');
  }, [pageInput, totalPages, onPageChange]);

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Reader controls">
      {/* Back */}
      <button className={styles.backBtn} onClick={onBack} title="Back to library" aria-label="Back to library">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>

      {/* Title */}
      <div className={styles.docTitle} title={doc.filePath}>
        {doc.title ?? doc.filePath.split(/[\\/]/).pop() ?? 'Untitled'}
      </div>

      <div className={styles.spacer} />

      {/* Page navigation */}
      <div className={styles.pageNav} role="group" aria-label="Page navigation">
        <button className={styles.navBtn} onClick={() => onPageChange(0)} disabled={currentPage === 0} title="First page" aria-label="First page">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/>
          </svg>
        </button>
        <button className={styles.navBtn} onClick={() => onPageChange(Math.max(0, currentPage - 1))} disabled={currentPage === 0} title="Previous page (←)" aria-label="Previous page">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        {editing ? (
          <input
            className={styles.pageInput}
            type="number"
            min={1}
            max={totalPages}
            value={pageInput}
            onChange={e => setPageInput(e.target.value)}
            onBlur={handlePageSubmit}
            onKeyDown={e => { if (e.key === 'Enter') handlePageSubmit(); if (e.key === 'Escape') { setEditing(false); setPageInput(''); } }}
            autoFocus
            aria-label={`Page number, 1 to ${totalPages}`}
          />
        ) : (
          <button
            className={styles.pageDisplay}
            onClick={() => { setEditing(true); setPageInput(String(currentPage + 1)); }}
            title="Click to jump to page"
            aria-label={`Page ${currentPage + 1} of ${totalPages}. Click to jump.`}
          >
            {currentPage + 1}
            <span className={styles.pageTotal}>/ {totalPages}</span>
          </button>
        )}

        <button className={styles.navBtn} onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))} disabled={currentPage >= totalPages - 1} title="Next page (→)" aria-label="Next page">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
        <button className={styles.navBtn} onClick={() => onPageChange(totalPages - 1)} disabled={currentPage >= totalPages - 1} title="Last page" aria-label="Last page">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/>
          </svg>
        </button>
      </div>

      {/* Zoom */}
      <div className={styles.zoomControls} role="group" aria-label="Zoom controls">
        <button className={styles.navBtn} onClick={onZoomOut} title="Zoom out (Ctrl -)" aria-label="Zoom out" disabled={zoom <= 0.5}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </button>
        <button className={styles.zoomDisplay} onClick={onZoomFitWidth} title="Fit to width (click) · Reset zoom (Ctrl+0)" aria-label={`${zoomPct}% zoom. Click to fit width.`}>
          {zoomPct}%
        </button>
        <button className={styles.navBtn} onClick={onZoomIn} title="Zoom in (Ctrl +)" aria-label="Zoom in" disabled={zoom >= 4.0}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </button>
      </div>

      {/* Focus mode */}
      <button className={styles.toolBtn} onClick={onFocusMode} title="Focus mode (F)" aria-label="Enter focus mode">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
        </svg>
      </button>
    </div>
  );
}
