import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { suppliersApi } from '../api/endpoints';
import { getApiError } from '../api/client';
import { Badge, Button, Field, Input, Select, Textarea } from '../components/ui';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { useToast } from '../lib/toast';
import { useAuth } from '../lib/auth';
import type { Supplier } from '../types/api';

const emptyForm: Partial<Supplier> = { supplier_name: '', contact_name: '', phone: '', email: '', address: '', status: 'active' };

export function SuppliersPage() {
  const [form, setForm] = useState<Partial<Supplier>>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const toast = useToast();
  const queryClient = useQueryClient();
  const { storeId } = useAuth();
  const suppliers = useQuery({ queryKey: ['suppliers'], queryFn: () => suppliersApi.list() });

  const reset = () => { setForm(emptyForm); setEditingId(null); };
  const save = useMutation({
    mutationFn: (payload: Partial<Supplier>) => editingId ? suppliersApi.update(editingId, payload) : suppliersApi.create(payload),
    onSuccess: () => { toast.success(editingId ? 'Supplier diperbarui' : 'Supplier dibuat'); reset(); queryClient.invalidateQueries({ queryKey: ['suppliers'] }); },
    onError: (error) => toast.error(getApiError(error)),
  });
  const remove = useMutation({
    mutationFn: suppliersApi.delete,
    onSuccess: () => { toast.success('Supplier dihapus'); queryClient.invalidateQueries({ queryKey: ['suppliers'] }); },
    onError: (error) => toast.error(getApiError(error)),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const targetStoreId = form.store_id ?? storeId;
    if (!targetStoreId) { toast.error('store_id tidak tersedia dari user login. Backend mewajibkan store_id untuk supplier.'); return; }
    save.mutate({ ...form, store_id: targetStoreId });
  };

  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="grid gap-4">
        <div>
          <h1 className="text-2xl font-bold">Suppliers</h1>
          <p className="text-sm text-muted">Data pemasok untuk purchase order.</p>
        </div>
        {suppliers.isLoading && <LoadingState />}
        {suppliers.error && <ErrorState message={getApiError(suppliers.error)} />}
        {!suppliers.isLoading && !suppliers.error && suppliers.data?.length === 0 && <EmptyState title="Supplier kosong" description="Tambahkan supplier lewat form di samping." />}
        <div className="grid gap-3 md:grid-cols-2">
          {suppliers.data?.map((supplier) => (
            <div key={supplier.id} className="rounded-md border border-line bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-bold">{supplier.supplier_name}</h2>
                  <p className="mt-1 text-sm text-muted">{supplier.contact_name || 'Tanpa kontak person'}</p>
                  <p className="text-sm text-muted">{supplier.phone || '-'} &middot; {supplier.email || '-'}</p>
                  {supplier.address && <p className="mt-1 text-xs text-muted">{supplier.address}</p>}
                  <div className="mt-2"><Badge tone={supplier.status === 'active' ? 'green' : 'slate'}>{supplier.status}</Badge></div>
                </div>
                <div className="flex gap-1">
                  <button className="rounded p-2 text-muted hover:bg-slate-100" onClick={() => { setForm(supplier); setEditingId(supplier.id); }}><Edit2 className="h-4 w-4" /></button>
                  <button className="rounded p-2 text-red-600 hover:bg-red-50" onClick={() => remove.mutate(supplier.id)}><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <aside className="rounded-md border border-line bg-white p-4 shadow-sm lg:sticky lg:top-20">
        <h2 className="mb-4 text-lg font-bold">{editingId ? 'Edit Supplier' : 'Create Supplier'}</h2>
        <form onSubmit={submit} className="grid gap-3">
          <Field label="Supplier name"><Input value={form.supplier_name ?? ''} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} required /></Field>
          <Field label="Contact name"><Input value={form.contact_name ?? ''} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></Field>
          <Field label="Phone"><Input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Address"><Textarea value={form.address ?? ''} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <Field label="Status">
            <Select value={form.status ?? 'active'} onChange={(e) => setForm({ ...form, status: e.target.value as Supplier['status'] })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
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
