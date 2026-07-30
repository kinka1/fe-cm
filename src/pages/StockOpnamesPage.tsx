import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Plus, Send } from 'lucide-react';
import { catalogApi, stockOpnamesApi } from '../api/endpoints';
import { getApiError } from '../api/client';
import { Badge, Button, Field, Input, Select, Textarea } from '../components/ui';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { useToast } from '../lib/toast';
import { useAuth } from '../lib/auth';
import { decimal } from '../lib/format';
import type { StockOpname, StockOpnameStatus } from '../types/api';

const statusTone: Record<StockOpnameStatus, 'slate' | 'amber' | 'green' | 'red'> = {
  draft: 'slate',
  submitted: 'amber',
  approved: 'green',
  cancelled: 'red',
};

const today = () => new Date().toISOString().slice(0, 10);

export function StockOpnamesPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [header, setHeader] = useState({ opname_date: today(), notes: '' });
  const [item, setItem] = useState({ product_id: '', physical_stock: '', notes: '' });
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user, storeId } = useAuth();

  const opnames = useQuery({
    queryKey: ['stock-opnames', statusFilter],
    queryFn: () => stockOpnamesApi.list(statusFilter ? { status: statusFilter } : undefined),
  });
  const products = useQuery({ queryKey: ['products', 'all'], queryFn: () => catalogApi.products({ per_page: 200 }) });
  const detail = useQuery({
    queryKey: ['stock-opname', selectedId],
    queryFn: () => stockOpnamesApi.show(selectedId as number),
    enabled: selectedId !== null,
  });

  // Backend tidak me-load relasi product pada items, jadi nama produk diresolusi di klien.
  const productName = useMemo(() => {
    const map = new Map<number, string>();
    products.data?.data.forEach((product) => map.set(product.id, product.product_name));
    return (id: number) => map.get(id) ?? `Product #${id}`;
  }, [products.data]);

  const refresh = (id?: number) => {
    queryClient.invalidateQueries({ queryKey: ['stock-opnames'] });
    if (id) queryClient.invalidateQueries({ queryKey: ['stock-opname', id] });
  };

  const create = useMutation({
    mutationFn: () => {
      if (!storeId) throw new Error('store_id tidak tersedia dari user login. Backend mewajibkan store_id untuk opname.');
      return stockOpnamesApi.create({
        store_id: storeId,
        opname_date: header.opname_date,
        employee_id: user?.employee_id ?? null,
        notes: header.notes || null,
      });
    },
    onSuccess: (opname) => {
      toast.success(`Opname ${opname.opname_number} dibuat`);
      setHeader({ opname_date: today(), notes: '' });
      setSelectedId(opname.id);
      refresh();
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  const addItem = useMutation({
    mutationFn: () => stockOpnamesApi.addItem(selectedId as number, {
      product_id: Number(item.product_id),
      physical_stock: Number(item.physical_stock),
      notes: item.notes || null,
    }),
    onSuccess: () => {
      toast.success('Item opname disimpan');
      setItem({ product_id: '', physical_stock: '', notes: '' });
      refresh(selectedId ?? undefined);
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  const submit = useMutation({
    mutationFn: (id: number) => stockOpnamesApi.submit(id),
    onSuccess: (opname) => { toast.success('Opname disubmit'); refresh(opname.id); },
    onError: (error) => toast.error(getApiError(error)),
  });

  const approve = useMutation({
    mutationFn: (id: number) => stockOpnamesApi.approve(id, { approved_by: user?.employee_id ?? null }),
    onSuccess: (opname) => {
      toast.success('Opname disetujui, stok tersesuaikan');
      refresh(opname.id);
      queryClient.invalidateQueries({ queryKey: ['stock-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['stock-report'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  const selected = detail.data;
  const isDraft = selected?.status === 'draft';

  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Stock Opname</h1>
            <p className="text-sm text-muted">Hitung stok fisik dan sesuaikan dengan stok sistem.</p>
          </div>
          <Field label="Filter status">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Semua status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </Field>
        </div>

        {opnames.isLoading && <LoadingState />}
        {opnames.error && <ErrorState message={getApiError(opnames.error)} />}
        {!opnames.isLoading && !opnames.error && opnames.data?.length === 0 && (
          <EmptyState title="Belum ada opname" description="Buat opname baru lewat form di samping." />
        )}

        <div className="grid gap-3">
          {opnames.data?.map((opname: StockOpname) => (
            <button
              key={opname.id}
              onClick={() => setSelectedId(opname.id)}
              className={`rounded-md border bg-white p-4 text-left transition ${selectedId === opname.id ? 'border-brand ring-2 ring-teal-100' : 'border-line hover:bg-slate-50'}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{opname.opname_number}</p>
                  <p className="text-sm text-muted">{opname.opname_date} &middot; {opname.items?.length ?? 0} item</p>
                  {opname.notes && <p className="mt-1 text-xs text-muted">{opname.notes}</p>}
                </div>
                <Badge tone={statusTone[opname.status]}>{opname.status}</Badge>
              </div>
            </button>
          ))}
        </div>

        {selected && (
          <div className="rounded-md border border-line bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Detail {selected.opname_number}</h2>
              <div className="flex gap-2">
                {selected.status === 'draft' && (
                  <Button variant="secondary" disabled={submit.isPending} onClick={() => submit.mutate(selected.id)}>
                    <Send className="h-4 w-4" />Submit
                  </Button>
                )}
                {selected.status === 'submitted' && (
                  <Button disabled={approve.isPending} onClick={() => approve.mutate(selected.id)}>
                    <Check className="h-4 w-4" />Approve
                  </Button>
                )}
              </div>
            </div>

            {detail.isLoading && <LoadingState />}
            {selected.items?.length === 0 && <p className="mt-3 text-sm text-muted">Belum ada item.</p>}

            {selected.items && selected.items.length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted">
                    <tr>
                      <th className="py-2">Produk</th>
                      <th className="py-2 text-right">Sistem</th>
                      <th className="py-2 text-right">Fisik</th>
                      <th className="py-2 text-right">Selisih</th>
                      <th className="py-2">Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.items.map((row) => {
                      const diff = Number(row.difference);
                      return (
                        <tr key={row.id} className="border-t border-line">
                          <td className="py-2">{productName(row.product_id)}</td>
                          <td className="py-2 text-right">{decimal(row.system_stock)}</td>
                          <td className="py-2 text-right">{decimal(row.physical_stock)}</td>
                          <td className={`py-2 text-right font-semibold ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-600' : 'text-muted'}`}>
                            {diff > 0 ? '+' : ''}{decimal(row.difference)}
                          </td>
                          <td className="py-2 text-muted">{row.notes || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <aside className="grid gap-4 self-start xl:sticky xl:top-20">
        <div className="rounded-md border border-line bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">Opname Baru</h2>
          <form
            className="grid gap-3"
            onSubmit={(event) => { event.preventDefault(); create.mutate(); }}
          >
            <Field label="Tanggal opname">
              <Input type="date" value={header.opname_date} onChange={(e) => setHeader({ ...header, opname_date: e.target.value })} required />
            </Field>
            <Field label="Catatan">
              <Textarea value={header.notes} onChange={(e) => setHeader({ ...header, notes: e.target.value })} />
            </Field>
            <Button disabled={create.isPending}><Plus className="h-4 w-4" />Buat opname</Button>
          </form>
        </div>

        <div className="rounded-md border border-line bg-white p-4 shadow-sm">
          <h2 className="mb-1 text-lg font-bold">Tambah Item</h2>
          <p className="mb-4 text-xs text-muted">
            {selected
              ? isDraft
                ? `Menambah item ke ${selected.opname_number}.`
                : 'Item hanya bisa ditambah saat status draft.'
              : 'Pilih salah satu opname terlebih dahulu.'}
          </p>
          <form
            className="grid gap-3"
            onSubmit={(event) => { event.preventDefault(); addItem.mutate(); }}
          >
            <Field label="Produk">
              <Select value={item.product_id} onChange={(e) => setItem({ ...item, product_id: e.target.value })} required disabled={!isDraft}>
                <option value="">Pilih produk</option>
                {products.data?.data.map((product) => (
                  <option key={product.id} value={product.id}>{product.product_name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Stok fisik">
              <Input type="number" step="0.01" value={item.physical_stock} onChange={(e) => setItem({ ...item, physical_stock: e.target.value })} required disabled={!isDraft} />
            </Field>
            <Field label="Catatan">
              <Input value={item.notes} onChange={(e) => setItem({ ...item, notes: e.target.value })} disabled={!isDraft} />
            </Field>
            <Button disabled={!isDraft || addItem.isPending}><Plus className="h-4 w-4" />Simpan item</Button>
          </form>
        </div>
      </aside>
    </section>
  );
}
