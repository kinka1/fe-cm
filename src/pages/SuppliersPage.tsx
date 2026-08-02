import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { suppliersApi } from '../api/endpoints';
import { getApiError } from '../api/client';
import { Badge, Button, Card, Field, IconButton, Input, PageHeader, Select, SplitLayout, Textarea } from '../components/ui';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { useToast } from '../lib/toast';
import { useAuth } from '../lib/auth';
import type { Supplier } from '../types/api';

const EMPTY_FORM: Partial<Supplier> = {
  supplier_name: '',
  contact_name: '',
  phone: '',
  email: '',
  address: '',
  status: 'active',
};

export function SuppliersPage() {
  const [form, setForm] = useState<Partial<Supplier>>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const toast = useToast();
  const queryClient = useQueryClient();
  const { storeId } = useAuth();

  const suppliers = useQuery({ queryKey: ['suppliers'], queryFn: () => suppliersApi.list() });

  const reset = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const save = useMutation({
    mutationFn: (payload: Partial<Supplier>) => (editingId ? suppliersApi.update(editingId, payload) : suppliersApi.create(payload)),
    onSuccess: () => {
      toast.success(editingId ? 'Supplier diperbarui' : 'Supplier dibuat');
      reset();
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  const remove = useMutation({
    mutationFn: suppliersApi.delete,
    onSuccess: () => {
      toast.success('Supplier dihapus');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const targetStoreId = form.store_id ?? storeId;

    if (!targetStoreId) {
      toast.error('Toko aktif belum dipilih. Backend mewajibkan store_id untuk supplier.');
      return;
    }

    save.mutate({ ...form, store_id: targetStoreId });
  };

  return (
    <section className="grid gap-5">
      <PageHeader title="Supplier" description="Data pemasok yang dipakai saat membuat purchase order." />

      <SplitLayout
        main={
          <>
            {suppliers.isLoading && <LoadingState />}
            {suppliers.error && <ErrorState message={getApiError(suppliers.error)} />}
            {!suppliers.isLoading && !suppliers.error && suppliers.data?.length === 0 && (
              <EmptyState title="Supplier kosong" description="Tambahkan supplier lewat form di samping." />
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {suppliers.data?.map((supplier) => (
                <Card key={supplier.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-bold">{supplier.supplier_name}</h2>
                    <p className="mt-1 text-sm text-muted">{supplier.contact_name || 'Tanpa kontak person'}</p>
                    <p className="truncate text-sm text-muted">{supplier.phone || '-'} &middot; {supplier.email || '-'}</p>
                    {supplier.address && <p className="mt-1 text-xs text-muted">{supplier.address}</p>}
                    <div className="mt-2">
                      <Badge tone={supplier.status === 'active' ? 'green' : 'slate'}>{supplier.status}</Badge>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <IconButton label="Edit supplier" onClick={() => { setForm(supplier); setEditingId(supplier.id); }}>
                      <Edit2 className="h-4 w-4" />
                    </IconButton>
                    <IconButton label="Hapus supplier" tone="danger" onClick={() => remove.mutate(supplier.id)}>
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                </Card>
              ))}
            </div>
          </>
        }
        aside={
          <Card>
            <h2 className="mb-4 text-lg font-bold">{editingId ? 'Edit Supplier' : 'Buat Supplier'}</h2>
            <form onSubmit={submit} className="grid gap-3">
              <Field label="Nama supplier" required>
                <Input value={form.supplier_name ?? ''} onChange={(event) => setForm({ ...form, supplier_name: event.target.value })} required />
              </Field>
              <Field label="Kontak person">
                <Input value={form.contact_name ?? ''} onChange={(event) => setForm({ ...form, contact_name: event.target.value })} />
              </Field>
              <Field label="Telepon">
                <Input value={form.phone ?? ''} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              </Field>
              <Field label="Email">
                <Input type="email" value={form.email ?? ''} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              </Field>
              <Field label="Alamat">
                <Textarea value={form.address ?? ''} onChange={(event) => setForm({ ...form, address: event.target.value })} />
              </Field>
              <Field label="Status">
                <Select value={form.status ?? 'active'} onChange={(event) => setForm({ ...form, status: event.target.value as Supplier['status'] })}>
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </Select>
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
