import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  className?: string;
};

const VARIANT_CLASSES: Record<string, string> = {
  primary: 'bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-[var(--text-inverse)]',
  secondary: 'bg-[var(--bg-surface-muted)] hover:bg-[var(--border-default)] text-[var(--text-primary)] border border-[var(--border-default)]',
  ghost: 'border-2 border-dashed border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]',
  danger: 'bg-[var(--danger-action)] hover:bg-[var(--danger-action-hover)] text-[var(--text-inverse)]',
};

export function Button({ variant = 'primary', className = '', children, ...rest }: ButtonProps) {
  const variantClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary;
  const base = 'rounded-md font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]';
  return (
    <button className={`${base} ${variantClass} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function IconButton({ className = '', children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = 'inline-flex items-center justify-center rounded-md p-2 transition-colors text-[var(--text-muted)] hover:bg-[var(--bg-surface-muted)]';
  return (
    <button className={`${base} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export default Button;
