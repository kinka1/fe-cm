import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ClipboardList, Package, ShoppingCart } from 'lucide-react';
import { catalogApi, posApi, stockApi } from '../api/endpoints';
import { currency, toNumber } from '../lib/format';
import { ErrorState, LoadingState } from '../components/states';

export function DashboardPage() {
  const products = useQuery({ queryKey: ['products', 'dashboard'], queryFn: () => catalogApi.products({ per_page: 100 }) });
  const orders = useQuery({ queryKey: ['orders', 'dashboard'], queryFn: () => posApi.orders() });
  const stock = useQuery({ queryKey: ['stock-report'], queryFn: stockApi.report });

  if (products.isLoading || orders.isLoading || stock.isLoading) return <LoadingState />;
  if (products.error || orders.error || stock.error) return <ErrorState message="Gagal memuat dashboard. Periksa backend dan VITE_API_BASE_URL." />;

  const productRows = products.data?.data ?? [];
  const orderRows = orders.data?.data ?? [];
  const lowStock = productRows.filter((item) => toNumber(item.current_stock) <= toNumber(item.minimum_stock));
  const paidSales = orderRows.filter((order) => order.payment_status === 'paid').reduce((sum, order) => sum + toNumber(order.total_amount), 0);

  const cards = [
    { label: 'Order terbaru', value: orders.data?.total ?? orderRows.length, icon: ClipboardList },
    { label: 'Produk aktif', value: productRows.filter((item) => Boolean(item.is_active)).length, icon: Package },
    { label: 'Low stock', value: lowStock.length, icon: AlertTriangle },
    { label: 'Paid sales', value: currency(paidSales), icon: ShoppingCart },
  ];

  return (
    <section className="grid gap-6">
      <div><h1 className="text-2xl font-bold">Dashboard</h1><p className="text-sm text-muted">Ringkasan operasional POS dan stok.</p></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => <div key={card.label} className="rounded-md border border-line bg-white p-5 shadow-sm"><div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-teal-50 text-brand"><card.icon className="h-5 w-5" /></div><p className="text-sm text-muted">{card.label}</p><p className="mt-1 text-2xl font-bold">{card.value}</p></div>)}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-md border border-line bg-white p-5"><h2 className="font-bold">Order terakhir</h2><div className="mt-4 grid gap-3">{orderRows.slice(0, 6).map((order) => <div key={order.id} className="flex items-center justify-between gap-3 border-b border-line pb-3 text-sm"><span className="font-semibold">{order.order_number}</span><span>{currency(order.total_amount)}</span></div>)}</div></div>
        <div className="rounded-md border border-line bg-white p-5"><h2 className="font-bold">Low stock</h2><div className="mt-4 grid gap-3">{lowStock.slice(0, 8).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 border-b border-line pb-3 text-sm"><span className="font-semibold">{item.product_name}</span><span>{item.current_stock} / min {item.minimum_stock}</span></div>)}</div></div>
      </div>
    </section>
  );
}
