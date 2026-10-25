import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import styles from './IconButton.module.css';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'secondary' | 'accent' | 'danger';
  active?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, icon, size = 'md', variant = 'ghost', active = false, className = '', ...rest }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        className={`${styles.iconBtn} ${styles[size]} ${styles[variant]} ${active ? styles.active : ''} ${className}`}
        {...rest}
      >
        {icon}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
