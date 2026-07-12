import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import clsx from 'clsx';

type ToastType = 'success' | 'error';
interface ToastItem { id: number; type: ToastType; message: string }
interface ToastContextValue { success: (message: string) => void; error: (message: string) => void }

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((type: ToastType, message: string) => {
    const id = Date.now();
    setItems((current) => [...current, { id, type, message }]);
    window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 3600);
  }, []);

  const value = useMemo(() => ({ success: (message: string) => push('success', message), error: (message: string) => push('error', message) }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3">
        {items.map((item) => {
          const Icon = item.type === 'success' ? CheckCircle2 : XCircle;
          return (
            <div key={item.id} className={clsx('flex items-start gap-3 rounded-md border bg-white px-4 py-3 shadow-soft', item.type === 'success' ? 'border-teal-200' : 'border-red-200')}>
              <Icon className={clsx('mt-0.5 h-5 w-5 shrink-0', item.type === 'success' ? 'text-teal-700' : 'text-red-600')} />
              <p className="text-sm font-medium text-ink">{item.message}</p>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
