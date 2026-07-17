export function LoadingState({ label = 'Memuat data...' }: { label?: string }) {
  return <div className="rounded-md border border-dashed border-line bg-white p-6 text-center text-sm text-muted">{label}</div>;
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return <div className="rounded-md border border-dashed border-line bg-white p-8 text-center"><p className="font-semibold text-ink">{title}</p>{description && <p className="mt-1 text-sm text-muted">{description}</p>}</div>;
}

export function ErrorState({ message }: { message: string }) {
  return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{message}</div>;
}
