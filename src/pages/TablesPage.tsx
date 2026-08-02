import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Plus, QrCode, Trash2 } from 'lucide-react';
import { storesApi, tablesApi } from '../api/endpoints';
import { getApiError } from '../api/client';
import { Badge, type BadgeTone, Button, Card, Field, IconButton, Input, PageHeader, Select, SplitLayout } from '../components/ui';
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

const STATUS_TONE: Record<TableStatus, BadgeTone> = {
  available: 'green',
  occupied: 'red',
  reserved: 'amber',
};

const STATUS_LABEL: Record<TableStatus, string> = {
  available: 'Tersedia',
  occupied: 'Terisi',
  reserved: 'Dipesan',
};

const blankForm = (storeId: number | null): TableForm => ({
  table_number: '',
  qr_code: '',
  capacity: '',
  status: 'available',
  store_id: storeId ?? '',
});

export function TablesPage() {
  const { storeId } = useAuth();
  const [form, setForm] = useState<TableForm>(() => blankForm(storeId));
  const [editingId, setEditingId] = useState<number | null>(null);
  const toast = useToast();
  const queryClient = useQueryClient();

  const tables = useQuery({ queryKey: ['tables'], queryFn: () => tablesApi.list({ per_page: 100 }) });
  const stores = useQuery({ queryKey: ['stores'], queryFn: () => storesApi.list() });

  const reset = () => {
    setForm(blankForm(storeId));
    setEditingId(null);
  };

  const invalidateTables = () => queryClient.invalidateQueries({ queryKey: ['tables'] });

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
    onSuccess: () => { toast.success(editingId ? 'Meja diperbarui' : 'Meja dibuat'); reset(); invalidateTables(); },
    onError: (error) => toast.error(getApiError(error)),
  });

  const remove = useMutation({
    mutationFn: tablesApi.delete,
    onSuccess: () => { toast.success('Meja dihapus'); invalidateTables(); },
    onError: (error) => toast.error(getApiError(error)),
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: TableStatus }) => tablesApi.updateStatus(id, status),
    onSuccess: () => { toast.success('Status meja diperbarui'); invalidateTables(); },
    onError: (error) => toast.error(getApiError(error)),
  });

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

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    if (form.store_id === '') return toast.error('Pilih toko terlebih dahulu.');
    if (form.capacity === '' || Number(form.capacity) < 1) return toast.error('Kapasitas minimal 1.');
    // Saat mengedit, backend mewajibkan qr_code; saat membuat, backend yang men-generate.
    if (editingId && !form.qr_code) return toast.error('QR code wajib diisi saat mengedit meja.');

    save.mutate(form);
  };

  return (
    <section className="grid gap-5">
      <PageHeader title="Meja & QR" description="Kelola meja, kapasitas, status, dan QR code untuk order pelanggan." />

      <SplitLayout
        main={
          <>
            {tables.isLoading && <LoadingState />}
            {tables.error && <ErrorState message={getApiError(tables.error)} />}
            {!tables.isLoading && !tables.error && tables.data?.length === 0 && (
              <EmptyState title="Belum ada meja" description="Tambahkan meja lewat form di samping." />
            )}

            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {tables.data?.map((table) => (
                <Card key={table.id} className="grid gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-bold">Meja {table.table_number}</h2>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                        <QrCode className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{table.qr_code}</span>
                      </p>
                      <p className="mt-1 text-sm text-muted">Kapasitas {table.capacity} orang</p>
                      <div className="mt-2"><Badge tone={STATUS_TONE[table.status]}>{STATUS_LABEL[table.status]}</Badge></div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <IconButton label="Edit meja" onClick={() => startEdit(table)}>
                        <Edit2 className="h-4 w-4" />
                      </IconButton>
                      <IconButton label="Hapus meja" tone="danger" onClick={() => remove.mutate(table.id)}>
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </div>

                  <div className="border-t border-line pt-3">
                    <Select
                      size="sm"
                      aria-label={`Ubah status meja ${table.table_number}`}
                      value={table.status}
                      onChange={(event) => changeStatus.mutate({ id: table.id, status: event.target.value as TableStatus })}
                    >
                      {(Object.keys(STATUS_LABEL) as TableStatus[]).map((status) => (
                        <option key={status} value={status}>{STATUS_LABEL[status]}</option>
                      ))}
                    </Select>
                  </div>
                </Card>
              ))}
            </div>
          </>
        }
        aside={
          <Card>
            <h2 className="mb-4 text-lg font-bold">{editingId ? 'Edit Meja' : 'Tambah Meja'}</h2>
            <form onSubmit={submit} className="grid gap-3">
              <Field label="Nomor meja" required>
                <Input value={form.table_number} onChange={(event) => setForm({ ...form, table_number: event.target.value })} required />
              </Field>
              <Field label="Toko" required>
                <Select
                  value={form.store_id}
                  onChange={(event) => setForm({ ...form, store_id: event.target.value === '' ? '' : Number(event.target.value) })}
                  required
                >
                  <option value="">Pilih toko</option>
                  {stores.data?.map((store) => <option key={store.id} value={store.id}>{store.store_name}</option>)}
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Kapasitas" required>
                  <Input
                    type="number"
                    min="1"
                    value={form.capacity}
                    onChange={(event) => setForm({ ...form, capacity: event.target.value === '' ? '' : Number(event.target.value) })}
                    required
                  />
                </Field>
                <Field label="Status">
                  <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as TableStatus })}>
                    {(Object.keys(STATUS_LABEL) as TableStatus[]).map((status) => (
                      <option key={status} value={status}>{STATUS_LABEL[status]}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field
                label="QR code"
                hint={editingId ? undefined : 'Kosongkan agar backend membuat kode otomatis.'}
                required={Boolean(editingId)}
              >
                <Input
                  value={form.qr_code}
                  onChange={(event) => setForm({ ...form, qr_code: event.target.value })}
                  required={Boolean(editingId)}
                />
              </Field>
              <div className="flex gap-2">
                <Button type="submit" loading={save.isPending}>
                  <Plus className="h-4 w-4" />Simpan
                </Button>
                <Button type="button" variant="secondary" onClick={reset}>Reset</Button>
              </div>
            </form>
          </Card>
        }
      />
    </section>
  );
}
