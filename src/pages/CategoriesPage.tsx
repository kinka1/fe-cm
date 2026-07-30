import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { catalogApi } from '../api/endpoints';
import { getApiError } from '../api/client';
import { Button, Field, Input, Textarea } from '../components/ui';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { useToast } from '../lib/toast';
import { useAuth } from '../lib/auth';
import type { Category } from '../types/api';

export function CategoriesPage() {
  const [editing, setEditing] = useState<Partial<Category>>({ category_name: '', description: '' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const toast = useToast();
  const queryClient = useQueryClient();
  const { storeId } = useAuth();
  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories });
  const save = useMutation({ mutationFn: (payload: Partial<Category>) => editingId ? catalogApi.updateCategory(editingId, payload) : catalogApi.createCategory(payload), onSuccess: () => { toast.success(editingId ? 'Kategori diperbarui' : 'Kategori dibuat'); setEditing({ category_name: '', description: '' }); setEditingId(null); queryClient.invalidateQueries({ queryKey: ['categories'] }); }, onError: (error) => toast.error(getApiError(error)) });
  const remove = useMutation({ mutationFn: catalogApi.deleteCategory, onSuccess: () => { toast.success('Kategori dihapus'); queryClient.invalidateQueries({ queryKey: ['categories'] }); }, onError: (error) => toast.error(getApiError(error)) });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const targetStoreId = editing.store_id ?? storeId;
    if (!targetStoreId) { toast.error('store_id tidak tersedia dari user login. Backend mewajibkan store_id untuk kategori.'); return; }
    save.mutate({ ...editing, store_id: targetStoreId });
  };

  return <section className="grid gap-5 xl:grid-cols-[1fr_360px]"><div className="grid gap-4"><div><h1 className="text-2xl font-bold">Categories</h1><p className="text-sm text-muted">CRUD kategori sesuai endpoint /api/categories.</p></div>{categories.isLoading && <LoadingState />}{categories.error && <ErrorState message={getApiError(categories.error)} />}{!categories.isLoading && categories.data?.length === 0 && <EmptyState title="Kategori kosong" />}<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{categories.data?.map((category) => <div key={category.id} className="rounded-md border border-line bg-white p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold">{category.category_name}</h2><p className="mt-1 text-sm text-muted">{category.description || 'Tidak ada deskripsi'}</p></div><div className="flex gap-1"><button className="rounded p-2 text-muted hover:bg-slate-100" onClick={() => { setEditing(category); setEditingId(category.id); }}><Edit2 className="h-4 w-4" /></button><button className="rounded p-2 text-red-600 hover:bg-red-50" onClick={() => remove.mutate(category.id)}><Trash2 className="h-4 w-4" /></button></div></div></div>)}</div></div><aside className="rounded-md border border-line bg-white p-4 shadow-sm lg:sticky lg:top-20"><h2 className="mb-4 text-lg font-bold">{editingId ? 'Edit Category' : 'Create Category'}</h2><form onSubmit={submit} className="grid gap-3"><Field label="Category name"><Input value={editing.category_name ?? ''} onChange={(e) => setEditing({ ...editing, category_name: e.target.value })} required /></Field><Field label="Description"><Textarea value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field><div className="flex gap-2"><Button disabled={save.isPending}><Plus className="h-4 w-4" />Save</Button><Button type="button" variant="secondary" onClick={() => { setEditing({ category_name: '', description: '' }); setEditingId(null); }}>Reset</Button></div></form></aside></section>;
}
