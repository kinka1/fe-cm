import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import { posApi } from '../api/endpoints';
import { getApiError } from '../api/client';
import { Badge, Button, Select } from '../components/ui';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { currency, dateTime, statusLabel } from '../lib/format';
import { useToast } from '../lib/toast';
import type { Order, OrderStatus, PaymentStatus } from '../types/api';

const orderStatuses: OrderStatus[] = ['preparing', 'ready', 'completed', 'cancelled'];

export function OrdersPage() {
  const [orderStatus, setOrderStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const toast = useToast();
  const queryClient = useQueryClient();

  const orders = useQuery({ queryKey: ['orders', orderStatus, paymentStatus], queryFn: () => posApi.orders({ order_status: orderStatus || undefined, payment_status: paymentStatus || undefined }) });
  const selected = useQuery({ queryKey: ['order', selectedId], queryFn: () => posApi.order(selectedId as number), enabled: Boolean(selectedId) });
  const mutation = useMutation({ mutationFn: ({ id, status }: { id: number; status: OrderStatus }) => posApi.updateStatus(id, status), onSuccess: () => { toast.success('Status order diperbarui'); queryClient.invalidateQueries({ queryKey: ['orders'] }); queryClient.invalidateQueries({ queryKey: ['order', selectedId] }); }, onError: (error) => toast.error(getApiError(error)) });

  const rows = useMemo(() => orders.data?.data ?? [], [orders.data]);

  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="min-w-0 grid gap-4">
        <div><h1 className="text-2xl font-bold">Orders</h1><p className="text-sm text-muted">Pantau dan ubah status pesanan.</p></div>
        <div className="grid gap-3 rounded-md border border-line bg-white p-4 md:grid-cols-2"><Select value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)}><option value="">Semua order status</option><option value="pending">Pending</option>{orderStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</Select><Select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}><option value="">Semua payment status</option>{(['pending','paid','cancelled'] as PaymentStatus[]).map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</Select></div>
        {orders.isLoading && <LoadingState />}{orders.error && <ErrorState message={getApiError(orders.error)} />}{!orders.isLoading && rows.length === 0 && <EmptyState title="Belum ada order" />}
        <div className="overflow-hidden rounded-md border border-line bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-muted"><tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Waktu</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3"></th></tr></thead><tbody>{rows.map((order) => <tr key={order.id} className="border-t border-line"><td className="px-4 py-3 font-semibold">{order.order_number}</td><td className="px-4 py-3">{order.customer_name || '-'}</td><td className="px-4 py-3">{dateTime(order.order_date)}</td><td className="px-4 py-3"><Badge tone={order.order_status === 'completed' ? 'green' : order.order_status === 'cancelled' ? 'red' : 'amber'}>{statusLabel(order.order_status)}</Badge></td><td className="px-4 py-3"><Badge tone={order.payment_status === 'paid' ? 'green' : 'slate'}>{statusLabel(order.payment_status)}</Badge></td><td className="px-4 py-3 text-right font-bold">{currency(order.total_amount)}</td><td className="px-4 py-3 text-right"><Button variant="secondary" onClick={() => setSelectedId(order.id)}><Eye className="h-4 w-4" />Detail</Button></td></tr>)}</tbody></table></div></div>
      </div>
      <OrderDetailPanel order={selected.data} loading={selected.isLoading} error={selected.error ? getApiError(selected.error) : ''} onUpdate={(status) => selectedId && mutation.mutate({ id: selectedId, status })} updating={mutation.isPending} />
    </section>
  );
}

function OrderDetailPanel({ order, loading, error, onUpdate, updating }: { order?: Order; loading: boolean; error: string; onUpdate: (status: OrderStatus) => void; updating: boolean }) {
  return <aside className="grid content-start gap-4 rounded-md border border-line bg-white p-4 shadow-sm xl:sticky xl:top-20"><h2 className="text-lg font-bold">Detail Order</h2>{loading && <LoadingState />}{error && <ErrorState message={error} />}{!loading && !order && <EmptyState title="Pilih order" description="Klik detail pada salah satu order." />}{order && <><div className="grid gap-2 text-sm"><div className="flex justify-between"><span className="text-muted">Nomor</span><strong>{order.order_number}</strong></div><div className="flex justify-between"><span className="text-muted">Customer</span><strong>{order.customer_name || '-'}</strong></div><div className="flex justify-between"><span className="text-muted">Total</span><strong>{currency(order.total_amount)}</strong></div></div><div className="grid gap-2">{order.details?.map((detail) => <div key={detail.id} className="rounded-md border border-line p-3 text-sm"><div className="flex justify-between gap-3"><strong>{detail.product?.product_name ?? `Product #${detail.product_id}`}</strong><span>{currency(detail.subtotal)}</span></div><p className="text-muted">Qty {detail.quantity} x {currency(detail.unit_price)}</p>{detail.notes && <p className="mt-1 text-muted">Note: {detail.notes}</p>}</div>)}</div><div className="grid grid-cols-2 gap-2">{orderStatuses.map((status) => <Button key={status} variant={status === 'cancelled' ? 'danger' : 'secondary'} disabled={updating || order.order_status === 'completed'} onClick={() => onUpdate(status)}>{statusLabel(status)}</Button>)}</div></>}</aside>;
}
