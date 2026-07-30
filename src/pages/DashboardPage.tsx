import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Boxes, ClipboardList, Package, ShoppingCart, TrendingUp } from 'lucide-react';
import { assetsApi, posApi, stockAlertsApi } from '../api/endpoints';
import { currency, toNumber } from '../lib/format';
import { ErrorState, LoadingState } from '../components/states';

export function DashboardPage() {
  const summary = useQuery({ queryKey: ['assets', 'summary'], queryFn: assetsApi.summary });
  const lowStock = useQuery({ queryKey: ['assets', 'low-stock-summary'], queryFn: assetsApi.lowStockSummary });
  const alertSummary = useQuery({ queryKey: ['stock-alerts', 'summary'], queryFn: stockAlertsApi.summary });
  const orders = useQuery({ queryKey: ['orders', 'dashboard'], queryFn: () => posApi.orders() });

  if (summary.isLoading || orders.isLoading) return <LoadingState />;
  if (summary.error || orders.error) return <ErrorState message="Gagal memuat dashboard. Periksa backend dan VITE_API_BASE_URL." />;

  const orderRows = orders.data?.data ?? [];
  const paidSales = orderRows.filter((order) => order.payment_status === 'paid').reduce((sum, order) => sum + toNumber(order.total_amount), 0);
  const s = summary.data;

  const cards = [
    { label: 'Produk aktif', value: s?.active_products ?? 0, icon: Package, tone: 'bg-teal-50 text-brand' },
    { label: 'Low stock items', value: s?.low_stock_items ?? 0, icon: AlertTriangle, tone: 'bg-amber-50 text-amber-600' },
    { label: 'Nilai stok', value: currency(s?.stock_value ?? 0), icon: Boxes, tone: 'bg-sky-50 text-sky-600' },
    { label: 'Transaksi stok hari ini', value: s?.today_transactions ?? 0, icon: TrendingUp, tone: 'bg-emerald-50 text-emerald-600' },
    { label: 'Order (paid)', value: currency(paidSales), icon: ShoppingCart, tone: 'bg-indigo-50 text-indigo-600' },
    { label: 'Order terbaru', value: orders.data?.total ?? orderRows.length, icon: ClipboardList, tone: 'bg-purple-50 text-purple-600' },
  ];

  return (
    <section className="grid gap-5">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted">Ringkasan operasional POS dan asset management.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-md border border-line bg-white p-4 shadow-sm">
            <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-md ${card.tone}`}><card.icon className="h-5 w-5" /></div>
            <p className="text-sm text-muted">{card.label}</p>
            <p className="mt-1 text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      {alertSummary.data && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <span className="font-semibold">Stock alert:</span> {alertSummary.data.low_stock_count} low stock, {alertSummary.data.out_of_stock_count} out of stock.
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-md border border-line bg-white p-5">
          <h2 className="font-bold">Order terakhir</h2>
          <div className="mt-4 grid gap-3">
            {orderRows.slice(0, 6).map((order) => (
              <div key={order.id} className="flex items-center justify-between gap-3 border-b border-line pb-3 text-sm">
                <span className="font-semibold">{order.order_number}</span>
                <span>{currency(order.total_amount)}</span>
              </div>
            ))}
            {orderRows.length === 0 && <p className="text-sm text-muted">Belum ada order.</p>}
          </div>
        </div>
        <div className="rounded-md border border-line bg-white p-5">
          <h2 className="font-bold">Low stock</h2>
          <div className="mt-4 grid gap-3">
            {lowStock.data?.slice(0, 8).map((item) => (
              <div key={item.product_id} className="flex items-center justify-between gap-3 border-b border-line pb-3 text-sm">
                <span className="font-semibold">{item.product_name ?? `Produk #${item.product_id}`}</span>
                <span>{item.current_stock} / min {item.minimum_stock}</span>
              </div>
            ))}
            {lowStock.data?.length === 0 && <p className="text-sm text-muted">Semua stok aman.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
