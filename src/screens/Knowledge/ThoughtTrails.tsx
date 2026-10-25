import { useState } from 'react';
import type { Annotation } from '../../types';
import styles from './ThoughtTrails.module.css';

interface TrailItem {
  id: string;
  annotationId?: string;
  title: string;
  content: string;
  sourceDoc?: string;
  page?: number;
}

interface Trail {
  id: string;
  title: string;
  description: string;
  items: TrailItem[];
}

interface Props {
  annotations: Array<Annotation & { documentTitle?: string }>;
}

export default function ThoughtTrails({ annotations }: Props) {
  const [trails, setTrails] = useState<Trail[]>([
    {
      id: 'sample-trail-1',
      title: 'Foundations of Distributed Consensus',
      description: 'Key principles connecting Paxos invariants with Raft log replication guarantees.',
      items: [
        {
          id: 'item-1',
          title: 'State Machine Replication',
          content: 'All replicas execute state transitions in identical sequence from a deterministic start state.',
          sourceDoc: 'Designing Data-Intensive Applications',
          page: 348,
        },
        {
          id: 'item-2',
          title: 'Leader Election & Terms',
          content: 'Terms act as logical clocks, allowing servers to detect obsolete information such as stale leaders.',
          sourceDoc: 'In Search of an Understandable Consensus Algorithm',
          page: 4,
        },
      ],
    },
  ]);

  const [activeTrailId, setActiveTrailId] = useState<string>(trails[0]?.id || '');
  const [newTrailTitle, setNewTrailTitle] = useState('');
  const [newTrailDesc, setNewTrailDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const activeTrail = trails.find(t => t.id === activeTrailId);

  const handleCreateTrail = () => {
    if (!newTrailTitle.trim()) return;
    const newTrail: Trail = {
      id: `trail-${Date.now()}`,
      title: newTrailTitle.trim(),
      description: newTrailDesc.trim(),
      items: [],
    };
    setTrails(prev => [newTrail, ...prev]);
    setActiveTrailId(newTrail.id);
    setNewTrailTitle('');
    setNewTrailDesc('');
    setIsCreating(false);
  };

  const handleAddAnnotationToTrail = (ann: Annotation & { documentTitle?: string }) => {
    if (!activeTrail) return;
    const newItem: TrailItem = {
      id: `item-${Date.now()}`,
      annotationId: ann.id,
      title: ann.selectedText.slice(0, 40) + '...',
      content: ann.selectedText,
      sourceDoc: ann.documentTitle,
      page: ann.pageIndex + 1,
    };
    setTrails(prev =>
      prev.map(t =>
        t.id === activeTrail.id ? { ...t, items: [...t.items, newItem] } : t
      )
    );
  };

  const handleDeleteItem = (itemId: string) => {
    if (!activeTrail) return;
    setTrails(prev =>
      prev.map(t =>
        t.id === activeTrail.id
          ? { ...t, items: t.items.filter(i => i.id !== itemId) }
          : t
      )
    );
  };

  return (
    <div className={styles.trailsContainer}>
      {/* Sidebar: Trail List */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h3>Thought Trails</h3>
          <button
            className={styles.addBtn}
            onClick={() => setIsCreating(true)}
            title="Create new Thought Trail"
          >
            + New Trail
          </button>
        </div>

        {isCreating && (
          <div className={styles.createCard}>
            <input
              type="text"
              className={styles.input}
              placeholder="Trail Title..."
              value={newTrailTitle}
              onChange={e => setNewTrailTitle(e.target.value)}
              autoFocus
            />
            <textarea
              className={styles.textarea}
              placeholder="Core thesis or inquiry..."
              value={newTrailDesc}
              onChange={e => setNewTrailDesc(e.target.value)}
              rows={2}
            />
            <div className={styles.createActions}>
              <button className={styles.cancelBtn} onClick={() => setIsCreating(false)}>
                Cancel
              </button>
              <button
                className={styles.confirmBtn}
                onClick={handleCreateTrail}
                disabled={!newTrailTitle.trim()}
              >
                Create
              </button>
            </div>
          </div>
        )}

        <div className={styles.trailList}>
          {trails.map(t => (
            <button
              key={t.id}
              className={`${styles.trailItem} ${t.id === activeTrailId ? styles.activeTrailItem : ''}`}
              onClick={() => setActiveTrailId(t.id)}
            >
              <div className={styles.trailTitle}>{t.title}</div>
              <div className={styles.trailMeta}>{t.items.length} nodes</div>
            </button>
          ))}
        </div>
      </aside>

      {/* Main Trail Canvas */}
      <section className={styles.canvas}>
        {activeTrail ? (
          <div className={styles.trailView}>
            <div className={styles.trailHeader}>
              <h2>{activeTrail.title}</h2>
              {activeTrail.description && (
                <p className={styles.trailDescription}>{activeTrail.description}</p>
              )}
            </div>

            {/* Stepper / Timeline Nodes */}
            <div className={styles.timeline}>
              {activeTrail.items.length === 0 ? (
                <div className={styles.emptyTrail}>
                  <p>No nodes in this trail yet. Pick highlights from below to connect concepts into a cohesive thread.</p>
                </div>
              ) : (
                activeTrail.items.map((item, idx) => (
                  <div key={item.id} className={styles.timelineNode}>
                    <div className={styles.nodeIndicator}>
                      <span className={styles.nodeIndex}>{idx + 1}</span>
                      {idx < activeTrail.items.length - 1 && (
                        <div className={styles.nodeLine} />
                      )}
                    </div>
                    <div className={styles.nodeCard}>
                      <div className={styles.nodeCardHeader}>
                        <span className={styles.nodeTitle}>{item.title}</span>
                        {item.sourceDoc && (
                          <span className={styles.nodeCitation}>
                            {item.sourceDoc} · p.{item.page}
                          </span>
                        )}
                        <button
                          className={styles.removeNodeBtn}
                          onClick={() => handleDeleteItem(item.id)}
                          title="Remove node"
                        >
                          ✕
                        </button>
                      </div>
                      <p className={styles.nodeContent}>“{item.content}”</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick Attach Highlights Shelf */}
            <div className={styles.shelf}>
              <h4>Attach Available Highlights to This Trail:</h4>
              <div className={styles.shelfGrid}>
                {annotations.slice(0, 8).map(ann => (
                  <div key={ann.id} className={styles.shelfItem}>
                    <div className={styles.shelfText}>“{ann.selectedText}”</div>
                    <div className={styles.shelfFooter}>
                      <span>p.{ann.pageIndex + 1} · {ann.documentTitle}</span>
                      <button
                        className={styles.attachBtn}
                        onClick={() => handleAddAnnotationToTrail(ann)}
                      >
                        + Attach
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.emptyCanvas}>
            Select or create a Thought Trail to connect concepts across your readings.
          </div>
        )}
      </section>
    </div>
  );
}
