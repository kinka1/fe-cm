import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Check, Edit2, Plus, Trash2 } from 'lucide-react';
import { storesApi } from '../api/endpoints';
import { getApiError } from '../api/client';
import { Badge, Button, Card, Field, IconButton, Input, PageHeader, Select, SplitLayout, Textarea } from '../components/ui';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { useToast } from '../lib/toast';
import { useAuth } from '../lib/auth';
import type { Store } from '../types/api';

const EMPTY_FORM: Partial<Store> = { store_name: '', code: '', address: '', phone: '', is_active: true };

export function StoresPage() {
  const [form, setForm] = useState<Partial<Store>>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const toast = useToast();
  const queryClient = useQueryClient();
  const { storeId, setCurrentStore, switchingStore } = useAuth();

  const stores = useQuery({
    queryKey: ['stores', search],
    queryFn: () => storesApi.list({ search: search || undefined, per_page: 100 }),
  });

  const reset = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const refreshStores = () => {
    queryClient.invalidateQueries({ queryKey: ['stores'] });
    queryClient.invalidateQueries({ queryKey: ['me', 'stores'] });
  };

  const save = useMutation({
    mutationFn: (payload: Partial<Store>) => (editingId ? storesApi.update(editingId, payload) : storesApi.create(payload)),
    onSuccess: () => {
      toast.success(editingId ? 'Toko diperbarui' : 'Toko dibuat');
      reset();
      refreshStores();
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  // Backend menolak (422) bila toko masih punya produk atau order.
  const remove = useMutation({
    mutationFn: storesApi.delete,
    onSuccess: () => {
      toast.success('Toko dihapus');
      refreshStores();
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    save.mutate({
      store_name: form.store_name,
      code: form.code,
      address: form.address || null,
      phone: form.phone || null,
      is_active: Boolean(form.is_active),
    });
  };

  return (
    <section className="grid gap-5">
      <PageHeader title="Toko" description="Kelola cabang. Seluruh data POS di-scope per toko oleh backend." />

      <SplitLayout
        main={
          <>
            <Card>
              <Input placeholder="Cari nama toko atau kode" value={search} onChange={(event) => setSearch(event.target.value)} />
            </Card>

            {stores.isLoading && <LoadingState />}
            {stores.error && <ErrorState message={getApiError(stores.error)} />}
            {!stores.isLoading && !stores.error && stores.data?.length === 0 && (
              <EmptyState title="Toko kosong" description="Tambahkan toko lewat form di samping." />
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {stores.data?.map((store) => (
                <Card key={store.id} className="grid gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate font-bold">{store.store_name}</h2>
                        {store.id === storeId && <Badge tone="blue">Aktif</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-muted">Kode: {store.code}</p>
                      <p className="text-sm text-muted">{store.phone || 'Tanpa telepon'}</p>
                      {store.address && <p className="mt-1 text-xs text-muted">{store.address}</p>}
                      <div className="mt-2">
                        <Badge tone={store.is_active ? 'green' : 'slate'}>{store.is_active ? 'aktif' : 'nonaktif'}</Badge>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <IconButton label="Edit toko" onClick={() => { setForm(store); setEditingId(store.id); }}>
                        <Edit2 className="h-4 w-4" />
                      </IconButton>
                      <IconButton label="Hapus toko" tone="danger" onClick={() => remove.mutate(store.id)}>
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </div>

                  {store.id !== storeId && (
                    <Button variant="secondary" size="sm" block disabled={switchingStore} onClick={() => void setCurrentStore(store.id)}>
                      <Check className="h-4 w-4" />Jadikan toko aktif
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          </>
        }
        aside={
          <Card>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <Building2 className="h-5 w-5" />{editingId ? 'Edit Toko' : 'Buat Toko'}
            </h2>
            <form onSubmit={submit} className="grid gap-3">
              <Field label="Nama toko" required>
                <Input value={form.store_name ?? ''} onChange={(event) => setForm({ ...form, store_name: event.target.value })} required maxLength={255} />
              </Field>
              <Field label="Kode" hint="Harus unik antar toko." required>
                <Input value={form.code ?? ''} onChange={(event) => setForm({ ...form, code: event.target.value })} required maxLength={50} />
              </Field>
              <Field label="Telepon">
                <Input value={form.phone ?? ''} onChange={(event) => setForm({ ...form, phone: event.target.value })} maxLength={50} />
              </Field>
              <Field label="Alamat">
                <Textarea value={form.address ?? ''} onChange={(event) => setForm({ ...form, address: event.target.value })} />
              </Field>
              <Field label="Status">
                <Select value={form.is_active ? '1' : '0'} onChange={(event) => setForm({ ...form, is_active: event.target.value === '1' })}>
                  <option value="1">Aktif</option>
                  <option value="0">Nonaktif</option>
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
