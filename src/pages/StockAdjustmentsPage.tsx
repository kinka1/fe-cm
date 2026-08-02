import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Plus, X } from 'lucide-react';
import { catalogApi, stockAdjustmentsApi } from '../api/endpoints';
import { getApiError } from '../api/client';
import { Badge, type BadgeTone, Button, Card, Field, Input, PageHeader, Select, SplitLayout, Textarea } from '../components/ui';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { useToast } from '../lib/toast';
import { useAuth } from '../lib/auth';
import { dateTime, decimal } from '../lib/format';
import type { StockAdjustmentPayload, StockAdjustmentStatus } from '../types/api';

const STATUS_TONE: Record<StockAdjustmentStatus, BadgeTone> = {
  pending: 'amber',
  approved: 'green',
  rejected: 'red',
};

const EMPTY_FORM = { product_id: '', quantity: '', adjustment_type: 'increase', reason: '' };

export function StockAdjustmentsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const adjustments = useQuery({
    queryKey: ['stock-adjustments', statusFilter],
    queryFn: () => stockAdjustmentsApi.list(statusFilter ? { status: statusFilter } : undefined),
  });

  const products = useQuery({ queryKey: ['products'], queryFn: () => catalogApi.products({ per_page: 200 }) });

  // Backend tidak memuat relasi product pada /stock-adjustments, jadi nama diresolve di klien.
  const productNames = useMemo(
    () => new Map((products.data?.data ?? []).map((product) => [product.id, product.product_name])),
    [products.data],
  );

  /** Approval mengubah stok, sehingga daftar produk dan laporan ikut disegarkan. */
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['stock-report'] });
  };

  const create = useMutation({
    mutationFn: (payload: StockAdjustmentPayload) => stockAdjustmentsApi.create(payload),
    onSuccess: () => { toast.success('Pengajuan adjustment dibuat'); setForm(EMPTY_FORM); refresh(); },
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
    <section className="grid gap-5">
      <PageHeader title="Penyesuaian Stok" description="Pengajuan koreksi stok dengan alur persetujuan." />

      <SplitLayout
        main={
          <>
            <Card>
              <Field label="Filter status">
                <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="">Semua status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </Select>
              </Field>
            </Card>

            {adjustments.isLoading && <LoadingState />}
            {adjustments.error && <ErrorState message={getApiError(adjustments.error)} />}
            {!adjustments.isLoading && !adjustments.error && adjustments.data?.length === 0 && (
              <EmptyState title="Belum ada adjustment" description="Ajukan koreksi stok lewat form di samping." />
            )}

            <div className="grid gap-3">
              {adjustments.data?.map((adjustment) => {
                const status = adjustment.status as StockAdjustmentStatus;

                return (
                  <Card key={adjustment.id} className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-bold">{productNames.get(adjustment.product_id) ?? `Produk #${adjustment.product_id}`}</h2>
                      <p className="mt-1 text-sm text-muted">
                        {adjustment.adjustment_type === 'increase' ? 'Tambah' : 'Kurangi'} {decimal(adjustment.quantity)}
                      </p>
                      {adjustment.reason && <p className="mt-1 text-sm text-muted">Alasan: {adjustment.reason}</p>}
                      <p className="mt-1 text-xs text-muted">Diajukan {dateTime(adjustment.created_at)}</p>
                      {adjustment.approved_at && <p className="text-xs text-muted">Diproses {dateTime(adjustment.approved_at)}</p>}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={STATUS_TONE[status]}>{status}</Badge>
                      {status === 'pending' && (
                        <>
                          <Button size="sm" loading={approve.isPending} onClick={() => approve.mutate(adjustment.id)}>
                            <Check className="h-4 w-4" />Setujui
                          </Button>
                          <Button size="sm" variant="danger" loading={reject.isPending} onClick={() => reject.mutate(adjustment.id)}>
                            <X className="h-4 w-4" />Tolak
                          </Button>
                        </>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        }
        aside={
          <Card>
            <h2 className="mb-4 text-lg font-bold">Ajukan Adjustment</h2>
            <form onSubmit={submit} className="grid gap-3">
              <Field label="Produk" required>
                <Select value={form.product_id} onChange={(event) => setForm({ ...form, product_id: event.target.value })} required>
                  <option value="">Pilih produk</option>
                  {products.data?.data.map((product) => <option key={product.id} value={product.id}>{product.product_name}</option>)}
                </Select>
              </Field>
              <Field label="Tipe">
                <Select value={form.adjustment_type} onChange={(event) => setForm({ ...form, adjustment_type: event.target.value })}>
                  <option value="increase">Tambah stok</option>
                  <option value="decrease">Kurangi stok</option>
                </Select>
              </Field>
              <Field label="Kuantitas" required>
                <Input type="number" min="0" step="0.0001" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} required />
              </Field>
              <Field label="Alasan">
                <Textarea value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} />
              </Field>
              <div className="flex gap-2">
                <Button type="submit" loading={create.isPending}>
                  <Plus className="h-4 w-4" />Ajukan
                </Button>
                <Button type="button" variant="secondary" onClick={() => setForm(EMPTY_FORM)}>Reset</Button>
              </div>
            </form>
          </Card>
        }
      />
    </section>
  );
}
