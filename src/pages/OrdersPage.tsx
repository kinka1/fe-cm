import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import { posApi } from '../api/endpoints';
import { getApiError } from '../api/client';
import { Badge, Button, Card, Field, PageHeader, Select, SplitLayout, TableShell, Td, Th, THead, Toolbar, TRow } from '../components/ui';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { currency, dateTime, statusLabel } from '../lib/format';
import { useToast } from '../lib/toast';
import type { Order, OrderStatus, PaymentStatus } from '../types/api';

/** Status yang boleh dipilih kasir; 'pending' hanya dipakai sebagai filter. */
const ASSIGNABLE_STATUSES: OrderStatus[] = ['preparing', 'ready', 'completed', 'cancelled'];
const PAYMENT_STATUSES: PaymentStatus[] = ['pending', 'paid', 'cancelled'];

function statusTone(status: OrderStatus) {
  if (status === 'completed') return 'green' as const;
  if (status === 'cancelled') return 'red' as const;

  return 'amber' as const;
}

export function OrdersPage() {
  const [orderStatus, setOrderStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const toast = useToast();
  const queryClient = useQueryClient();

  const orders = useQuery({
    queryKey: ['orders', orderStatus, paymentStatus],
    queryFn: () => posApi.orders({ order_status: orderStatus || undefined, payment_status: paymentStatus || undefined }),
  });

  const selected = useQuery({
    queryKey: ['order', selectedId],
    queryFn: () => posApi.order(selectedId as number),
    enabled: Boolean(selectedId),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: OrderStatus }) => posApi.updateStatus(id, status),
    onSuccess: () => {
      toast.success('Status order diperbarui');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', selectedId] });
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  const rows = orders.data?.data ?? [];

  return (
    <section className="grid gap-5">
      <PageHeader title="Orders" description="Pantau pesanan yang masuk dan perbarui statusnya." />

      <SplitLayout
        main={
          <>
            <Toolbar columns={2}>
              <Field label="Status order">
                <Select value={orderStatus} onChange={(event) => setOrderStatus(event.target.value)}>
                  <option value="">Semua status order</option>
                  <option value="pending">Pending</option>
                  {ASSIGNABLE_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                </Select>
              </Field>
              <Field label="Status pembayaran">
                <Select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}>
                  <option value="">Semua status bayar</option>
                  {PAYMENT_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                </Select>
              </Field>
            </Toolbar>

            {orders.isLoading && <LoadingState />}
            {orders.error && <ErrorState message={getApiError(orders.error)} />}
            {!orders.isLoading && !orders.error && rows.length === 0 && <EmptyState title="Belum ada order" />}

            {rows.length > 0 && (
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
            )}
          </>
        }
        aside={
          <OrderDetailPanel
            order={selected.data}
            loading={selected.isLoading && Boolean(selectedId)}
            error={selected.error ? getApiError(selected.error) : ''}
            updating={updateStatus.isPending}
            onUpdate={(status) => selectedId && updateStatus.mutate({ id: selectedId, status })}
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
  onUpdate: (status: OrderStatus) => void;
}

function OrderDetailPanel({ order, loading, error, updating, onUpdate }: OrderDetailPanelProps) {
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

          <div className="grid grid-cols-2 gap-2">
            {ASSIGNABLE_STATUSES.map((status) => (
              <Button
                key={status}
                size="sm"
                variant={status === 'cancelled' ? 'danger' : 'secondary'}
                disabled={updating || order.order_status === 'completed'}
                onClick={() => onUpdate(status)}
              >
                {statusLabel(status)}
              </Button>
            ))}
          </div>

          {order.order_status === 'completed' && (
            <p className="text-xs text-muted">Order yang sudah completed tidak bisa diubah lagi oleh backend.</p>
          )}
        </>
      )}
    </Card>
  );
}
