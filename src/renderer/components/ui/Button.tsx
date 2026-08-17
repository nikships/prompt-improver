import type { ButtonHTMLAttributes, FC, ReactNode } from 'react';
import styles from './Button.module.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'accent';
  children: ReactNode;
}

export const Button: FC<ButtonProps> = ({
  variant = 'primary',
  className = '',
  children,
  disabled,
  ...props
}) => {
  const variantClass =
    variant === 'ghost' ? styles.ghost : variant === 'accent' ? styles.accent : styles.primary;

  return (
    <button
      className={`${styles.button} ${variantClass} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
