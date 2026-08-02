/**
 * Primitive UI aplikasi admin.
 *
 * Semua kontrol form dan tombol memakai tinggi dari `CONTROL_HEIGHT` yang sama,
 * sehingga Input, Select, dan Button yang disusun sebaris otomatis rata tanpa
 * penyesuaian manual per halaman. Halaman tidak boleh menulis ulang gaya dasar
 * kontrol; cukup pilih `size`/`variant` atau tambahkan kelas tata letak.
 */
import { forwardRef } from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

export type ControlSize = 'sm' | 'md' | 'lg';

const CONTROL_HEIGHT: Record<ControlSize, string> = {
  sm: 'h-9',
  md: 'h-10',
  lg: 'h-11',
};

const CONTROL_TEXT: Record<ControlSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-sm',
};

const CONTROL_PADDING: Record<ControlSize, string> = {
  sm: 'px-2.5',
  md: 'px-3',
  lg: 'px-4',
};

const FOCUS_RING = 'outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:border-brand';

const FIELD_BASE = 'w-full rounded-md border border-line bg-white text-ink transition placeholder:text-muted/70 disabled:cursor-not-allowed disabled:bg-subtle disabled:text-muted';

/* -------------------------------------------------------------------------- */
/* Tombol                                                                      */
/* -------------------------------------------------------------------------- */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-dark shadow-sm',
  secondary: 'border border-line bg-white text-ink hover:bg-subtle',
  ghost: 'text-muted hover:bg-subtle hover:text-ink',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ControlSize;
  /** Tampilkan spinner dan kunci tombol selama aksi async berjalan. */
  loading?: boolean;
  /** Lebar penuh; berguna untuk tombol submit di form sempit. */
  block?: boolean;
}

export function Button({ className, variant = 'primary', size = 'md', loading = false, block = false, disabled, children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-semibold transition',
        'disabled:cursor-not-allowed disabled:opacity-50',
        FOCUS_RING,
        CONTROL_HEIGHT[size],
        CONTROL_TEXT[size],
        size === 'sm' ? 'px-3' : size === 'md' ? 'px-4' : 'px-5',
        BUTTON_VARIANT[variant],
        block && 'w-full',
        className,
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Wajib: dipakai sebagai aria-label sekaligus tooltip. */
  label: string;
  tone?: 'neutral' | 'danger';
  size?: Exclude<ControlSize, 'lg'>;
}

/** Tombol khusus ikon dengan area sentuh dan label aksesibilitas yang konsisten. */
export function IconButton({ className, label, tone = 'neutral', size = 'md', ...props }: IconButtonProps) {
  return (
    <button
      {...props}
      aria-label={label}
      title={label}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-md transition',
        'disabled:cursor-not-allowed disabled:opacity-40',
        FOCUS_RING,
        size === 'sm' ? 'h-8 w-8' : 'h-9 w-9',
        tone === 'danger' ? 'text-red-600 hover:bg-red-50' : 'text-muted hover:bg-subtle hover:text-ink',
        className,
      )}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Kontrol form                                                                */
/* -------------------------------------------------------------------------- */

// `size` bawaan HTML (jumlah karakter) ditimpa dengan ukuran kontrol design system.
interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: ControlSize;
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, size = 'md', invalid, ...props }, ref) {
  return (
    <input
      {...props}
      ref={ref}
      aria-invalid={invalid || undefined}
      className={clsx(FIELD_BASE, FOCUS_RING, CONTROL_HEIGHT[size], CONTROL_TEXT[size], CONTROL_PADDING[size], invalid && 'border-red-400', className)}
    />
  );
});

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  size?: ControlSize;
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, size = 'md', invalid, ...props }, ref) {
  return (
    <select
      {...props}
      ref={ref}
      aria-invalid={invalid || undefined}
      className={clsx(FIELD_BASE, FOCUS_RING, CONTROL_HEIGHT[size], CONTROL_TEXT[size], CONTROL_PADDING[size], 'pr-8', invalid && 'border-red-400', className)}
    />
  );
});

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ className, invalid, rows = 3, ...props }, ref) {
  return (
    <textarea
      {...props}
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={clsx(FIELD_BASE, FOCUS_RING, 'min-h-20 resize-y px-3 py-2 text-sm', invalid && 'border-red-400', className)}
    />
  );
});

interface FieldProps {
  label: string;
  children: React.ReactNode;
  /** Penjelasan singkat di bawah kontrol. */
  hint?: string;
  /** Pesan galat; menggantikan hint saat terisi. */
  error?: string;
  required?: boolean;
  className?: string;
}

