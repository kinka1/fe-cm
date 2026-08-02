import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { catalogApi, recipesApi } from '../api/endpoints';
import { getApiError } from '../api/client';
import { Button, Card, Field, IconButton, Input, PageHeader, Select, SplitLayout, TableShell, Td, Th, THead, TRow } from '../components/ui';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { decimal } from '../lib/format';
import { useToast } from '../lib/toast';
import type { Recipe, RecipePayload } from '../types/api';

const EMPTY_FORM: RecipePayload = { product_id: 0, ingredient_id: 0, quantity_needed: 0, unit: 'gram' };

export function RecipesPage() {
  const [form, setForm] = useState<RecipePayload>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filterProduct, setFilterProduct] = useState<number | ''>('');
  const toast = useToast();
  const queryClient = useQueryClient();

  const products = useQuery({ queryKey: ['products', 'all-for-recipes'], queryFn: () => catalogApi.products({ per_page: 200 }) });
  const productOptions = useMemo(() => products.data?.data ?? [], [products.data]);
  const productNames = useMemo(
    () => new Map(productOptions.map((product) => [product.id, product.product_name])),
    [productOptions],
  );

  const recipes = useQuery({
    queryKey: ['recipes', filterProduct],
    queryFn: () => recipesApi.list(filterProduct ? { product_id: filterProduct, per_page: 100 } : { per_page: 100 }),
  });

  const reset = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const save = useMutation({
    mutationFn: (payload: RecipePayload) => (editingId ? recipesApi.update(editingId, payload) : recipesApi.create(payload)),
    onSuccess: () => {
      toast.success(editingId ? 'Resep diperbarui' : 'Resep dibuat');
      reset();
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  const remove = useMutation({
    mutationFn: recipesApi.delete,
    onSuccess: () => {
      toast.success('Resep dihapus');
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  const editRecipe = (recipe: Recipe) => {
    setEditingId(recipe.id);
    setForm({
      product_id: recipe.product_id,
      ingredient_id: recipe.ingredient_id,
      quantity_needed: Number(recipe.quantity_needed),
      unit: recipe.unit,
    });
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.product_id || !form.ingredient_id) {
      toast.error('Pilih produk dan bahan');
      return;
    }

    save.mutate({ ...form, quantity_needed: Number(form.quantity_needed) });
  };

  const nameOf = (id: number, fallback?: string) => fallback ?? productNames.get(id) ?? `Produk #${id}`;

  return (
    <section className="grid gap-5">
      <PageHeader
        title="Resep"
        description="Pemetaan menu ke bahan baku; dipakai backend untuk memotong stok saat order dibayar."
      />

      <SplitLayout
        main={
          <>
            <Card>
              <Field label="Filter produk">
                <Select value={filterProduct} onChange={(event) => setFilterProduct(event.target.value ? Number(event.target.value) : '')}>
                  <option value="">Semua produk</option>
                  {productOptions.map((product) => <option key={product.id} value={product.id}>{product.product_name}</option>)}
                </Select>
              </Field>
            </Card>

            {recipes.isLoading && <LoadingState />}
            {recipes.error && <ErrorState message={getApiError(recipes.error)} />}
            {!recipes.isLoading && !recipes.error && recipes.data?.length === 0 && (
              <EmptyState title="Belum ada resep" description="Tambahkan resep lewat form di samping." />
            )}

            {(recipes.data?.length ?? 0) > 0 && (
              <TableShell minWidth="min-w-[640px]">
                <THead>
                  <tr>
                    <Th>Produk / Menu</Th>
                    <Th>Bahan</Th>
                    <Th align="right">Jumlah</Th>
                    <Th>Satuan</Th>
                    <Th align="right">Aksi</Th>
                  </tr>
                </THead>
                <tbody>
                  {recipes.data?.map((recipe) => (
                    <TRow key={recipe.id}>
                      <Td className="font-semibold">{nameOf(recipe.product_id, recipe.product?.product_name)}</Td>
                      <Td>{nameOf(recipe.ingredient_id, recipe.ingredient?.product_name)}</Td>
                      <Td align="right">{decimal(recipe.quantity_needed)}</Td>
                      <Td>{recipe.unit}</Td>
                      <Td align="right">
                        <div className="flex justify-end gap-1">
                          <IconButton label="Edit resep" onClick={() => editRecipe(recipe)}>
                            <Edit2 className="h-4 w-4" />
                          </IconButton>
                          <IconButton label="Hapus resep" tone="danger" onClick={() => remove.mutate(recipe.id)}>
                            <Trash2 className="h-4 w-4" />
                          </IconButton>
                        </div>
                      </Td>
                    </TRow>
                  ))}
                </tbody>
              </TableShell>
            )}
          </>
        }
        aside={
          <Card>
            <h2 className="mb-4 text-lg font-bold">{editingId ? 'Edit Resep' : 'Buat Resep'}</h2>
            <form onSubmit={submit} className="grid gap-3">
              <Field label="Produk / Menu" required>
                <Select value={form.product_id || ''} onChange={(event) => setForm({ ...form, product_id: Number(event.target.value) })} required>
                  <option value="">Pilih produk</option>
                  {productOptions.map((product) => <option key={product.id} value={product.id}>{product.product_name}</option>)}
                </Select>
              </Field>
              <Field label="Bahan baku" required>
                <Select value={form.ingredient_id || ''} onChange={(event) => setForm({ ...form, ingredient_id: Number(event.target.value) })} required>
                  <option value="">Pilih bahan</option>
                  {productOptions.map((product) => <option key={product.id} value={product.id}>{product.product_name}</option>)}
                </Select>
              </Field>
              <Field label="Jumlah dibutuhkan" required>
                <Input type="number" step="0.01" min="0" value={form.quantity_needed} onChange={(event) => setForm({ ...form, quantity_needed: Number(event.target.value) })} required />
              </Field>
              <Field label="Satuan" required>
                <Input value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} placeholder="gram, ml, pcs" required />
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
