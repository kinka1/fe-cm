import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { catalogApi, recipesApi } from '../api/endpoints';
import { getApiError } from '../api/client';
import { Button, Field, Input, Select } from '../components/ui';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { useToast } from '../lib/toast';
import type { Recipe, RecipePayload } from '../types/api';

const emptyForm: RecipePayload = { product_id: 0, ingredient_id: 0, quantity_needed: 0, unit: 'gram' };

export function RecipesPage() {
  const [form, setForm] = useState<RecipePayload>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filterProduct, setFilterProduct] = useState<number | ''>('');
  const toast = useToast();
  const queryClient = useQueryClient();

  const products = useQuery({ queryKey: ['products', 'all-for-recipes'], queryFn: () => catalogApi.products({ per_page: 200 }) });
  const recipes = useQuery({
    queryKey: ['recipes', filterProduct],
    queryFn: () => recipesApi.list(filterProduct ? { product_id: filterProduct, per_page: 100 } : { per_page: 100 }),
  });

  const productMap = useMemo(() => {
    const map = new Map<number, string>();
    products.data?.data.forEach((p) => map.set(p.id, p.product_name));
    return map;
  }, [products.data]);

  const reset = () => { setForm(emptyForm); setEditingId(null); };

  const save = useMutation({
    mutationFn: (payload: RecipePayload) => editingId ? recipesApi.update(editingId, payload) : recipesApi.create(payload),
    onSuccess: () => { toast.success(editingId ? 'Recipe diperbarui' : 'Recipe dibuat'); reset(); queryClient.invalidateQueries({ queryKey: ['recipes'] }); },
    onError: (error) => toast.error(getApiError(error)),
  });
  const remove = useMutation({
    mutationFn: recipesApi.delete,
    onSuccess: () => { toast.success('Recipe dihapus'); queryClient.invalidateQueries({ queryKey: ['recipes'] }); },
    onError: (error) => toast.error(getApiError(error)),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.product_id || !form.ingredient_id) { toast.error('Pilih produk dan bahan'); return; }
    save.mutate({ ...form, quantity_needed: Number(form.quantity_needed) });
  };

  const editRecipe = (recipe: Recipe) => {
    setEditingId(recipe.id);
    setForm({
      product_id: recipe.product_id,
      ingredient_id: recipe.ingredient_id,
      quantity_needed: Number(recipe.quantity_needed),
      unit: recipe.unit,
    });
  };

  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Recipes</h1>
            <p className="text-sm text-muted">Mapping produk/menu ke bahan baku beserta jumlah pemakaian.</p>
          </div>
          <Field label="Filter produk">
            <Select value={filterProduct} onChange={(e) => setFilterProduct(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Semua produk</option>
              {products.data?.data.map((p) => <option key={p.id} value={p.id}>{p.product_name}</option>)}
            </Select>
          </Field>
        </div>

        {recipes.isLoading && <LoadingState />}
        {recipes.error && <ErrorState message={getApiError(recipes.error)} />}
        {!recipes.isLoading && !recipes.error && recipes.data?.length === 0 && (
          <EmptyState title="Belum ada recipe" description="Tambahkan resep lewat form di samping." />
        )}

        <div className="overflow-x-auto rounded-md border border-line bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Produk / Menu</th>
                <th className="px-4 py-3">Bahan</th>
                <th className="px-4 py-3">Jumlah</th>
                <th className="px-4 py-3">Satuan</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {recipes.data?.map((recipe) => (
                <tr key={recipe.id} className="border-t border-line">
                  <td className="px-4 py-3 font-semibold">{recipe.product?.product_name ?? productMap.get(recipe.product_id) ?? `#${recipe.product_id}`}</td>
                  <td className="px-4 py-3">{recipe.ingredient?.product_name ?? productMap.get(recipe.ingredient_id) ?? `#${recipe.ingredient_id}`}</td>
                  <td className="px-4 py-3">{recipe.quantity_needed}</td>
                  <td className="px-4 py-3">{recipe.unit}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button className="rounded p-2 text-muted hover:bg-slate-100" onClick={() => editRecipe(recipe)}><Edit2 className="h-4 w-4" /></button>
                      <button className="rounded p-2 text-red-600 hover:bg-red-50" onClick={() => remove.mutate(recipe.id)}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <aside className="rounded-md border border-line bg-white p-4 shadow-sm lg:sticky lg:top-20">
        <h2 className="mb-4 text-lg font-bold">{editingId ? 'Edit Recipe' : 'Create Recipe'}</h2>
        <form onSubmit={submit} className="grid gap-3">
          <Field label="Produk / Menu">
            <Select value={form.product_id || ''} onChange={(e) => setForm({ ...form, product_id: Number(e.target.value) })} required>
              <option value="">Pilih produk</option>
              {products.data?.data.map((p) => <option key={p.id} value={p.id}>{p.product_name}</option>)}
            </Select>
          </Field>
          <Field label="Bahan baku">
            <Select value={form.ingredient_id || ''} onChange={(e) => setForm({ ...form, ingredient_id: Number(e.target.value) })} required>
              <option value="">Pilih bahan</option>
              {products.data?.data.map((p) => <option key={p.id} value={p.id}>{p.product_name}</option>)}
            </Select>
          </Field>
          <Field label="Jumlah dibutuhkan">
            <Input type="number" step="0.01" min="0" value={form.quantity_needed} onChange={(e) => setForm({ ...form, quantity_needed: Number(e.target.value) })} required />
          </Field>
          <Field label="Satuan">
            <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="gram, ml, pcs" required />
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
