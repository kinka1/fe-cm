import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, PackageCheck, Plus, Trash2 } from 'lucide-react';
import { catalogApi, purchaseOrdersApi, suppliersApi } from '../api/endpoints';
import { getApiError } from '../api/client';
import { Badge, Button, Field, Input, Select, Textarea } from '../components/ui';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { useToast } from '../lib/toast';
import { useAuth } from '../lib/auth';
import { currency, decimal } from '../lib/format';
import type { PurchaseOrderPayload, PurchaseOrderStatus } from '../types/api';

type DraftItem = { product_id: number | ''; quantity: string; unit_cost: string; notes: string };

const emptyItem: DraftItem = { product_id: '', quantity: '1', unit_cost: '0', notes: '' };
const today = () => new Date().toISOString().slice(0, 10);

const statusTone: Record<PurchaseOrderStatus, 'slate' | 'green' | 'amber' | 'red'> = {
  draft: 'slate',
  ordered: 'amber',
  received: 'green',
  cancelled: 'red',
};

export function PurchaseOrdersPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [orderDate, setOrderDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<DraftItem[]>([{ ...emptyItem }]);

  const toast = useToast();
  const queryClient = useQueryClient();
  const { storeId } = useAuth();

  const orders = useQuery({ queryKey: ['purchase-orders', statusFilter], queryFn: () => purchaseOrdersApi.list(statusFilter ? { status: statusFilter } : undefined) });
  const suppliers = useQuery({ queryKey: ['suppliers'], queryFn: () => suppliersApi.list() });
  const products = useQuery({ queryKey: ['products', 'all'], queryFn: () => catalogApi.products({ per_page: 200 }) });

  // Backend index() hanya with('items'), tanpa relasi supplier/product.
  // Nama supplier dan produk karena itu diresolusi di sisi klien.
  const supplierName = useMemo(() => new Map((suppliers.data ?? []).map((s) => [s.id, s.supplier_name])), [suppliers.data]);
  const productName = useMemo(() => new Map((products.data?.data ?? []).map((p) => [p.id, p.product_name])), [products.data]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['stock-report'] });
    queryClient.invalidateQueries({ queryKey: ['stock-transactions'] });
  };

  const resetForm = () => { setSupplierId(''); setOrderDate(today()); setNotes(''); setItems([{ ...emptyItem }]); };

  const create = useMutation({
    mutationFn: (payload: PurchaseOrderPayload) => purchaseOrdersApi.create(payload),
    onSuccess: () => { toast.success('Purchase order dibuat'); resetForm(); refresh(); },
    onError: (error) => toast.error(getApiError(error)),
  });
  const receive = useMutation({
    mutationFn: purchaseOrdersApi.receive,
    onSuccess: () => { toast.success('PO diterima, stok bertambah'); refresh(); },
    onError: (error) => toast.error(getApiError(error)),
  });
  const cancel = useMutation({
    mutationFn: purchaseOrdersApi.cancel,
    onSuccess: () => { toast.success('PO dibatalkan'); refresh(); },
    onError: (error) => toast.error(getApiError(error)),
  });

  const patchItem = (index: number, patch: Partial<DraftItem>) => setItems(items.map((item, i) => i === index ? { ...item, ...patch } : item));
  const draftTotal = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_cost || 0), 0);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const validItems = items.filter((item) => item.product_id !== '' && Number(item.quantity) > 0);
    if (validItems.length === 0) { toast.error('Minimal satu item dengan produk dan quantity > 0'); return; }
    if (!storeId) { toast.error('store_id tidak tersedia dari user login. Backend mewajibkan store_id untuk purchase order.'); return; }
    create.mutate({
      store_id: storeId,
      supplier_id: supplierId === '' ? null : supplierId,
      order_date: orderDate,
      notes: notes || null,
      items: validItems.map((item) => ({ product_id: Number(item.product_id), quantity: Number(item.quantity), unit_cost: Number(item.unit_cost || 0), notes: item.notes || null })),
    });
  };

  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Purchase Orders</h1>
            <p className="text-sm text-muted">PO ke supplier. Receive akan menambah stok lewat stock transaction.</p>
          </div>
          <Field label="Filter status">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Semua status</option>
              <option value="draft">Draft</option>
              <option value="ordered">Ordered</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </Field>
        </div>

        {orders.isLoading && <LoadingState />}
        {orders.error && <ErrorState message={getApiError(orders.error)} />}
        {!orders.isLoading && !orders.error && orders.data?.length === 0 && <EmptyState title="Belum ada purchase order" description="Buat PO lewat form di samping." />}

        <div className="grid gap-3">
          {orders.data?.map((order) => (
            <article key={order.id} className="rounded-md border border-line bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold">{order.po_number}</h2>
                    <Badge tone={statusTone[order.status]}>{order.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {order.supplier_id ? supplierName.get(order.supplier_id) ?? `Supplier #${order.supplier_id}` : 'Tanpa supplier'} &middot; Order {order.order_date}
                    {order.received_date && ` · Diterima ${order.received_date}`}
                  </p>
                  {order.notes && <p className="mt-1 text-xs text-muted">{order.notes}</p>}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{currency(order.total_amount)}</p>
                  <div className="mt-2 flex justify-end gap-2">
                    {order.status !== 'received' && order.status !== 'cancelled' && (
                      <>
                        <Button onClick={() => receive.mutate(order.id)} disabled={receive.isPending}><PackageCheck className="h-4 w-4" />Receive</Button>
                        <Button variant="secondary" onClick={() => cancel.mutate(order.id)} disabled={cancel.isPending}><Ban className="h-4 w-4" />Cancel</Button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {order.items && order.items.length > 0 && (
                <div className="mt-3 overflow-x-auto border-t border-line pt-3">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase text-muted">
                      <tr><th className="py-1">Produk</th><th className="py-1">Qty</th><th className="py-1">Unit cost</th><th className="py-1 text-right">Subtotal</th></tr>
                    </thead>
                    <tbody>
                      {order.items.map((item) => (
                        <tr key={item.id} className="border-t border-line/60">
                          <td className="py-1.5">{item.product?.product_name ?? productName.get(item.product_id) ?? `Produk #${item.product_id}`}{item.notes && <span className="block text-xs text-muted">{item.notes}</span>}</td>
                          <td className="py-1.5">{decimal(item.quantity)}</td>
                          <td className="py-1.5">{currency(item.unit_cost)}</td>
                          <td className="py-1.5 text-right">{currency(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>

      <aside className="rounded-md border border-line bg-white p-4 shadow-sm xl:sticky xl:top-20 xl:self-start">
        <h2 className="mb-4 text-lg font-bold">Create Purchase Order</h2>
        <form onSubmit={submit} className="grid gap-3">
          <Field label="Supplier">
            <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">Tanpa supplier</option>
              {suppliers.data?.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.supplier_name}</option>)}
            </Select>
          </Field>
          <Field label="Order date"><Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} required /></Field>
          <Field label="Notes"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>

          <div className="grid gap-2 rounded-md border border-line p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Items</span>
              <Button type="button" variant="ghost" onClick={() => setItems([...items, { ...emptyItem }])}><Plus className="h-4 w-4" />Tambah</Button>
            </div>
            {items.map((item, index) => (
              <div key={index} className="grid gap-2 border-t border-line/60 pt-2">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <Select value={item.product_id} onChange={(e) => patchItem(index, { product_id: e.target.value === '' ? '' : Number(e.target.value) })}>
                      <option value="">Pilih produk</option>
                      {products.data?.data.map((product) => <option key={product.id} value={product.id}>{product.product_name}</option>)}
                    </Select>
                  </div>
                  {items.length > 1 && (
                    <button type="button" className="rounded p-2 text-red-600 hover:bg-red-50" onClick={() => setItems(items.filter((_, i) => i !== index))} aria-label="Hapus item"><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" min="0" step="0.0001" placeholder="Quantity" value={item.quantity} onChange={(e) => patchItem(index, { quantity: e.target.value })} />
                  <Input type="number" min="0" step="0.01" placeholder="Unit cost" value={item.unit_cost} onChange={(e) => patchItem(index, { unit_cost: e.target.value })} />
                </div>
                <Input placeholder="Catatan item" value={item.notes} onChange={(e) => patchItem(index, { notes: e.target.value })} />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
            <span className="font-medium text-muted">Estimasi total</span>
            <span className="font-bold">{currency(draftTotal)}</span>
          </div>

          <div className="flex gap-2">
            <Button disabled={create.isPending}><Plus className="h-4 w-4" />Save</Button>
            <Button type="button" variant="secondary" onClick={resetForm}>Reset</Button>
          </div>
          <p className="text-xs text-muted">PO dibuat dengan status draft. Nomor PO digenerate backend.</p>
        </form>
      </aside>
    </section>
  );
}
