import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Eye, X } from 'lucide-react';
import { posApi } from '../api/endpoints';
import { getApiError } from '../api/client';
import { Badge, Button, Card, Field, PageHeader, Select, SplitLayout, TableShell, Td, Th, THead, Toolbar, TRow } from '../components/ui';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { todayIso } from '../lib/date';
import { currency, dateTime, statusLabel } from '../lib/format';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import type { Order, OrderStatus, PaymentStatus } from '../types/api';

const ORDER_STATUSES: OrderStatus[] = ['preparing', 'ready', 'completed', 'cancelled'];
const PAYMENT_STATUSES: PaymentStatus[] = ['pending', 'paid', 'cancelled'];

function statusTone(status: OrderStatus) {
  if (status === 'completed') return 'green' as const;
  if (status === 'cancelled') return 'red' as const;

  return 'amber' as const;
}

export function OrdersPage() {
  const today = todayIso();
  const { storeId } = useAuth();
  const [orderStatus, setOrderStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const toast = useToast();
  const queryClient = useQueryClient();

  const orders = useQuery({
    queryKey: ['orders', 'paginated', today, storeId, orderStatus, paymentStatus, page, perPage],
    queryFn: () => posApi.ordersPaginated({
      date: today,
      store_id: storeId ?? undefined,
      order_status: orderStatus || undefined,
      payment_status: paymentStatus || undefined,
      page,
      per_page: perPage,
    }),
  });

  const selected = useQuery({
    queryKey: ['order', selectedId],
    queryFn: () => posApi.order(selectedId as number),
    enabled: Boolean(selectedId),
  });

  const cancelOrder = useMutation({
    mutationFn: (id: number) => posApi.updateStatus(id, 'cancelled'),
    onSuccess: () => {
      toast.success('Order berhasil dibatalkan');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', selectedId] });
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  const pageData = orders.data;
  const rows = pageData?.data ?? [];
  const startRow = pageData?.from ?? 0;
  const endRow = pageData?.to ?? 0;
  const totalRows = pageData?.total ?? 0;
  const lastPage = pageData?.last_page ?? 1;

  return (
    <section className="grid gap-5">
      <PageHeader title="Orders" description={`Pantau pesanan hari ini (${today})${storeId ? ` untuk store #${storeId}` : ''} dan perbarui statusnya.`} />

      <SplitLayout
        main={
          <>
            <Toolbar columns={3}>
              <Field label="Status order">
                <Select value={orderStatus} onChange={(event) => { setOrderStatus(event.target.value); setPage(1); }}>
                  <option value="">Semua status order</option>
                  <option value="pending">Pending</option>
                  {ORDER_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                </Select>
              </Field>
              <Field label="Status pembayaran">
                <Select value={paymentStatus} onChange={(event) => { setPaymentStatus(event.target.value); setPage(1); }}>
                  <option value="">Semua status bayar</option>
                  {PAYMENT_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                </Select>
              </Field>
              <Field label="Per halaman">
                <Select value={perPage} onChange={(event) => { setPerPage(Number(event.target.value)); setPage(1); }}>
                  <option value={10}>10 order</option>
                  <option value={15}>15 order</option>
                  <option value={25}>25 order</option>
                  <option value={50}>50 order</option>
                  <option value={100}>100 order</option>
                </Select>
              </Field>
            </Toolbar>

            {orders.isLoading && <LoadingState />}
            {orders.error && <ErrorState message={getApiError(orders.error)} />}
            {!orders.isLoading && !orders.error && rows.length === 0 && <EmptyState title="Belum ada order" />}

            {rows.length > 0 && (
              <div className="grid gap-3">
                <TableShell minWidth="min-w-[860px]">
                  <THead>
                    <tr>
                      <Th>Order</Th>
                      <Th>Customer</Th>
                      <Th>Waktu</Th>
                      <Th>Status</Th>
                      <Th>Pembayaran</Th>
                      <Th align="right">Total</Th>
                      <Th />
                    </tr>
                  </THead>
                  <tbody>
                    {rows.map((order) => (
                      <TRow key={order.id}>
                        <Td className="font-semibold">{order.order_number}</Td>
                        <Td>{order.customer_name || '-'}</Td>
                        <Td className="whitespace-nowrap">{dateTime(order.order_date)}</Td>
                        <Td><Badge tone={statusTone(order.order_status)}>{statusLabel(order.order_status)}</Badge></Td>
                        <Td><Badge tone={order.payment_status === 'paid' ? 'green' : 'slate'}>{statusLabel(order.payment_status)}</Badge></Td>
                        <Td align="right" className="font-bold">{currency(order.total_amount)}</Td>
                        <Td align="right">
                          <Button variant="secondary" size="sm" onClick={() => setSelectedId(order.id)}>
                            <Eye className="h-4 w-4" />Detail
                          </Button>
                        </Td>
                      </TRow>
                    ))}
                  </tbody>
                </TableShell>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-card px-4 py-3 text-sm shadow-card">
                  <p className="text-muted">
                    Menampilkan <span className="font-semibold text-ink">{startRow || 0}-{endRow || 0}</span> dari <span className="font-semibold text-ink">{totalRows}</span> order
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" disabled={page <= 1 || orders.isFetching} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button>
                    <span className="rounded-md border border-line bg-subtle px-3 py-1 text-xs font-semibold text-ink">Page {page} / {lastPage}</span>
                    <Button variant="secondary" size="sm" disabled={page >= lastPage || orders.isFetching} onClick={() => setPage((current) => Math.min(lastPage, current + 1))}>Next</Button>
                  </div>
                </div>
              </div>
            )}
          </>
        }
        aside={
          <OrderDetailPanel
            order={selected.data}
            loading={selected.isLoading && Boolean(selectedId)}
            error={selected.error ? getApiError(selected.error) : ''}
            updating={cancelOrder.isPending}
            onCancel={() => selectedId && cancelOrder.mutate(selectedId)}
          />
        }
      />
    </section>
  );
}

interface OrderDetailPanelProps {
  order?: Order;
  loading: boolean;
  error: string;
  updating: boolean;
  onCancel: () => void;
}

function OrderDetailPanel({ order, loading, error, updating, onCancel }: OrderDetailPanelProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const canCancel = Boolean(order && order.order_status !== 'completed' && order.order_status !== 'cancelled');

  const handleCancel = () => {
    onCancel();
    setConfirmOpen(false);
  };

  return (
    <Card className="grid gap-4">
      <h2 className="text-lg font-bold">Detail Order</h2>

      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !order && <EmptyState title="Pilih order" description="Klik Detail pada salah satu baris." />}

      {order && (
        <>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Nomor</dt>
              <dd className="min-w-0 truncate font-semibold">{order.order_number}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Customer</dt>
              <dd className="min-w-0 truncate font-semibold">{order.customer_name || '-'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Total</dt>
              <dd className="font-semibold">{currency(order.total_amount)}</dd>
            </div>
          </dl>

          <ul className="grid gap-2">
            {order.details?.map((detail) => (
              <li key={detail.id} className="rounded-md border border-line p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <strong className="min-w-0 truncate">{detail.product?.product_name ?? `Produk #${detail.product_id}`}</strong>
                  <span className="shrink-0">{currency(detail.subtotal)}</span>
                </div>
                <p className="text-muted">Qty {detail.quantity} &times; {currency(detail.unit_price)}</p>
                {detail.notes && <p className="mt-1 text-muted">Catatan: {detail.notes}</p>}
              </li>
            ))}
          </ul>

          <Button
            size="sm"
            variant="danger"
            disabled={updating || !canCancel}
            onClick={() => setConfirmOpen(true)}
          >
            {updating ? 'Membatalkan...' : 'Batalkan Order'}
          </Button>

          {order.order_status === 'completed' && (
            <p className="text-xs text-muted">Order yang sudah completed tidak bisa dibatalkan.</p>
          )}
          {order.order_status === 'cancelled' && (
            <p className="text-xs text-muted">Order sudah dibatalkan.</p>
          )}

          {confirmOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="w-full max-w-sm rounded-card border border-line bg-card p-5 shadow-card">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-red-100 p-2 text-red-700">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-ink">Batalkan order?</h3>
                      <p className="mt-1 text-sm text-muted">Order {order.order_number} akan diubah menjadi cancelled.</p>
                    </div>
                  </div>
                  <button className="rounded-md p-1 text-muted hover:bg-subtle" onClick={() => setConfirmOpen(false)} aria-label="Tutup modal">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" size="sm" disabled={updating} onClick={() => setConfirmOpen(false)}>Tidak</Button>
                  <Button variant="danger" size="sm" disabled={updating} onClick={handleCancel}>{updating ? 'Membatalkan...' : 'Ya, Batalkan'}</Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
