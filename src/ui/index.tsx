import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'whatsapp';
const variants: Record<Variant, string> = {
  primary: 'bg-at-wine text-white hover:bg-at-wineDark shadow-sm',
  secondary: 'bg-white text-at-ink border border-at-line hover:bg-at-soft',
  ghost: 'text-at-ink hover:bg-at-soft',
  danger: 'bg-white text-red-700 border border-red-200 hover:bg-red-50',
  whatsapp: 'bg-[#1FA855] text-white hover:bg-[#178F47] shadow-sm',
};

export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg'; loading?: boolean }) {
  const sizes = { sm: 'h-9 px-3 text-sm gap-1.5', md: 'h-11 px-4 text-sm gap-2', lg: 'h-12 px-5 text-base gap-2' };
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx('inline-flex items-center justify-center rounded-xl font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none select-none', variants[variant], sizes[size], className)}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

export function IconButton({ className, children, label, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button {...rest} aria-label={label} title={label} className={cx('inline-flex items-center justify-center w-10 h-10 rounded-xl text-at-ink hover:bg-at-soft transition-colors', className)}>
      {children}
    </button>
  );
}

export function Card({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={cx('bg-at-card rounded-2xl border border-at-line shadow-soft', onClick && 'cursor-pointer hover:border-at-nude hover:shadow-lift transition-all', className)}>
      {children}
    </div>
  );
}

export function Badge({ tone = 'neutral', children, className }: { tone?: 'neutral' | 'wine' | 'green' | 'amber' | 'blue' | 'red' | 'gray'; children: ReactNode; className?: string }) {
  const tones = {
    neutral: 'bg-at-soft text-at-ink',
    wine: 'bg-at-blush text-at-wine',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-sky-50 text-sky-700',
    red: 'bg-red-50 text-red-700',
    gray: 'bg-stone-100 text-stone-600',
  };
  return <span className={cx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', tones[tone], className)}>{children}</span>;
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="block text-sm font-medium text-at-ink mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-at-muted mt-1">{hint}</span>}
    </label>
  );
}

const inputBase = 'w-full rounded-xl border border-at-line bg-white px-3.5 text-[15px] text-at-ink placeholder:text-at-muted/70 focus:outline-none focus:border-at-rose focus:ring-4 focus:ring-at-blush transition';

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cx(inputBase, 'h-11', className)} />;
}
export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cx(inputBase, 'py-2.5 min-h-[88px]', className)} />;
}
export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...rest} className={cx(inputBase, 'h-11', className)}>{children}</select>;
}

export function Spinner({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-at-muted gap-3">
      <Loader2 className="w-7 h-7 animate-spin text-at-rose" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center py-14 px-6">
      <div className="w-14 h-14 rounded-2xl bg-at-blush text-at-wine flex items-center justify-center mb-4">{icon}</div>
      <h3 className="font-display text-lg text-at-ink">{title}</h3>
      {text && <p className="text-sm text-at-muted mt-1 max-w-sm">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Janela que abre de baixo no celular e centralizada no computador. */
export function Sheet({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-at-ink/40 backdrop-blur-[2px] animate-[fadeIn_.15s_ease-out]" onClick={onClose} />
      <div className={cx('relative bg-at-bg w-full sm:rounded-2xl rounded-t-3xl shadow-lift flex flex-col max-h-[92vh] animate-[sheetUp_.2s_ease-out]', wide ? 'sm:max-w-2xl' : 'sm:max-w-lg')}>
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-at-line">
          <div className="font-display text-lg text-at-ink min-w-0">{title}</div>
          <IconButton label="Fechar" onClick={onClose} className="-mr-2 shrink-0"><X className="w-5 h-5" /></IconButton>
        </div>
        <div className="overflow-y-auto px-5 py-4 flex-1">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-at-line bg-white/60 sm:rounded-b-2xl pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmSheet({ open, onClose, onConfirm, title, text, confirmLabel = 'Confirmar', danger, loading }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; text: ReactNode; confirmLabel?: string; danger?: boolean; loading?: boolean }) {
  return (
    <Sheet open={open} onClose={onClose} title={title} footer={
      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </div>
    }>
      <div className="text-sm text-at-ink leading-relaxed">{text}</div>
    </Sheet>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: ReactNode }> }) {
  return (
    <div className="inline-flex p-1 bg-at-soft rounded-xl gap-1">
      {options.map(o => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={cx('px-3 h-8 rounded-lg text-sm font-medium transition', value === o.value ? 'bg-white text-at-wine shadow-sm' : 'text-at-muted hover:text-at-ink')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div className="min-w-0">
        <h1 className="font-display text-2xl sm:text-3xl text-at-ink">{title}</h1>
        {subtitle && <p className="text-sm text-at-muted mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Área de conteúdo das telas novas, alinhada ao menu lateral. */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main className={cx('lg:ml-56 min-h-screen bg-at-bg', className)}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 lg:pt-8 pb-28 lg:pb-12">{children}</div>
    </main>
  );
}