/** Bungkus label + kontrol + hint/error dengan jarak vertikal yang seragam. */
export function Field({ label, children, hint, error, required, className }: FieldProps) {
  return (
    <label className={clsx('grid gap-1.5', className)}>
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>
      {children}
      {error ? <span className="text-xs font-medium text-red-600">{error}</span> : hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/* Penanda status                                                              */
/* -------------------------------------------------------------------------- */

export type BadgeTone = 'slate' | 'green' | 'amber' | 'red' | 'blue' | 'brand';

const BADGE_TONE: Record<BadgeTone, string> = {
  slate: 'bg-slate-100 text-slate-700',
  green: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-sky-100 text-sky-700',
  brand: 'bg-brand-soft text-brand-dark',
};

export function Badge({ children, tone = 'slate', className }: { children: React.ReactNode; tone?: BadgeTone; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold capitalize', BADGE_TONE[tone], className)}>
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Tata letak                                                                  */
/* -------------------------------------------------------------------------- */

/** Panel dasar semua konten admin. */
export function Card({ children, className, padded = true }: { children: React.ReactNode; className?: string; padded?: boolean }) {
  return <div className={clsx('rounded-card border border-line bg-card shadow-card', padded && 'p-4 sm:p-5', className)}>{children}</div>;
}

/** Judul halaman dengan slot aksi yang membungkus rapi di layar sempit. */
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-ink sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/**
 * Baris filter/pencarian. Kolom menyusut otomatis: satu kolom di ponsel,
 * dua di tablet, lalu sebanyak `columns` di layar lebar.
 */
export function Toolbar({ children, columns = 3, className }: { children: React.ReactNode; columns?: 2 | 3 | 4 | 5; className?: string }) {
  const wide = {
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
  }[columns];

  return <Card className={clsx('grid gap-3 sm:grid-cols-2', wide, className)}>{children}</Card>;
}

/**
 * Tata letak dua kolom: daftar utama + panel form.
 * Di layar sempit form ditaruh lebih dulu agar tidak tertimbun daftar panjang.
 */
export function SplitLayout({ main, aside }: { main: React.ReactNode; aside: React.ReactNode }) {
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="order-2 grid min-w-0 gap-4 xl:order-1">{main}</div>
      <div className="order-1 xl:order-2 xl:sticky xl:top-4">{aside}</div>
    </div>
  );
}

/**
 * Pembungkus tabel: menjaga tabel lebar tetap bisa digeser horizontal
 * tanpa membuat seluruh halaman ikut bergeser.
 */
export function TableShell({ children, minWidth = 'min-w-[720px]' }: { children: React.ReactNode; minWidth?: string }) {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-card shadow-card">
      <div className="overflow-x-auto">
        <table className={clsx('w-full text-left text-sm', minWidth)}>{children}</table>
      </div>
    </div>
  );
}

export function Th({ children, align = 'left', className }: { children?: React.ReactNode; align?: 'left' | 'right' | 'center'; className?: string }) {
  return (
    <th scope="col" className={clsx('whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted', align === 'right' && 'text-right', align === 'center' && 'text-center', className)}>
      {children}
    </th>
  );
}

export function Td({ children, align = 'left', className }: { children?: React.ReactNode; align?: 'left' | 'right' | 'center'; className?: string }) {
  return <td className={clsx('px-4 py-3 align-middle', align === 'right' && 'text-right', align === 'center' && 'text-center', className)}>{children}</td>;
}

export function THead({ children }: { children: React.ReactNode }) {
  return <thead className="border-b border-line bg-subtle">{children}</thead>;
}

export function TRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={clsx('border-t border-line first:border-t-0 hover:bg-subtle/60', className)}>{children}</tr>;
}

/** Kartu metrik untuk dashboard dan ringkasan laporan. */
export function StatCard({ label, value, icon: Icon, tone = 'bg-brand-soft text-brand-dark' }: { label: string; value: React.ReactNode; icon?: React.ComponentType<{ className?: string }>; tone?: string }) {
  return (
    <Card className="min-w-0">
      {Icon && (
        <div className={clsx('mb-3 flex h-10 w-10 items-center justify-center rounded-md', tone)}>
          <Icon className="h-5 w-5" />
        </div>
      )}
      <p className="truncate text-sm text-muted">{label}</p>
      <p className="mt-1 truncate text-xl font-bold text-ink sm:text-2xl">{value}</p>
    </Card>
  );
}
