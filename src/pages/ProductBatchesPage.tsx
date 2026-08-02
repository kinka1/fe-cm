import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { catalogApi, productBatchesApi } from '../api/endpoints';
import { getApiError } from '../api/client';
import { Badge, type BadgeTone, Button, Card, Field, Input, PageHeader, Select, SplitLayout, Textarea, Toolbar } from '../components/ui';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { useToast } from '../lib/toast';
import { decimal } from '../lib/format';
import { todayIso } from '../lib/date';
import type { ProductBatch } from '../types/api';

const DAY_MS = 86_400_000;
const NEAR_EXPIRY_DAYS = 30;

const emptyForm = () => ({
  product_id: '',
  batch_number: '',
  expired_date: '',
  quantity: '',
  received_date: todayIso(),
  notes: '',
});

/** Merah jika sudah lewat, kuning bila mendekati, hijau bila masih aman. */
function expiryTone(batch: ProductBatch, now: number): BadgeTone {
  if (!batch.expired_date) return 'slate';

  const daysLeft = (new Date(batch.expired_date).getTime() - now) / DAY_MS;
  if (daysLeft < 0) return 'red';
  if (daysLeft <= NEAR_EXPIRY_DAYS) return 'amber';

  return 'green';
}

export function ProductBatchesPage() {
  const [form, setForm] = useState(emptyForm);
  const [mode, setMode] = useState<'all' | 'expiring'>('all');
  const [days, setDays] = useState(NEAR_EXPIRY_DAYS);
  const toast = useToast();
  const queryClient = useQueryClient();

  // Dibekukan sekali saat halaman dibuka supaya render tetap murni (tidak memanggil Date.now saat render).
  const [renderedAt] = useState(() => Date.now());

  const products = useQuery({ queryKey: ['products', 'all'], queryFn: () => catalogApi.products({ per_page: 200 }) });
  const productOptions = useMemo(() => products.data?.data ?? [], [products.data]);
  const productNames = useMemo(
    () => new Map(productOptions.map((product) => [product.id, product.product_name])),
    [productOptions],
  );

  const batches = useQuery({
    queryKey: ['product-batches', mode, days],
    queryFn: () => (mode === 'expiring' ? productBatchesApi.expiringSoon({ days }) : productBatchesApi.list()),
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
      setForm(emptyForm());
      queryClient.invalidateQueries({ queryKey: ['product-batches'] });
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    create.mutate();
  };

  return (
    <section className="grid gap-5">
      <PageHeader title="Batch Produk" description="Pelacakan nomor batch dan tanggal kedaluwarsa." />

      <SplitLayout
        main={
          <>
            <Toolbar columns={2}>
              <Field label="Tampilkan">
                <Select value={mode} onChange={(event) => setMode(event.target.value as 'all' | 'expiring')}>
                  <option value="all">Semua batch</option>
                  <option value="expiring">Mendekati kedaluwarsa</option>
                </Select>
              </Field>
              {mode === 'expiring' && (
                <Field label="Dalam (hari)">
                  <Input type="number" min={1} value={days} onChange={(event) => setDays(Number(event.target.value))} />
                </Field>
              )}
            </Toolbar>

            {batches.isLoading && <LoadingState />}
            {batches.error && <ErrorState message={getApiError(batches.error)} />}
            {!batches.isLoading && !batches.error && batches.data?.length === 0 && (
              <EmptyState title="Batch kosong" description="Belum ada batch yang tercatat pada filter ini." />
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {batches.data?.map((batch) => (
                <Card key={batch.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-bold">{productNames.get(batch.product_id) ?? `Produk #${batch.product_id}`}</h2>
                    <p className="mt-1 text-sm text-muted">Batch {batch.batch_number}</p>
                    <p className="text-sm text-muted">Qty {decimal(batch.quantity)}</p>
                    {batch.received_date && <p className="text-xs text-muted">Diterima {batch.received_date}</p>}
                    {batch.notes && <p className="mt-1 text-xs text-muted">{batch.notes}</p>}
                  </div>
                  <Badge tone={expiryTone(batch, renderedAt)}>{batch.expired_date ?? 'tanpa expiry'}</Badge>
                </Card>
              ))}
            </div>
          </>
        }
        aside={
          <Card>
            <h2 className="mb-4 text-lg font-bold">Buat Batch</h2>
            <form onSubmit={submit} className="grid gap-3">
              <Field label="Produk" required>
                <Select value={form.product_id} onChange={(event) => setForm({ ...form, product_id: event.target.value })} required>
                  <option value="">Pilih produk</option>
                  {productOptions.map((product) => <option key={product.id} value={product.id}>{product.product_name}</option>)}
                </Select>
              </Field>
              <Field label="Nomor batch" required>
                <Input value={form.batch_number} onChange={(event) => setForm({ ...form, batch_number: event.target.value })} required />
              </Field>
              <Field label="Kuantitas" required>
                <Input type="number" step="0.01" min="0" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} required />
              </Field>
              <Field label="Tanggal kedaluwarsa">
                <Input type="date" value={form.expired_date} onChange={(event) => setForm({ ...form, expired_date: event.target.value })} />
              </Field>
              <Field label="Tanggal diterima">
                <Input type="date" value={form.received_date} onChange={(event) => setForm({ ...form, received_date: event.target.value })} />
              </Field>
              <Field label="Catatan">
                <Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
              </Field>
              <div className="flex gap-2">
                <Button type="submit" loading={create.isPending}>
                  <Plus className="h-4 w-4" />Simpan
                </Button>
                <Button type="button" variant="secondary" onClick={() => setForm(emptyForm())}>Reset</Button>
              </div>
            </form>
          </Card>
        }
      />
    </section>
  );
}
