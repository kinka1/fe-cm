import clsx from 'clsx';

export function Button({ className, variant = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  return (
    <button
      {...props}
      className={clsx(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-brand text-white hover:bg-teal-800',
        variant === 'secondary' && 'border border-line bg-white text-ink hover:bg-slate-50',
        variant === 'ghost' && 'text-muted hover:bg-slate-100 hover:text-ink',
        variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
        className,
      )}
    />
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx('min-h-10 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-teal-100', className)} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={clsx('min-h-20 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-teal-100', className)} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={clsx('min-h-10 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-teal-100', className)} />;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-medium text-ink"><span>{label}</span>{children}</label>;
}

export function Badge({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'slate' | 'green' | 'amber' | 'red' | 'blue' }) {
  return <span className={clsx('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize', tone === 'slate' && 'bg-slate-100 text-slate-700', tone === 'green' && 'bg-emerald-100 text-emerald-700', tone === 'amber' && 'bg-amber-100 text-amber-800', tone === 'red' && 'bg-red-100 text-red-700', tone === 'blue' && 'bg-sky-100 text-sky-700')}>{children}</span>;
}
