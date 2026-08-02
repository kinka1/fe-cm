import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Boxes, ClipboardList, Package, ShoppingCart, TrendingUp } from 'lucide-react';
import { assetsApi, posApi, revenueApi, stockAlertsApi } from '../api/endpoints';
import { currency, decimal, toNumber } from '../lib/format';
import { ErrorState, LoadingState } from '../components/states';
import { Button, Card, PageHeader, StatCard } from '../components/ui';
import { useAuth } from '../lib/auth';
import { todayIso, firstDayOfMonthIso } from '../lib/date';

export function DashboardPage() {
  const { storeId } = useAuth();
  const today = todayIso();
  const monthStart = firstDayOfMonthIso();

  const summary = useQuery({ queryKey: ['assets', 'summary'], queryFn: assetsApi.summary });
  const lowStock = useQuery({ queryKey: ['assets', 'low-stock-summary'], queryFn: assetsApi.lowStockSummary });
  const movement = useQuery({ queryKey: ['assets', 'stock-movement-summary'], queryFn: assetsApi.stockMovementSummary });
  const alertSummary = useQuery({ queryKey: ['stock-alerts', 'summary'], queryFn: stockAlertsApi.summary });
  const orders = useQuery({ queryKey: ['orders', 'dashboard'], queryFn: () => posApi.orders() });

  const todayRevenue = useQuery({
    queryKey: ['revenue', 'daily', today, storeId],
    queryFn: () => revenueApi.daily({ date: today, store_id: storeId }),
  });

  const monthRevenue = useQuery({
    queryKey: ['revenue', 'summary', monthStart, today, storeId],
    queryFn: () => revenueApi.summary({ from_date: monthStart, to_date: today, store_id: storeId }),
  });

  if (summary.isLoading || orders.isLoading) return <LoadingState />;
  if (summary.error || orders.error) return <ErrorState message="Gagal memuat dashboard. Periksa backend dan VITE_API_BASE_URL." />;

  const recentOrders = (orders.data?.data ?? []).slice(0, 6);
  const assets = summary.data;

  const stats = [
    { label: 'Pendapatan hari ini', value: currency(todayRevenue.data?.summary.total_revenue ?? 0), icon: ShoppingCart, tone: 'bg-indigo-50 text-indigo-600' },
    { label: 'Pendapatan bulan ini', value: currency(monthRevenue.data?.total_revenue ?? 0), icon: TrendingUp, tone: 'bg-emerald-50 text-emerald-600' },
    { label: 'Order hari ini', value: todayRevenue.data?.summary.total_orders ?? 0, icon: ClipboardList, tone: 'bg-purple-50 text-purple-600' },
    { label: 'Produk aktif', value: assets?.active_products ?? 0, icon: Package, tone: 'bg-brand-soft text-brand-dark' },
    { label: 'Item stok menipis', value: assets?.low_stock_items ?? 0, icon: AlertTriangle, tone: 'bg-amber-50 text-amber-600' },
    { label: 'Nilai stok', value: currency(assets?.stock_value ?? 0), icon: Boxes, tone: 'bg-sky-50 text-sky-600' },
  ];

  const sumMovement = (type: 'in' | 'out') =>
    movement.data?.filter((row) => row.transaction_type === type).reduce((total, row) => total + toNumber(row.total_quantity), 0) ?? 0;

  const movements = [
    { label: 'Stok masuk (total)', value: decimal(sumMovement('in')), icon: ArrowUpRight, tone: 'text-emerald-600' },
    { label: 'Stok keluar (total)', value: decimal(sumMovement('out')), icon: ArrowDownRight, tone: 'text-red-600' },
    { label: 'Transaksi stok hari ini', value: assets?.today_transactions ?? 0, icon: TrendingUp, tone: 'text-sky-600' },
  ];

  return (
    <section className="grid gap-5">
      <PageHeader
        title="Dashboard"
        description="Ringkasan operasional POS dan pengelolaan stok."
        actions={
          <Link to="/revenue">
            <Button variant="secondary">Lihat laporan pendapatan</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} tone={stat.tone} />
        ))}
      </div>

      {alertSummary.data && (
        <div className="rounded-card border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <span className="font-semibold">Stock alert:</span> {alertSummary.data.low_stock_count} stok menipis, {alertSummary.data.out_of_stock_count} stok habis.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {movements.map((item) => (
          <Card key={item.label} className="min-w-0">
            <div className={`flex items-center gap-2 ${item.tone}`}>
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="truncate text-sm font-semibold">{item.label}</span>
            </div>
            <p className="mt-2 text-xl font-bold sm:text-2xl">{item.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="min-w-0">
          <h2 className="font-bold">Order terakhir</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {recentOrders.map((order) => (
              <li key={order.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="truncate font-semibold">{order.order_number}</span>
                <span className="shrink-0">{currency(order.total_amount)}</span>
              </li>
            ))}
            {recentOrders.length === 0 && <li className="py-2.5 text-muted">Belum ada order.</li>}
          </ul>
        </Card>

        <Card className="min-w-0">
          <h2 className="font-bold">Stok menipis</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {lowStock.data?.slice(0, 8).map((item) => (
              <li key={item.product_id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="truncate font-semibold">{item.product_name ?? `Produk #${item.product_id}`}</span>
                <span className="shrink-0 text-muted">{item.current_stock} / min {item.minimum_stock}</span>
              </li>
            ))}
            {lowStock.data?.length === 0 && <li className="py-2.5 text-muted">Semua stok aman.</li>}
          </ul>
        </Card>
      </div>
    </section>
  );
}
