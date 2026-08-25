import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Link2, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { posApi, catalogApi } from '../api/endpoints';
import { getApiError } from '../api/client';
import { Badge, Button, Card, Field, Input, PageHeader, Select, SplitLayout } from '../components/ui';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { currency, toNumber } from '../lib/format';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import type { Modifier } from '../types/api';

const EMPTY_MODIFIER: Partial<Modifier> = { name: '', price_delta: 0, is_active: true };

export function ModifiersPage() {
  const { storeId } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [modifierForm, setModifierForm] = useState<Partial<Modifier>>(EMPTY_MODIFIER);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [assignForm, setAssignForm] = useState({ category_id: '', modifier_id: '', is_active: 'true' });

  const modifiers = useQuery({
    queryKey: ['pos-modifiers', storeId],
    queryFn: () => posApi.modifiers({ store_id: storeId }),
    enabled: Boolean(storeId),
  });

  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories });

  const menuPreview = useQuery({
    queryKey: ['pos-menu-preview', storeId],
    queryFn: () => posApi.menu({ store_id: storeId, per_page: 100 }),
    enabled: Boolean(storeId),
  });

  const categoriesById = useMemo(() => {
    const map = new Map<number, string>();
    categories.data?.forEach((category) => map.set(category.id, category.category_name));
    return map;
  }, [categories.data]);

  const productsByCategory = useMemo(() => {
    const groups = new Map<string, NonNullable<typeof menuPreview.data>['data']>();
    menuPreview.data?.data.forEach((product) => {
      const categoryName = product.category?.category_name ?? categoriesById.get(product.category_id) ?? 'Other';
      groups.set(categoryName, [...(groups.get(categoryName) ?? []), product]);
    });
    return Array.from(groups.entries());
  }, [categoriesById, menuPreview.data]);

  const createModifier = useMutation({
    mutationFn: (payload: Partial<Modifier>) => (editingId ? posApi.updateModifier(editingId, payload) : posApi.createModifier(payload)),
    onSuccess: () => {
      toast.success(editingId ? 'Modifier diperbarui' : 'Modifier dibuat');
      setModifierForm(EMPTY_MODIFIER);
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['pos-modifiers'] });
      queryClient.invalidateQueries({ queryKey: ['pos-menu-preview'] });
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  const deleteModifier = useMutation({
    mutationFn: posApi.deleteModifier,
    onSuccess: () => {
      toast.success('Modifier dihapus');
      setModifierForm(EMPTY_MODIFIER);
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['pos-modifiers'] });
      queryClient.invalidateQueries({ queryKey: ['pos-menu-preview'] });
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  const assignModifier = useMutation({
    mutationFn: (payload: { categoryId: number; modifierId: number; isActive: boolean }) =>
      posApi.assignCategoryModifier(payload.categoryId, { modifier_id: payload.modifierId, is_active: payload.isActive }),
    onSuccess: () => {
      toast.success('Modifier ditambahkan ke kategori');
      setAssignForm({ category_id: '', modifier_id: '', is_active: 'true' });
      queryClient.invalidateQueries({ queryKey: ['pos-menu-preview'] });
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  const submitModifier = (event: React.FormEvent) => {
    event.preventDefault();
    if (!storeId) {
      toast.error('Pilih toko aktif terlebih dahulu.');
      return;
    }

    const payload: Partial<Modifier> = {
      name: modifierForm.name?.trim(),
      price_delta: toNumber(modifierForm.price_delta),
      is_active: Boolean(modifierForm.is_active),
    };

    createModifier.mutate(editingId ? payload : { ...payload, store_id: storeId });
  };

  const editModifier = (modifier: Modifier) => {
    setEditingId(modifier.id);
    setModifierForm({ name: modifier.name, price_delta: modifier.price_delta, is_active: Boolean(modifier.is_active) });
  };

  const resetModifierForm = () => {
    setEditingId(null);
    setModifierForm(EMPTY_MODIFIER);
  };

  const removeModifier = (modifier: Modifier) => {
    if (window.confirm(`Hapus modifier "${modifier.name}"?`)) deleteModifier.mutate(modifier.id);
  };

  const submitAssign = (event: React.FormEvent) => {
    event.preventDefault();
    const categoryId = Number(assignForm.category_id);
    const modifierId = Number(assignForm.modifier_id);

    if (!categoryId || !modifierId) {
      toast.error('Pilih kategori dan modifier terlebih dahulu.');
      return;
    }

    assignModifier.mutate({ categoryId, modifierId, isActive: assignForm.is_active === 'true' });
  };

  const activeStoreLabel = storeId ? `Store #${storeId}` : 'Belum dipilih';

  return (
    <section className="grid gap-5">
      <PageHeader title="Modifier Management" description="Kelola modifier menu, assign ke kategori, dan preview menu POS." />

      <SplitLayout
        main={
          <div className="grid gap-5">
            <Card className="grid gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Daftar Modifier</h2>
                  <p className="text-sm text-muted">Store: {activeStoreLabel}</p>
                </div>
                <Badge tone={storeId ? 'green' : 'amber'}>{storeId ? 'Store aktif' : 'Pilih store'}</Badge>
              </div>

              {!storeId && <EmptyState title="Store belum dipilih" description="Pilih store aktif dari sidebar/header untuk melihat modifier." />}
              {modifiers.isLoading && <LoadingState />}
              {modifiers.error && <ErrorState message={getApiError(modifiers.error)} />}
              {storeId && !modifiers.isLoading && !modifiers.error && modifiers.data?.length === 0 && <EmptyState title="Modifier kosong" description="Tambahkan modifier lewat form di samping." />}

              {modifiers.data && modifiers.data.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                  {modifiers.data.map((modifier) => (
                    <div key={modifier.id} className="rounded-card border border-line bg-subtle/40 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate font-bold text-ink">{modifier.name}</h3>
                          <p className="mt-1 text-sm font-semibold text-muted">+{currency(modifier.price_delta)}</p>
                        </div>
                        <Badge tone={modifier.is_active ? 'green' : 'slate'}>{modifier.is_active ? 'Aktif' : 'Nonaktif'}</Badge>
                      </div>
                      <div className="mt-4 flex justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => editModifier(modifier)} disabled={deleteModifier.isPending}>
                          <Edit2 className="h-4 w-4" />Edit
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => removeModifier(modifier)} loading={deleteModifier.isPending}>
                          <Trash2 className="h-4 w-4" />Hapus
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="grid gap-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-brand" />
                <div>
                  <h2 className="text-lg font-bold">Menu Preview</h2>
                  <p className="text-sm text-muted">Produk dari endpoint POS menu beserta modifier aktifnya.</p>
                </div>
              </div>

              {menuPreview.isLoading && <LoadingState />}
              {menuPreview.error && <ErrorState message={getApiError(menuPreview.error)} />}
              {!menuPreview.isLoading && !menuPreview.error && productsByCategory.length === 0 && <EmptyState title="Menu kosong" />}

              <div className="grid gap-4">
                {productsByCategory.map(([categoryName, products]) => (
                  <section key={categoryName} className="rounded-card border border-line bg-white p-4">
                    <h3 className="mb-3 font-bold text-ink">{categoryName}</h3>
                    <div className="grid gap-2">
                      {products.map((product) => (
                        <div key={product.id} className="rounded-md border border-line p-3 text-sm">
                          <div className="flex justify-between gap-3">
                            <strong className="min-w-0 truncate">{product.product_name}</strong>
                            <span className="shrink-0 font-semibold">{currency(product.selling_price)}</span>
                          </div>
                          <p className="mt-1 text-xs text-muted">
                            Modifier:{' '}
                            {product.modifiers && product.modifiers.length > 0
                              ? product.modifiers.map((modifier) => `${modifier.name} +${currency(modifier.price_delta)}`).join(', ')
                              : '-'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </Card>
          </div>
        }
        aside={
          <div className="grid gap-4">
            <Card>
              <h2 className="mb-4 text-lg font-bold">{editingId ? 'Edit Modifier' : 'Tambah Modifier'}</h2>
              <form onSubmit={submitModifier} className="grid gap-3">
                <Field label="Nama modifier" required>
                  <Input value={modifierForm.name ?? ''} onChange={(event) => setModifierForm({ ...modifierForm, name: event.target.value })} placeholder="Upsize" required />
                </Field>
                <Field label="Tambah harga" required>
                  <Input type="number" min={0} value={modifierForm.price_delta ?? 0} onChange={(event) => setModifierForm({ ...modifierForm, price_delta: event.target.value })} required />
                </Field>
                <Field label="Status">
                  <Select value={modifierForm.is_active ? 'true' : 'false'} onChange={(event) => setModifierForm({ ...modifierForm, is_active: event.target.value === 'true' })}>
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </Select>
                </Field>
                <div className="flex gap-2">
                  <Button type="submit" loading={createModifier.isPending} disabled={!storeId}>
                    <Plus className="h-4 w-4" />{editingId ? 'Update Modifier' : 'Simpan Modifier'}
                  </Button>
                  {editingId && <Button type="button" variant="secondary" onClick={resetModifierForm}>Batal</Button>}
                </div>
              </form>
            </Card>

            <Card>
              <h2 className="mb-4 text-lg font-bold">Assign Modifier</h2>
              <form onSubmit={submitAssign} className="grid gap-3">
                <Field label="Category" required>
                  <Select value={assignForm.category_id} onChange={(event) => setAssignForm({ ...assignForm, category_id: event.target.value })} required>
                    <option value="">Pilih kategori</option>
                    {categories.data?.map((category) => (
                      <option key={category.id} value={category.id}>{category.category_name}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Modifier" required>
                  <Select value={assignForm.modifier_id} onChange={(event) => setAssignForm({ ...assignForm, modifier_id: event.target.value })} required>
                    <option value="">Pilih modifier</option>
                    {modifiers.data?.map((modifier) => (
                      <option key={modifier.id} value={modifier.id}>{modifier.name} +{currency(modifier.price_delta)}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Status">
                  <Select value={assignForm.is_active} onChange={(event) => setAssignForm({ ...assignForm, is_active: event.target.value })}>
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </Select>
                </Field>
                <Button type="submit" loading={assignModifier.isPending} disabled={!storeId}>
                  <Link2 className="h-4 w-4" />Simpan Assign
                </Button>
              </form>
            </Card>
          </div>
        }
      />
    </section>
  );
}
