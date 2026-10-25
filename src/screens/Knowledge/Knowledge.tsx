import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getAllDocuments } from '../../services/db/documents';
import { getDb } from '../../services/db/database';
import type { Annotation, Document, HighlightColor } from '../../types';
import ThoughtTrails from './ThoughtTrails';
import Flashcards from './Flashcards';
import styles from './Knowledge.module.css';

type KnowledgeTab = 'highlights' | 'trails' | 'flashcards';

interface AnnotationWithDoc extends Annotation {
  documentTitle?: string;
  documentPath?: string;
}

export default function Knowledge() {
  const navigate = useNavigate();
  const { notify } = useApp();
  const [activeTab, setActiveTab] = useState<KnowledgeTab>('highlights');
  const [annotations, setAnnotations] = useState<AnnotationWithDoc[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColor, setSelectedColor] = useState<HighlightColor | 'all'>('all');
  const [selectedDocId, setSelectedDocId] = useState<string | 'all'>('all');

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const docs = await getAllDocuments();
        if (!active) return;
        setDocuments(docs);

        const db = await getDb();
        const rows = await db.select<Record<string, unknown>>(
          'SELECT * FROM annotations WHERE is_deleted = 0 ORDER BY created_at DESC'
        );

        if (!active) return;

        const docMap = new Map(docs.map(d => [d.id, d]));
        const enriched: AnnotationWithDoc[] = rows.map(r => {
          const doc = docMap.get(r['document_id'] as string);
          return {
            id: r['id'] as string,
            documentId: r['document_id'] as string,
            pageIndex: Number(r['page_index']),
            rectsJson: JSON.parse((r['rects_json'] as string) || '[]'),
            selectedText: (r['selected_text'] as string) || '',
            anchorPrefix: (r['anchor_prefix'] as string) || null,
            anchorSuffix: (r['anchor_suffix'] as string) || null,
            color: (r['color'] as HighlightColor) || 'amber',
            noteContent: (r['note_content'] as string) || null,
            isDeleted: Boolean(r['is_deleted']),
            createdAt: (r['created_at'] as string) || '',
            updatedAt: (r['updated_at'] as string) || '',
            documentTitle: doc?.title || doc?.filePath.split(/[\\/]/).pop() || 'Untitled',
            documentPath: doc?.filePath || '',
          };
        });

        setAnnotations(enriched);
      } catch (e) {
        console.error('[Knowledge] Failed to load annotations:', e);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return annotations.filter(ann => {
      if (selectedColor !== 'all' && ann.color !== selectedColor) return false;
      if (selectedDocId !== 'all' && ann.documentId !== selectedDocId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchText = ann.selectedText.toLowerCase().includes(q);
        const matchNote = ann.noteContent?.toLowerCase().includes(q);
        const matchDoc = ann.documentTitle?.toLowerCase().includes(q);
        if (!matchText && !matchNote && !matchDoc) return false;
      }
      return true;
    });
  }, [annotations, selectedColor, selectedDocId, searchQuery]);

  const handleCopyQuote = (ann: AnnotationWithDoc) => {
    const text = `"${ann.selectedText}" — p. ${ann.pageIndex + 1}, ${ann.documentTitle}`;
    navigator.clipboard.writeText(text);
    notify('Copied quote with citation to clipboard', 'success');
  };

  const handleExportMarkdown = () => {
    if (filtered.length === 0) {
      notify('No annotations to export', 'warning');
      return;
    }
    const lines = [
      `# Nocturne Reading Notes & Highlights`,
      `*Exported on ${new Date().toLocaleDateString()}*\n`,
    ];

    filtered.forEach(ann => {
      lines.push(`### ${ann.documentTitle} (Page ${ann.pageIndex + 1})`);
      lines.push(`> "${ann.selectedText}"\n`);
      if (ann.noteContent) {
        lines.push(`**Note:** ${ann.noteContent}\n`);
      }
      lines.push(`*Created: ${new Date(ann.createdAt).toLocaleString()}*\n---`);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nocturne-highlights-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Exported highlights to Markdown', 'success');
  };

  return (
    <div className={styles.container}>
      {/* Top Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            className={styles.backButton}
            onClick={() => navigate('/')}
            title="Back to Library"
            aria-label="Back to Library"
          >
            ← Library
          </button>
          <div className={styles.titleGroup}>
            <h1 className={styles.title}>Knowledge Space</h1>
            <p className={styles.subtitle}>
              Connect insights, cross-reference documents, and practice active recall
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className={styles.tabGroup} role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'highlights'}
            className={`${styles.navTab} ${activeTab === 'highlights' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('highlights')}
          >
            Highlights & Notes ({annotations.length})
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'trails'}
            className={`${styles.navTab} ${activeTab === 'trails' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('trails')}
          >
            Thought Trails
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'flashcards'}
            className={`${styles.navTab} ${activeTab === 'flashcards' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('flashcards')}
          >
            Flashcards & Review
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      {activeTab === 'highlights' && (
        <main className={styles.mainContent}>
          {/* Controls Bar */}
          <div className={styles.filterBar}>
            <div className={styles.searchBox}>
              <span className={styles.searchIcon}>🔍</span>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search across all quotes, notes, or titles..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                aria-label="Search highlights"
              />
              {searchQuery && (
                <button
                  className={styles.clearSearch}
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            <div className={styles.filtersRow}>
              {/* Document filter */}
              <select
                className={styles.select}
                value={selectedDocId}
                onChange={e => setSelectedDocId(e.target.value)}
                aria-label="Filter by document"
              >
                <option value="all">All Documents ({documents.length})</option>
                {documents.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.title || d.filePath.split(/[\\/]/).pop()}
                  </option>
                ))}
              </select>

              {/* Color filter */}
              <div className={styles.colorFilters}>
                {(['all', 'amber', 'teal', 'violet', 'rose'] as const).map(c => (
                  <button
                    key={c}
                    className={`${styles.colorChip} ${
                      selectedColor === c ? styles.activeColorChip : ''
                    } ${c !== 'all' ? styles[c] : ''}`}
                    onClick={() => setSelectedColor(c)}
                  >
                    {c === 'all' ? 'All Colors' : c}
                  </button>
                ))}
              </div>

              <button
                className={styles.exportBtn}
                onClick={handleExportMarkdown}
                title="Export filtered highlights to Markdown"
              >
                📥 Export Markdown
              </button>
            </div>
          </div>

          {/* Highlights Feed */}
          {loading ? (
            <div className={styles.centerMessage}>Loading your knowledge base...</div>
          ) : filtered.length === 0 ? (
            <div className={styles.emptyFeed}>
              <div className={styles.emptyIcon}>📖</div>
              <h3>No Highlights Found</h3>
              <p>
                {annotations.length === 0
                  ? 'Open any PDF in the reader and highlight text to start building your knowledge layer.'
                  : 'No highlights matched your current search filters.'}
              </p>
            </div>
          ) : (
            <div className={styles.cardGrid}>
              {filtered.map(ann => (
                <article
                  key={ann.id}
                  className={`${styles.card} ${styles[`card-${ann.color}`]}`}
                >
                  <div className={styles.cardHeader}>
                    <div className={styles.cardDoc}>
                      <span className={styles.docIcon}>📄</span>
                      <span className={styles.docTitle} title={ann.documentTitle}>
                        {ann.documentTitle}
                      </span>
                    </div>
                    <span className={styles.pageBadge}>p. {ann.pageIndex + 1}</span>
                  </div>

                  <blockquote className={styles.quote}>
                    “{ann.selectedText}”
                  </blockquote>

                  {ann.noteContent && (
                    <div className={styles.noteBox}>
                      <span className={styles.noteLabel}>Note:</span>
                      <p className={styles.noteText}>{ann.noteContent}</p>
                    </div>
                  )}

                  <div className={styles.cardFooter}>
                    <span className={styles.dateStamp}>
                      {new Date(ann.createdAt).toLocaleDateString()}
                    </span>
                    <div className={styles.cardActions}>
                      <button
                        className={styles.iconAction}
                        onClick={() => handleCopyQuote(ann)}
                        title="Copy Quote and Citation"
                        aria-label="Copy quote"
                      >
                        📋 Copy
                      </button>
                      <button
                        className={styles.primaryAction}
                        onClick={() => navigate(`/reader/${ann.documentId}`)}
                        title="Open in Reader"
                      >
                        Read →
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
      )}

      {activeTab === 'trails' && (
        <main className={styles.mainContent}>
          <ThoughtTrails annotations={annotations} />
        </main>
      )}

      {activeTab === 'flashcards' && (
        <main className={styles.mainContent}>
          <Flashcards annotations={annotations} />
        </main>
      )}
    </div>
  );
}
