import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { renderPage } from '../../services/pdf/pdf-service';
import styles from './PdfCanvas.module.css';

interface Props {
  pdf: PDFDocumentProxy;
  pageIndex: number;
  scale: number;
  onPageChange?: (page: number) => void;
}

type RenderState = 'idle' | 'rendering' | 'done' | 'error';

export default function PdfCanvas({ pdf, pageIndex, scale, onPageChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderState, setRenderState] = useState<RenderState>('idle');
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    let cancelled = false;

    async function render() {
      // Cancel any running render task
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }

      setRenderState('rendering');

      try {
        const page = await pdf.getPage(pageIndex + 1); // PDF.js is 1-indexed
        if (cancelled) return;

        if (canvasRef.current) {
          await renderPage(page, canvasRef.current, scale);
          if (!cancelled) setRenderState('done');
        }
      } catch (e) {
        if (!cancelled) {
          if ((e as Error)?.message?.includes('cancelled')) {
            // Normal - a new render started
          } else {
            console.error('[PdfCanvas] Render error:', e);
            setRenderState('error');
          }
        }
      }
    }

    render();
    return () => { cancelled = true; };
  }, [pdf, pageIndex, scale]);

  return (
    <div className={styles.canvasContainer}>
      {renderState === 'rendering' && (
        <div className={styles.renderOverlay} aria-hidden="true">
          <div className={styles.renderSpinner} />
        </div>
      )}
      {renderState === 'error' && (
        <div className={styles.renderError}>Failed to render page {pageIndex + 1}</div>
      )}
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label={`Page ${pageIndex + 1}`}
        style={{ opacity: renderState === 'done' ? 1 : 0.5 }}
      />
    </div>
  );
}
