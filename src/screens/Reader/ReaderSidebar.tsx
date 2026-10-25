import { useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { Annotation, Bookmark } from '../../types';
import { createBookmark, deleteBookmark } from '../../services/db/bookmarks';
import { useApp } from '../../context/AppContext';
import styles from './ReaderSidebar.module.css';

type PdfOutlineItem = {
  title: string;
  pageIndex: number | null;
  children: PdfOutlineItem[];
};

interface Props {
  pdf: PDFDocumentProxy;
  outline: PdfOutlineItem[];
  annotations: Annotation[];
  bookmarks: Bookmark[];
  currentPage: number;
  onNavigate: (page: number) => void;
  documentId: string;
}

function BookmarkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function OutlineItem({ item, onNavigate, depth = 0 }: { item: PdfOutlineItem; onNavigate: (p: number) => void; depth?: number }) {
  const [open, setOpen] = useState(depth < 1);
  return (
    <div>
      <div className={styles.outlineItem} style={{ paddingLeft: `${12 + depth * 14}px` }}>
        {item.children.length > 0 && (
          <button className={styles.outlineToggle} onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label={open ? 'Collapse' : 'Expand'}>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} aria-hidden="true">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        )}
        <button
          className={`${styles.outlineBtn} ${item.children.length === 0 ? styles.outlineBtnLeaf : ''}`}
          onClick={() => item.pageIndex != null && onNavigate(item.pageIndex)}
          disabled={item.pageIndex == null}
          title={item.title}
        >
          {item.title}
        </button>
        {item.pageIndex != null && <span className={styles.outlinePage}>{item.pageIndex + 1}</span>}
      </div>
      {open && item.children.map((child, i) => (
        <OutlineItem key={i} item={child} onNavigate={onNavigate} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function ReaderSidebar({ pdf, outline, annotations, bookmarks, currentPage, onNavigate, documentId }: Props) {
  const { state, dispatch } = useApp();
  const [tab, setTab] = useState<'outline' | 'bookmarks' | 'annotations'>(
    outline.length > 0 ? 'outline' : 'bookmarks'
  );
  const [bookmarkLabel, setBookmarkLabel] = useState('');
  const [addingBookmark, setAddingBookmark] = useState(false);

  const handleAddBookmark = async () => {
    const bm = await createBookmark({ documentId, pageIndex: currentPage, scrollTop: 0, label: bookmarkLabel || null });
    dispatch({ type: 'ADD_BOOKMARK', payload: bm });
    setBookmarkLabel('');
    setAddingBookmark(false);
  };

  const handleDeleteBookmark = async (id: string) => {
    await deleteBookmark(id);
    dispatch({ type: 'REMOVE_BOOKMARK', payload: id });
  };

  const colorDot: Record<string, string> = {
    amber: '#e6b873', teal: '#79c9b4', violet: '#a78bfa', rose: '#f28b9b'
  };

  return (
    <aside className={styles.sidebar} aria-label="Document navigation">
      {/* Tabs */}
      <div className={styles.tabs} role="tablist">
        {outline.length > 0 && (
          <button className={`${styles.tab} ${tab === 'outline' ? styles.tabActive : ''}`} onClick={() => setTab('outline')} role="tab" aria-selected={tab === 'outline'} id="tab-outline" aria-controls="panel-outline">
            Contents
          </button>
        )}
        <button className={`${styles.tab} ${tab === 'bookmarks' ? styles.tabActive : ''}`} onClick={() => setTab('bookmarks')} role="tab" aria-selected={tab === 'bookmarks'} id="tab-bookmarks" aria-controls="panel-bookmarks">
          Bookmarks
        </button>
        <button className={`${styles.tab} ${tab === 'annotations' ? styles.tabActive : ''}`} onClick={() => setTab('annotations')} role="tab" aria-selected={tab === 'annotations'} id="tab-annotations" aria-controls="panel-annotations">
          Highlights
        </button>
      </div>

      {/* Outline panel */}
      {tab === 'outline' && (
        <div className={styles.panel} id="panel-outline" role="tabpanel" aria-labelledby="tab-outline">
          {outline.length === 0 ? (
            <div className={styles.empty}>No table of contents in this document.</div>
          ) : (
            <div className={styles.outlineList}>
              {outline.map((item, i) => <OutlineItem key={i} item={item} onNavigate={onNavigate} />)}
            </div>
          )}
        </div>
      )}

      {/* Bookmarks panel */}
      {tab === 'bookmarks' && (
        <div className={styles.panel} id="panel-bookmarks" role="tabpanel" aria-labelledby="tab-bookmarks">
          <div className={styles.panelHeader}>
            <span>Bookmarks · {bookmarks.length}</span>
            <button className={styles.addBtn} onClick={() => setAddingBookmark(a => !a)} title="Add bookmark for current page" aria-label="Add bookmark">+</button>
          </div>
          {addingBookmark && (
            <div className={styles.addBookmarkForm}>
              <input
                className={styles.bmInput}
                placeholder={`Label (optional) — p. ${currentPage + 1}`}
                value={bookmarkLabel}
                onChange={e => setBookmarkLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddBookmark(); if (e.key === 'Escape') setAddingBookmark(false); }}
                autoFocus
                maxLength={200}
                aria-label="Bookmark label"
              />
              <button className={styles.saveSmBtn} onClick={handleAddBookmark}>Save</button>
            </div>
          )}
          {bookmarks.length === 0 && !addingBookmark && (
            <div className={styles.empty}>No bookmarks yet. Click + to mark the current page.</div>
          )}
          <div className={styles.list}>
            {bookmarks.map(bm => (
              <div key={bm.id} className={`${styles.listItem} ${bm.pageIndex === currentPage ? styles.listItemCurrent : ''}`}>
                <button className={styles.listItemBtn} onClick={() => onNavigate(bm.pageIndex)}>
                  <BookmarkIcon />
                  <span className={styles.listItemText}>{bm.label ?? `Page ${bm.pageIndex + 1}`}</span>
                  <span className={styles.listItemPage}>{bm.pageIndex + 1}</span>
                </button>
                <button className={styles.deleteItemBtn} onClick={() => handleDeleteBookmark(bm.id)} title="Remove bookmark" aria-label="Remove bookmark">×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Annotations panel */}
      {tab === 'annotations' && (
        <div className={styles.panel} id="panel-annotations" role="tabpanel" aria-labelledby="tab-annotations">
          <div className={styles.panelHeader}>
            <span>Highlights · {annotations.filter(a => !a.isDeleted).length}</span>
          </div>
          {annotations.filter(a => !a.isDeleted).length === 0 ? (
            <div className={styles.empty}>No highlights yet. Select text on the page to create one.</div>
          ) : (
            <div className={styles.list}>
              {annotations.filter(a => !a.isDeleted).map(ann => (
                <div key={ann.id} className={`${styles.annotItem} ${ann.pageIndex === currentPage ? styles.listItemCurrent : ''}`}>
                  <button className={styles.annotBtn} onClick={() => onNavigate(ann.pageIndex)}>
                    <span className={styles.annotDot} style={{ background: colorDot[ann.color] }} aria-hidden="true" />
                    <div className={styles.annotContent}>
                      <div className={styles.annotText}>{ann.selectedText}</div>
                      {ann.noteContent && <div className={styles.annotNote}>{ann.noteContent}</div>}
                    </div>
                    <span className={styles.listItemPage}>{ann.pageIndex + 1}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
