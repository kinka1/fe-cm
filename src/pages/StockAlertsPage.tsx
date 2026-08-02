import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, PackageX } from 'lucide-react';
import { stockAlertsApi } from '../api/endpoints';
import { getApiError } from '../api/client';
import { Badge, PageHeader, StatCard, TableShell, Td, Th, THead, TRow } from '../components/ui';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { decimal, toNumber } from '../lib/format';

export function StockAlertsPage() {
  const alerts = useQuery({ queryKey: ['stock-alerts'], queryFn: () => stockAlertsApi.list({ per_page: 100 }) });
  const summary = useQuery({ queryKey: ['stock-alerts', 'summary'], queryFn: () => stockAlertsApi.summary() });

  return (
    <section className="grid gap-5">
      <PageHeader title="Stock Alerts" description="Produk yang stoknya berada di bawah minimum." />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Stok menipis" value={summary.data?.low_stock_count ?? '-'} icon={AlertTriangle} tone="bg-amber-50 text-amber-700" />
        <StatCard label="Stok habis" value={summary.data?.out_of_stock_count ?? '-'} icon={PackageX} tone="bg-red-50 text-red-700" />
      </div>

      {alerts.isLoading && <LoadingState />}
      {alerts.error && <ErrorState message={getApiError(alerts.error)} />}
      {!alerts.isLoading && !alerts.error && alerts.data?.length === 0 && (
        <EmptyState title="Semua stok aman" description="Tidak ada produk di bawah minimum stock." />
      )}

      {alerts.data && alerts.data.length > 0 && (
        <TableShell minWidth="min-w-[560px]">
          <THead>
            <tr>
              <Th>Produk</Th>
              <Th align="right">Stok saat ini</Th>
              <Th align="right">Minimum</Th>
              <Th>Status</Th>
            </tr>
          </THead>
          <tbody>
            {alerts.data.map((row) => {
              const current = toNumber(row.current_stock);
              const isOutOfStock = current <= 0;

              return (
                <TRow key={row.product_id}>
                  <Td className="font-semibold">{row.product_name ?? `Produk #${row.product_id}`}</Td>
                  <Td align="right">{decimal(current)}</Td>
                  <Td align="right">{decimal(row.minimum_stock)}</Td>
                  <Td>
                    <Badge tone={isOutOfStock ? 'red' : 'amber'}>{isOutOfStock ? 'stok habis' : 'stok menipis'}</Badge>
                  </Td>
                </TRow>
              );
            })}
          </tbody>
        </TableShell>
      )}
    </section>
  );
}
