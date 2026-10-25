import { useState, useCallback, useRef, useEffect } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { Annotation, HighlightColor, AnnotationRect } from '../../types';
import { createAnnotation, updateAnnotationNote, updateAnnotationColor, softDeleteAnnotation } from '../../services/db/annotations';
import styles from './AnnotationLayer.module.css';

interface Props {
  annotations: Annotation[];
  scale: number;
  pageIndex: number;
  documentId: string;
  pdf: PDFDocumentProxy;
  onAnnotationCreated: (ann: Annotation) => void;
  onAnnotationSelect: (id: string | null) => void;
}

const COLORS: HighlightColor[] = ['amber', 'teal', 'violet', 'rose'];
const COLOR_LABELS: Record<HighlightColor, string> = {
  amber: 'Amber', teal: 'Teal', violet: 'Violet', rose: 'Rose',
};

interface SelectionState {
  rects: DOMRect[];
  text: string;
  visible: boolean;
  x: number;
  y: number;
}

interface PopupState {
  annotationId: string;
  x: number;
  y: number;
  note: string;
  color: HighlightColor;
}

export default function AnnotationLayer({
  annotations, scale, pageIndex, documentId, pdf, onAnnotationCreated, onAnnotationSelect
}: Props) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [selectedColor, setSelectedColor] = useState<HighlightColor>('amber');
  const [savingNote, setSavingNote] = useState(false);

  // Listen for text selections
  useEffect(() => {
    function onSelectionChange() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        setSelection(null);
        return;
      }
      const text = sel.toString().trim();
      if (text.length < 2) { setSelection(null); return; }

      const range = sel.getRangeAt(0);
      const rects = Array.from(range.getClientRects());
      if (rects.length === 0) { setSelection(null); return; }

      const lastRect = rects[rects.length - 1];
      setSelection({
        rects,
        text,
        visible: true,
        x: lastRect.right,
        y: lastRect.bottom,
      });
    }

    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, []);

  const handleHighlight = useCallback(async () => {
    if (!selection || !selection.text || !layerRef.current) return;

    // Convert DOM rects to PDF coordinate space
    const layerRect = layerRef.current.getBoundingClientRect();
    const pdfRects: AnnotationRect[] = selection.rects.map(r => ({
      x: (r.left - layerRect.left) / scale,
      y: (r.top - layerRect.top) / scale,
      width: r.width / scale,
      height: r.height / scale,
    }));

    // Get anchor text for re-anchoring (30 chars before/after)
    const sel = window.getSelection();
    let anchorPrefix: string | null = null;
    let anchorSuffix: string | null = null;
    if (sel?.rangeCount) {
      const range = sel.getRangeAt(0);
      const container = range.commonAncestorContainer.textContent ?? '';
      const startOffset = range.startOffset;
      anchorPrefix = container.slice(Math.max(0, startOffset - 30), startOffset);
      anchorSuffix = container.slice(range.endOffset, range.endOffset + 30);
    }

    window.getSelection()?.removeAllRanges();
    setSelection(null);

    try {
      const ann = await createAnnotation({
        documentId,
        pageIndex,
        rects: pdfRects,
        selectedText: selection.text,
        anchorPrefix,
        anchorSuffix,
        color: selectedColor,
      });
      onAnnotationCreated(ann);
    } catch (e) {
      console.error('[AnnotationLayer] Failed to create annotation:', e);
    }
  }, [selection, scale, documentId, pageIndex, selectedColor, onAnnotationCreated]);

  const handleAnnotationClick = useCallback((ann: Annotation, e: React.MouseEvent) => {
    e.stopPropagation();
    onAnnotationSelect(ann.id);
    setPopup({
      annotationId: ann.id,
      x: e.clientX,
      y: e.clientY,
      note: ann.noteContent ?? '',
      color: ann.color,
    });
  }, [onAnnotationSelect]);

  const handleSaveNote = useCallback(async () => {
    if (!popup) return;
    setSavingNote(true);
    try {
      await updateAnnotationNote(popup.annotationId, popup.note || null);
      if (popup.color) await updateAnnotationColor(popup.annotationId, popup.color);
    } finally {
      setSavingNote(false);
      setPopup(null);
      onAnnotationSelect(null);
    }
  }, [popup, onAnnotationSelect]);

  const handleDelete = useCallback(async () => {
    if (!popup) return;
    if (!confirm('Delete this highlight?')) return;
    await softDeleteAnnotation(popup.annotationId);
    setPopup(null);
    onAnnotationSelect(null);
    // Parent should reload annotations via dispatch
  }, [popup, onAnnotationSelect]);

  // Dismiss popups on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (popup) {
        const popupEl = document.getElementById('annotation-popup');
        if (popupEl && !popupEl.contains(e.target as Node)) {
          setPopup(null);
          onAnnotationSelect(null);
        }
      }
      if (selection) {
        const toolEl = document.getElementById('selection-toolbar');
        if (!toolEl?.contains(e.target as Node)) {
          // Don't clear selection — let browser manage it
        }
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [popup, selection, onAnnotationSelect]);

  return (
    <div className={styles.layer} ref={layerRef}>
      {/* Existing highlights */}
      {annotations.map(ann => (
        <div key={ann.id} className={styles.highlightGroup}>
          {ann.rectsJson.map((rect, i) => (
            <div
              key={i}
              className={`${styles.highlight} ${styles[`color_${ann.color}`]}`}
              style={{
                left: rect.x * scale,
                top: rect.y * scale,
                width: rect.width * scale,
                height: rect.height * scale,
              }}
              onClick={e => handleAnnotationClick(ann, e)}
              title={ann.noteContent ? `Note: ${ann.noteContent.slice(0, 80)}` : ann.selectedText.slice(0, 80)}
              role="mark"
              aria-label={`Highlight: ${ann.selectedText.slice(0, 50)}`}
            />
          ))}
          {ann.noteContent && ann.rectsJson.length > 0 && (
            <div
              className={styles.noteIndicator}
              style={{
                left: (ann.rectsJson[ann.rectsJson.length - 1].x + ann.rectsJson[ann.rectsJson.length - 1].width) * scale,
                top: ann.rectsJson[ann.rectsJson.length - 1].y * scale,
              }}
              aria-hidden="true"
            />
          )}
        </div>
      ))}

      {/* Selection toolbar */}
      {selection && (
        <div
          id="selection-toolbar"
          className={styles.selectionToolbar}
          style={{ left: Math.min(selection.x, window.innerWidth - 280), top: selection.y + 8 }}
          role="toolbar"
          aria-label="Highlight options"
        >
          <div className={styles.colorPicker}>
            {COLORS.map(c => (
              <button
                key={c}
                className={`${styles.colorBtn} ${styles[`colorBtn_${c}`]} ${selectedColor === c ? styles.colorBtnSelected : ''}`}
                onClick={() => setSelectedColor(c)}
                title={COLOR_LABELS[c]}
                aria-label={`${COLOR_LABELS[c]} highlight`}
                aria-pressed={selectedColor === c}
              />
            ))}
          </div>
          <button className={styles.highlightBtn} onClick={handleHighlight} aria-label="Create highlight">
            Highlight
          </button>
        </div>
      )}

      {/* Annotation popup */}
      {popup && (
        <div
          id="annotation-popup"
          className={styles.annotationPopup}
          style={{
            left: Math.min(popup.x, window.innerWidth - 320),
            top: Math.min(popup.y + 8, window.innerHeight - 260),
          }}
          role="dialog"
          aria-label="Annotation options"
        >
          <div className={styles.popupColorRow}>
            {COLORS.map(c => (
              <button
                key={c}
                className={`${styles.colorBtn} ${styles[`colorBtn_${c}`]} ${popup.color === c ? styles.colorBtnSelected : ''}`}
                onClick={() => setPopup(p => p ? { ...p, color: c } : p)}
                aria-label={`${COLOR_LABELS[c]} highlight`}
                aria-pressed={popup.color === c}
              />
            ))}
          </div>
          <textarea
            className={styles.noteInput}
            placeholder="Add a note… (optional)"
            value={popup.note}
            onChange={e => setPopup(p => p ? { ...p, note: e.target.value } : p)}
            rows={3}
            maxLength={4000}
            aria-label="Annotation note"
          />
          <div className={styles.popupActions}>
            <button className={styles.deleteBtn} onClick={handleDelete} aria-label="Delete highlight">Delete</button>
            <div style={{ flex: 1 }} />
            <button className={styles.cancelBtn} onClick={() => { setPopup(null); onAnnotationSelect(null); }}>Cancel</button>
            <button className={styles.saveBtn} onClick={handleSaveNote} disabled={savingNote} aria-busy={savingNote}>
              {savingNote ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
