import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  className?: string;
};

const VARIANT_CLASSES: Record<string, string> = {
  primary: 'bg-(--brand-primary) hover:bg-(--brand-primary-hover) text-(--text-inverse)',
  secondary: 'bg-(--bg-surface-muted) hover:bg-(--border-default) text-(--text-primary) border border-(--border-default)',
  ghost: 'border-2 border-dashed border-(--border-default) text-(--text-muted) hover:border-(--brand-primary) hover:text-(--brand-primary)',
  danger: 'bg-(--danger-action) hover:bg-(--danger-action-hover) text-(--text-inverse)',
};

export function Button({ variant = 'primary', className = '', children, ...rest }: ButtonProps) {
  const variantClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary;
  const base = 'rounded-md font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-(--brand-primary)';
  return (
    <button className={`${base} ${variantClass} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function IconButton({ className = '', children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = 'inline-flex items-center justify-center rounded-md p-2 transition-colors text-(--text-muted) hover:bg-(--bg-surface-muted)';
  return (
    <button className={`${base} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export default Button;
