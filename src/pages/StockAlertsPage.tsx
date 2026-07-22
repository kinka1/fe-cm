import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, PackageX } from 'lucide-react';
import { stockAlertsApi } from '../api/endpoints';
import { getApiError } from '../api/client';
import { Badge } from '../components/ui';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { toNumber } from '../lib/format';

export function StockAlertsPage() {
  const alerts = useQuery({ queryKey: ['stock-alerts'], queryFn: () => stockAlertsApi.list({ per_page: 100 }) });
  const summary = useQuery({ queryKey: ['stock-alerts', 'summary'], queryFn: () => stockAlertsApi.summary() });

  return (
    <section className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">Low Stock Alerts</h1>
        <p className="text-sm text-muted">Produk dengan stok kurang dari minimum stock.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-line bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-amber-50 text-amber-700"><AlertTriangle className="h-5 w-5" /></div>
          <p className="text-sm text-muted">Low stock items</p>
          <p className="mt-1 text-2xl font-bold">{summary.data?.low_stock_count ?? '-'}</p>
        </div>
        <div className="rounded-md border border-line bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-red-50 text-red-700"><PackageX className="h-5 w-5" /></div>
          <p className="text-sm text-muted">Out of stock</p>
          <p className="mt-1 text-2xl font-bold">{summary.data?.out_of_stock_count ?? '-'}</p>
        </div>
      </div>

      {alerts.isLoading && <LoadingState />}
      {alerts.error && <ErrorState message={getApiError(alerts.error)} />}
      {!alerts.isLoading && !alerts.error && alerts.data?.length === 0 && (
        <EmptyState title="Semua stok aman" description="Tidak ada produk yang berada di bawah minimum stock." />
      )}

      {alerts.data && alerts.data.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-line bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Produk</th>
                <th className="px-4 py-3">Current stock</th>
                <th className="px-4 py-3">Minimum stock</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {alerts.data.map((row) => {
                const current = toNumber(row.current_stock);
                const min = toNumber(row.minimum_stock);
                const out = current <= 0;
                return (
                  <tr key={row.product_id} className="border-t border-line">
                    <td className="px-4 py-3 font-semibold">{row.product_name ?? `#${row.product_id}`}</td>
                    <td className="px-4 py-3">{current}</td>
                    <td className="px-4 py-3">{min}</td>
                    <td className="px-4 py-3"><Badge tone={out ? 'red' : 'amber'}>{out ? 'out of stock' : 'low stock'}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
