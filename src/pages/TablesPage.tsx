import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Plus, QrCode, Trash2 } from 'lucide-react';
import { storesApi, tablesApi } from '../api/endpoints';
import { getApiError } from '../api/client';
import { Badge, Button, Field, Input, Select } from '../components/ui';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { useToast } from '../lib/toast';
import { useAuth } from '../lib/auth';
import type { DiningTable, TableStatus } from '../types/api';

interface TableForm {
  table_number: string;
  qr_code: string;
  capacity: number | '';
  status: TableStatus;
  store_id: number | '';
}

const blank = (storeId: number | null): TableForm => ({
  table_number: '',
  qr_code: '',
  capacity: '',
  status: 'available',
  store_id: storeId ?? '',
});

const statusTone: Record<TableStatus, 'green' | 'amber' | 'red'> = {
  available: 'green',
  occupied: 'red',
  reserved: 'amber',
};

export function TablesPage() {
  const { storeId } = useAuth();
  const [form, setForm] = useState<TableForm>(() => blank(storeId));
  const [editingId, setEditingId] = useState<number | null>(null);
  const toast = useToast();
  const queryClient = useQueryClient();

  const tables = useQuery({ queryKey: ['tables'], queryFn: () => tablesApi.list({ per_page: 100 }) });
  const stores = useQuery({ queryKey: ['stores'], queryFn: () => storesApi.list() });

  const reset = () => { setForm(blank(storeId)); setEditingId(null); };

  const save = useMutation({
    mutationFn: (payload: TableForm) => {
      const body: Partial<DiningTable> = {
        table_number: payload.table_number,
        capacity: payload.capacity === '' ? undefined : Number(payload.capacity),
        status: payload.status,
        store_id: payload.store_id === '' ? undefined : Number(payload.store_id),
        qr_code: payload.qr_code || undefined,
      };
      return editingId ? tablesApi.update(editingId, body) : tablesApi.create(body);
    },
    onSuccess: () => { toast.success(editingId ? 'Meja diperbarui' : 'Meja dibuat'); reset(); queryClient.invalidateQueries({ queryKey: ['tables'] }); },
    onError: (error) => toast.error(getApiError(error)),
  });

  const remove = useMutation({
    mutationFn: tablesApi.delete,
    onSuccess: () => { toast.success('Meja dihapus'); queryClient.invalidateQueries({ queryKey: ['tables'] }); },
    onError: (error) => toast.error(getApiError(error)),
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: TableStatus }) => tablesApi.updateStatus(id, status),
    onSuccess: () => { toast.success('Status meja diperbarui'); queryClient.invalidateQueries({ queryKey: ['tables'] }); },
    onError: (error) => toast.error(getApiError(error)),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (form.store_id === '') { toast.error('Pilih toko/cabang terlebih dahulu.'); return; }
    if (form.capacity === '' || Number(form.capacity) < 1) { toast.error('Kapasitas minimal 1.'); return; }
    // Update backend mewajibkan qr_code; create boleh kosong (digenerate backend).
    if (editingId && !form.qr_code) { toast.error('QR code wajib diisi saat mengedit meja.'); return; }
    save.mutate(form);
  };

  const startEdit = (table: DiningTable) => {
    setForm({
      table_number: table.table_number,
      qr_code: table.qr_code,
      capacity: table.capacity,
      status: table.status,
      store_id: table.store_id ?? storeId ?? '',
    });
    setEditingId(table.id);
  };

  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="grid gap-4">
        <div>
          <h1 className="text-2xl font-bold">Meja & QR</h1>
          <p className="text-sm text-muted">Kelola meja, kapasitas, status, dan QR code untuk order pelanggan.</p>
        </div>
        {tables.isLoading && <LoadingState />}
        {tables.error && <ErrorState message={getApiError(tables.error)} />}
        {!tables.isLoading && tables.data?.length === 0 && <EmptyState title="Belum ada meja" description="Tambahkan meja lewat form di samping." />}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {tables.data?.map((table) => (
            <div key={table.id} className="rounded-md border border-line bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-bold">Meja {table.table_number}</h2>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted"><QrCode className="h-3.5 w-3.5" />{table.qr_code}</p>
                  <p className="mt-1 text-sm text-muted">Kapasitas {table.capacity} orang</p>
                  <div className="mt-2"><Badge tone={statusTone[table.status]}>{table.status}</Badge></div>
                </div>
                <div className="flex gap-1">
                  <button className="rounded p-2 text-muted hover:bg-slate-100" onClick={() => startEdit(table)} aria-label="Edit"><Edit2 className="h-4 w-4" /></button>
                  <button className="rounded p-2 text-red-600 hover:bg-red-50" onClick={() => remove.mutate(table.id)} aria-label="Hapus"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="mt-3 border-t border-line pt-3">
                <Select
                  value={table.status}
                  onChange={(e) => changeStatus.mutate({ id: table.id, status: e.target.value as TableStatus })}
                  className="h-9 min-h-9 text-xs"
                >
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="reserved">Reserved</option>
                </Select>
              </div>
            </div>
          ))}
        </div>
      </div>

      <aside className="rounded-md border border-line bg-white p-4 shadow-sm xl:sticky xl:top-20 h-fit">
        <h2 className="mb-4 text-lg font-bold">{editingId ? 'Edit Meja' : 'Tambah Meja'}</h2>
        <form onSubmit={submit} className="grid gap-3">
          <Field label="Nomor meja"><Input value={form.table_number} onChange={(e) => setForm({ ...form, table_number: e.target.value })} required /></Field>
          <Field label="Toko/Cabang">
            <Select value={form.store_id} onChange={(e) => setForm({ ...form, store_id: e.target.value === '' ? '' : Number(e.target.value) })} required>
              <option value="">Pilih toko</option>
              {stores.data?.map((store) => <option key={store.id} value={store.id}>{store.store_name}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kapasitas"><Input type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value === '' ? '' : Number(e.target.value) })} required /></Field>
            <Field label="Status">
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TableStatus })}>
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="reserved">Reserved</option>
              </Select>
            </Field>
          </div>
          <Field label={editingId ? 'QR code' : 'QR code (opsional, digenerate backend)'}>
            <Input value={form.qr_code} onChange={(e) => setForm({ ...form, qr_code: e.target.value })} placeholder={editingId ? '' : 'Kosongkan untuk generate otomatis'} required={!!editingId} />
          </Field>
          <div className="flex gap-2">
            <Button disabled={save.isPending}><Plus className="h-4 w-4" />Save</Button>
            <Button type="button" variant="secondary" onClick={reset}>Reset</Button>
          </div>
        </form>
      </aside>
    </section>
  );
}
