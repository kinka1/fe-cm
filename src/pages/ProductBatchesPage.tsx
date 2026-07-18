import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { catalogApi, productBatchesApi } from '../api/endpoints';
import { getApiError } from '../api/client';
import { Badge, Button, Field, Input, Select, Textarea } from '../components/ui';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { useToast } from '../lib/toast';
import { decimal } from '../lib/format';
import type { ProductBatch } from '../types/api';

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = { product_id: '', batch_number: '', expired_date: '', quantity: '', received_date: today(), notes: '' };

export function ProductBatchesPage() {
  const [form, setForm] = useState({ ...emptyForm });
  const [mode, setMode] = useState<'all' | 'expiring'>('all');
  const [days, setDays] = useState(30);
  const toast = useToast();
  const queryClient = useQueryClient();

  const products = useQuery({ queryKey: ['products', 'all'], queryFn: () => catalogApi.products({ per_page: 200 }) });
  const productOptions = products.data?.data ?? [];
  const productName = useMemo(() => {
    const map = new Map<number, string>();
    productOptions.forEach((product) => map.set(product.id, product.product_name));
    return map;
  }, [productOptions]);

  const batches = useQuery({
    queryKey: ['product-batches', mode, days],
    queryFn: () => mode === 'expiring' ? productBatchesApi.expiringSoon({ days }) : productBatchesApi.list(),
  });

  const create = useMutation({
    mutationFn: () => productBatchesApi.create({
      product_id: Number(form.product_id),
      batch_number: form.batch_number,
      expired_date: form.expired_date || null,
      quantity: Number(form.quantity),
      received_date: form.received_date || null,
      notes: form.notes || null,
    }),
    onSuccess: () => {
      toast.success('Batch dibuat');
      setForm({ ...emptyForm });
      queryClient.invalidateQueries({ queryKey: ['product-batches'] });
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  const expiryTone = (batch: ProductBatch) => {
    if (!batch.expired_date) return 'slate' as const;
    const diff = (new Date(batch.expired_date).getTime() - Date.now()) / 86_400_000;
    if (diff < 0) return 'red' as const;
    if (diff <= 30) return 'amber' as const;
    return 'green' as const;
  };

  const submit = (event: React.FormEvent) => { event.preventDefault(); create.mutate(); };

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="grid gap-4">
        <div>
          <h1 className="text-2xl font-bold">Product Batches</h1>
          <p className="text-sm text-muted">Batch produk dan tanggal kedaluwarsa.</p>
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-md border border-line bg-white p-3">
          <Field label="Tampilkan">
            <Select value={mode} onChange={(e) => setMode(e.target.value as 'all' | 'expiring')}>
              <option value="all">Semua batch</option>
              <option value="expiring">Mendekati kedaluwarsa</option>
            </Select>
          </Field>
          {mode === 'expiring' && (
            <Field label="Dalam (hari)">
              <Input type="number" min={1} value={days} onChange={(e) => setDays(Number(e.target.value))} />
            </Field>
          )}
        </div>

        {batches.isLoading && <LoadingState />}
        {batches.error && <ErrorState message={getApiError(batches.error)} />}
        {!batches.isLoading && !batches.error && batches.data?.length === 0 && <EmptyState title="Batch kosong" />}

        <div className="grid gap-3 md:grid-cols-2">
          {batches.data?.map((batch) => (
            <div key={batch.id} className="rounded-md border border-line bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-bold">{productName.get(batch.product_id) ?? `Produk #${batch.product_id}`}</h2>
                  <p className="mt-1 text-sm text-muted">Batch {batch.batch_number}</p>
                  <p className="text-sm text-muted">Qty {decimal(batch.quantity)}</p>
                  {batch.received_date && <p className="text-xs text-muted">Diterima {batch.received_date}</p>}
                  {batch.notes && <p className="mt-1 text-xs text-muted">{batch.notes}</p>}
                </div>
                <Badge tone={expiryTone(batch)}>{batch.expired_date ?? 'tanpa expiry'}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      <aside className="rounded-md border border-line bg-white p-4 shadow-sm lg:sticky lg:top-20">
        <h2 className="mb-4 text-lg font-bold">Create Batch</h2>
        <form onSubmit={submit} className="grid gap-3">
          <Field label="Produk">
            <Select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} required>
              <option value="">Pilih produk</option>
              {productOptions.map((product) => <option key={product.id} value={product.id}>{product.product_name}</option>)}
            </Select>
          </Field>
          <Field label="Batch number"><Input value={form.batch_number} onChange={(e) => setForm({ ...form, batch_number: e.target.value })} required /></Field>
          <Field label="Quantity"><Input type="number" step="0.01" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required /></Field>
          <Field label="Expired date"><Input type="date" value={form.expired_date} onChange={(e) => setForm({ ...form, expired_date: e.target.value })} /></Field>
          <Field label="Received date"><Input type="date" value={form.received_date} onChange={(e) => setForm({ ...form, received_date: e.target.value })} /></Field>
          <Field label="Notes"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <div className="flex gap-2">
            <Button disabled={create.isPending}><Plus className="h-4 w-4" />Save</Button>
            <Button type="button" variant="secondary" onClick={() => setForm({ ...emptyForm })}>Reset</Button>
          </div>
        </form>
      </aside>
    </section>
  );
}
