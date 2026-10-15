'use client';

import { useEffect } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { IconAlert, IconX } from './icons';

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

/* ---------------------------------- Card --------------------------------- */

export function Card({
  children,
  className = '',
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-ink-200/70 bg-white/85 backdrop-blur-sm shadow-card',
        hover && 'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover hover:border-brand-200',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  icon,
  action,
  className = '',
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-5 py-4 border-b border-ink-100', className)}>
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-brand-soft text-brand-600 ring-1 ring-inset ring-brand-100 text-[18px]">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="font-semibold text-ink-900 leading-tight truncate">{title}</h3>
          {subtitle && <p className="text-sm text-ink-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/* --------------------------------- Badge --------------------------------- */

type BadgeTone = 'brand' | 'accent' | 'emerald' | 'amber' | 'rose' | 'slate' | 'violet';

const BADGE_TONES: Record<BadgeTone, string> = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
  accent: 'bg-accent-50 text-accent-700 ring-accent-200',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
  slate: 'bg-ink-100 text-ink-600 ring-ink-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
};

export function Badge({
  children,
  tone = 'slate',
  className = '',
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset whitespace-nowrap',
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* --------------------------------- Button -------------------------------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus-ring disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]';

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-3 text-sm',
  };

  const variants: Record<ButtonVariant, string> = {
    primary:
      'bg-gradient-brand text-white shadow-glow hover:shadow-card-hover hover:brightness-[1.06]',
    secondary:
      'bg-white text-ink-700 border border-ink-200 shadow-soft hover:bg-ink-50 hover:border-ink-300',
    ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
    outline:
      'bg-white/60 text-brand-700 border border-brand-200 hover:bg-brand-50 hover:border-brand-300',
    danger: 'bg-gradient-rose text-white shadow-soft hover:brightness-[1.06]',
  };

  return (
    <button className={cn(base, sizes[size], variants[variant], className)} {...props}>
      {children}
    </button>
  );
}

/* --------------------------------- Inputs -------------------------------- */

const FIELD =
  'w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-800 placeholder:text-ink-400 shadow-soft transition-all duration-200 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10';

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD, className)} {...props} />;
}

export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(FIELD, 'resize-none', className)} {...props} />;
}

export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(FIELD, 'appearance-none bg-[length:16px] pr-9', className)} {...props}>
      {children}
    </select>
  );
}

export function Checkbox({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn(
        'h-4 w-4 shrink-0 cursor-pointer rounded border-ink-300 accent-brand-600 focus-ring disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      {...props}
    />
  );
}

export function Label({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <label className={cn('mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500', className)}>
      {children}
    </label>
  );
}

export function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

/* ------------------------------- Stat card ------------------------------- */

export function StatCard({
  label,
  value,
  icon,
  gradient = 'bg-gradient-brand',
  hint,
  delay = 0,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  /** Full Tailwind/utility class, e.g. "bg-gradient-accent" */
  gradient?: string;
  hint?: string;
  delay?: number;
}) {
  return (
    <div
      className="animate-fade-up rounded-2xl border border-ink-200/70 bg-white/85 p-5 shadow-card backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card-hover"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={cn('grid h-11 w-11 place-items-center rounded-xl text-[20px] text-white shadow-glow', gradient)}>
        {icon}
      </div>
      <div className="mt-4 text-2xl font-bold tracking-tight text-ink-900">{value}</div>
      <div className="text-sm font-medium text-ink-500">{label}</div>
      {hint && <div className="mt-1 text-xs text-ink-400">{hint}</div>}
    </div>
  );
}

/* ------------------------------ Page header ------------------------------ */

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-fade-up">
      <div>
        {eyebrow && (
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-100 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-brand" />
            {eyebrow}
          </div>
        )}
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink-900 sm:text-3xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

/* ------------------------------ Empty state ------------------------------ */

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-brand-soft text-brand-500 text-2xl ring-1 ring-inset ring-brand-100">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold text-ink-800">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* -------------------------------- Skeleton ------------------------------- */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={cn('shimmer-bar rounded-lg', className)} />;
}

/* ---------------------------------- Modal -------------------------------- */

export function Modal({
  open,
  onClose,
  header,
  footer,
  size = 'md',
  dismissible = true,
  closeClassName = '',
  children,
}: {
  open: boolean;
  onClose: () => void;
  header?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  dismissible?: boolean;
  closeClassName?: string;
  children?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) onClose();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, dismissible, onClose]);

  if (!open) return null;

  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-3xl' };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center">
      <div
        className="absolute inset-0 bg-ink-950/45 backdrop-blur-sm animate-fade-in"
        onClick={() => dismissible && onClose()}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-3xl border border-ink-200/70 bg-white shadow-card-hover animate-scale-in',
          widths[size],
        )}
      >
        <button
          type="button"
          onClick={() => dismissible && onClose()}
          disabled={!dismissible}
          aria-label="Close"
          className={cn(
            'absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg text-ink-400 transition hover:bg-ink-100 hover:text-ink-700 disabled:pointer-events-none',
            closeClassName,
          )}
        >
          <IconX className="text-[16px]" />
        </button>

        {header}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="shrink-0 border-t border-ink-100 bg-ink-50/60 px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

/* ------------------------------ Confirm dialog --------------------------- */

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  loadingLabel = 'Deleting…',
  cancelLabel = 'Cancel',
  tone = 'danger',
  loading = false,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  loadingLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'brand';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  const dismiss = () => { if (!loading) onCancel(); };

  return (
    <Modal
      open={open}
      onClose={dismiss}
      size="sm"
      dismissible={!loading}
      header={
        <div className="flex shrink-0 items-start gap-4 p-6 pr-14">
          <span
            className={cn(
              'grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-[22px] text-white shadow-glow',
              tone === 'danger' ? 'bg-gradient-rose' : 'bg-gradient-brand',
            )}
          >
            <IconAlert />
          </span>
          <div className="min-w-0">
            <h3 className="text-lg font-bold leading-tight text-ink-900">{title}</h3>
            {description && <div className="mt-1.5 text-sm text-ink-500">{description}</div>}
          </div>
        </div>
      }
      footer={
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={dismiss} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} disabled={loading}>
            {loading && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-[2px] border-white/40 border-t-white" />
            )}
            {loading ? loadingLabel : confirmLabel}
          </Button>
        </div>
      }
    >
      {children && <div className="px-6 pb-5 -mt-2">{children}</div>}
    </Modal>
  );
}
