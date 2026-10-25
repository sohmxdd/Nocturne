import { useState, type ReactNode } from 'react';
import styles from './Tooltip.module.css';

export interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  shortcut?: string;
}

export function Tooltip({ content, children, position = 'bottom', shortcut }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className={styles.wrapper}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className={`${styles.tooltip} ${styles[position]}`} role="tooltip">
          <span>{content}</span>
          {shortcut && <kbd className={styles.shortcut}>{shortcut}</kbd>}
        </div>
      )}
    </div>
  );
}
