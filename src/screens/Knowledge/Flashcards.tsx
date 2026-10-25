import { useState, useMemo } from 'react';
import type { Annotation } from '../../types';
import styles from './Flashcards.module.css';

interface Card {
  id: string;
  front: string;
  back: string;
  citation: string;
}

interface Props {
  annotations: Array<Annotation & { documentTitle?: string }>;
}

export default function Flashcards({ annotations }: Props) {
  const cards: Card[] = useMemo(() => {
    if (annotations.length === 0) return [];
    return annotations.map((ann, idx) => ({
      id: ann.id || `card-${idx}`,
      front: ann.noteContent
        ? `What concept or takeaway relates to: "${ann.noteContent}"?`
        : `Recall the significance or context of this highlighted passage:`,
      back: ann.selectedText,
      citation: `${ann.documentTitle || 'Document'} · Page ${ann.pageIndex + 1}`,
    }));
  }, [annotations]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredCount, setMasteredCount] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);

  const currentCard = cards[currentIndex];

  const handleNext = (mastered: boolean) => {
    if (mastered) setMasteredCount(prev => prev + 1);
    setReviewedCount(prev => prev + 1);
    setIsFlipped(false);
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Completed deck or loop
      setCurrentIndex(0);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setMasteredCount(0);
    setReviewedCount(0);
  };

  if (cards.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>📇</div>
        <h3>No Flashcards Available</h3>
        <p>
          Highlights and annotations you make in your documents automatically populate
          your active recall deck. Open a document and create a few highlights to start
          practicing!
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Progress Header */}
      <div className={styles.progressHeader}>
        <div className={styles.cardCounter}>
          Card {currentIndex + 1} of {cards.length}
        </div>
        <div className={styles.stats}>
          <span className={styles.statPill}>Reviewed: {reviewedCount}</span>
          <span className={`${styles.statPill} ${styles.masteredPill}`}>
            Mastered: {masteredCount}
          </span>
          <button className={styles.resetBtn} onClick={handleReset}>
            Reset Deck
          </button>
        </div>
      </div>

      {/* 3D Flip Card */}
      <div
        className={`${styles.cardWrapper} ${isFlipped ? styles.flipped : ''}`}
        onClick={() => setIsFlipped(!isFlipped)}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            setIsFlipped(!isFlipped);
          }
        }}
        aria-label="Click to flip flashcard"
      >
        <div className={styles.cardInner}>
          {/* Card Front */}
          <div className={styles.cardFront}>
            <div className={styles.cardBadge}>Question / Prompt</div>
            <div className={styles.cardPrompt}>{currentCard.front}</div>
            <div className={styles.cardHint}>Click or press Space to reveal answer</div>
          </div>

          {/* Card Back */}
          <div className={styles.cardBack}>
            <div className={styles.cardBadgeBack}>Answer / Passage</div>
            <div className={styles.cardAnswer}>“{currentCard.back}”</div>
            <div className={styles.citationBadge}>{currentCard.citation}</div>
          </div>
        </div>
      </div>

      {/* Action Controls */}
      <div className={styles.actionsBar}>
        <button
          className={`${styles.rateBtn} ${styles.againBtn}`}
          onClick={e => {
            e.stopPropagation();
            handleNext(false);
          }}
        >
          🔄 Review Again
        </button>
        <button
          className={`${styles.rateBtn} ${styles.goodBtn}`}
          onClick={e => {
            e.stopPropagation();
            handleNext(true);
          }}
        >
          ✓ Mastered
        </button>
      </div>
    </div>
  );
}
