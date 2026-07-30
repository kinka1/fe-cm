import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Plus, X } from 'lucide-react';
import { catalogApi, stockAdjustmentsApi } from '../api/endpoints';
import { getApiError } from '../api/client';
import { Badge, Button, Field, Input, Select, Textarea } from '../components/ui';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { useToast } from '../lib/toast';
import { useAuth } from '../lib/auth';
import { dateTime, decimal } from '../lib/format';
import type { StockAdjustmentPayload, StockAdjustmentStatus } from '../types/api';

const statusTone = { pending: 'amber', approved: 'green', rejected: 'red' } as const;

const emptyForm = { product_id: '', quantity: '', adjustment_type: 'increase', reason: '' };

export function StockAdjustmentsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState(emptyForm);
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const adjustments = useQuery({
    queryKey: ['stock-adjustments', statusFilter],
    queryFn: () => stockAdjustmentsApi.list(statusFilter ? { status: statusFilter } : undefined),
  });
  const products = useQuery({ queryKey: ['products'], queryFn: () => catalogApi.products({ per_page: 200 }) });

  // Backend tidak load relasi product pada /stock-adjustments, jadi nama produk diresolve di klien.
  const productName = useMemo(() => {
    const map = new Map<number, string>();
    products.data?.data.forEach((product) => map.set(product.id, product.product_name));
    return map;
  }, [products.data]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['stock-report'] });
  };

  const create = useMutation({
    mutationFn: (payload: StockAdjustmentPayload) => stockAdjustmentsApi.create(payload),
    onSuccess: () => { toast.success('Pengajuan adjustment dibuat'); setForm(emptyForm); refresh(); },
    onError: (error) => toast.error(getApiError(error)),
  });
  const approve = useMutation({
    mutationFn: (id: number) => stockAdjustmentsApi.approve(id, { approved_by: user?.employee_id ?? null }),
    onSuccess: () => { toast.success('Adjustment disetujui, stok tercatat'); refresh(); },
    onError: (error) => toast.error(getApiError(error)),
  });
  const reject = useMutation({
    mutationFn: (id: number) => stockAdjustmentsApi.reject(id, { approved_by: user?.employee_id ?? null }),
    onSuccess: () => { toast.success('Adjustment ditolak'); refresh(); },
    onError: (error) => toast.error(getApiError(error)),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    create.mutate({
      product_id: Number(form.product_id),
      quantity: Number(form.quantity),
      adjustment_type: form.adjustment_type as StockAdjustmentPayload['adjustment_type'],
      requested_by: user?.employee_id ?? null,
      reason: form.reason || null,
    });
  };

  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Stock Adjustments</h1>
            <p className="text-sm text-muted">Pengajuan koreksi stok dengan alur approval.</p>
          </div>
          <Field label="Filter status">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Semua status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </Select>
          </Field>
        </div>

        {adjustments.isLoading && <LoadingState />}
        {adjustments.error && <ErrorState message={getApiError(adjustments.error)} />}
        {!adjustments.isLoading && !adjustments.error && adjustments.data?.length === 0 && (
          <EmptyState title="Belum ada adjustment" description="Ajukan koreksi stok lewat form di samping." />
        )}

        <div className="grid gap-3">
          {adjustments.data?.map((adjustment) => {
            const status = adjustment.status as StockAdjustmentStatus;
            return (
              <div key={adjustment.id} className="rounded-md border border-line bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-bold">{productName.get(adjustment.product_id) ?? `Produk #${adjustment.product_id}`}</h2>
                    <p className="mt-1 text-sm text-muted">
                      {adjustment.adjustment_type === 'increase' ? 'Tambah' : 'Kurangi'} {decimal(adjustment.quantity)}
                    </p>
                    {adjustment.reason && <p className="mt-1 text-sm text-muted">Alasan: {adjustment.reason}</p>}
                    <p className="mt-1 text-xs text-muted">Diajukan {dateTime(adjustment.created_at)}</p>
                    {adjustment.approved_at && <p className="text-xs text-muted">Diproses {dateTime(adjustment.approved_at)}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={statusTone[status]}>{status}</Badge>
                    {status === 'pending' && (
                      <>
                        <Button onClick={() => approve.mutate(adjustment.id)} disabled={approve.isPending}>
                          <Check className="h-4 w-4" />Approve
                        </Button>
                        <Button variant="danger" onClick={() => reject.mutate(adjustment.id)} disabled={reject.isPending}>
                          <X className="h-4 w-4" />Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <aside className="rounded-md border border-line bg-white p-4 shadow-sm lg:sticky lg:top-20">
        <h2 className="mb-4 text-lg font-bold">Ajukan Adjustment</h2>
        <form onSubmit={submit} className="grid gap-3">
          <Field label="Produk">
            <Select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} required>
              <option value="">Pilih produk</option>
              {products.data?.data.map((product) => (
                <option key={product.id} value={product.id}>{product.product_name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Tipe">
            <Select value={form.adjustment_type} onChange={(e) => setForm({ ...form, adjustment_type: e.target.value })}>
              <option value="increase">Increase</option>
              <option value="decrease">Decrease</option>
            </Select>
          </Field>
          <Field label="Quantity">
            <Input type="number" min="0" step="0.0001" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
          </Field>
          <Field label="Alasan">
            <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </Field>
          <div className="flex gap-2">
            <Button disabled={create.isPending}><Plus className="h-4 w-4" />Ajukan</Button>
            <Button type="button" variant="secondary" onClick={() => setForm(emptyForm)}>Reset</Button>
          </div>
        </form>
      </aside>
    </section>
  );
}
