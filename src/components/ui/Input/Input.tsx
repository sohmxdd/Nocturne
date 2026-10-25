import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import styles from './Input.module.css';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  rightElement?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, rightElement, className = '', id, ...rest }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={`${styles.wrapper} ${className}`}>
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
          </label>
        )}
        <div className={`${styles.inputContainer} ${error ? styles.hasError : ''}`}>
          {icon && <span className={styles.icon}>{icon}</span>}
          <input
            ref={ref}
            id={inputId}
            className={`${styles.input} ${icon ? styles.withIcon : ''}`}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...rest}
          />
          {rightElement && <div className={styles.rightElement}>{rightElement}</div>}
        </div>
        {error && (
          <p id={`${inputId}-error`} className={styles.error} role="alert">
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={`${inputId}-hint`} className={styles.hint}>
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
