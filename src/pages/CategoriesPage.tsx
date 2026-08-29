import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { catalogApi } from '../api/endpoints';
import { getApiError } from '../api/client';
import { Button, Card, Field, IconButton, Input, PageHeader, SplitLayout, Textarea } from '../components/ui';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { useToast } from '../lib/toast';
import { useAuth } from '../lib/auth';
import type { Category } from '../types/api';

const EMPTY_FORM: Partial<Category> = { category_name: '', description: '' };

export function CategoriesPage() {
  const [form, setForm] = useState<Partial<Category>>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [perPage] = useState(15);
  const toast = useToast();
  const queryClient = useQueryClient();
  const { storeId } = useAuth();

  const categories = useQuery({
    queryKey: ['categories', 'paginated', storeId, page, perPage],
    queryFn: () => catalogApi.categoriesPaginated({ store_id: storeId ?? undefined, page, per_page: perPage }),
  });

  useEffect(() => {
    setPage(1);
  }, [storeId]);

  const reset = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const save = useMutation({
    mutationFn: (payload: Partial<Category>) => (editingId ? catalogApi.updateCategory(editingId, payload) : catalogApi.createCategory(payload)),
    onSuccess: () => {
      toast.success(editingId ? 'Kategori diperbarui' : 'Kategori dibuat');
      reset();
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  const remove = useMutation({
    mutationFn: catalogApi.deleteCategory,
    onSuccess: () => {
      toast.success('Kategori dihapus');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const targetStoreId = form.store_id ?? storeId;

    if (!targetStoreId) {
      toast.error('Toko aktif belum dipilih. Backend mewajibkan store_id untuk kategori.');
      return;
    }

    save.mutate({ ...form, store_id: targetStoreId });
  };

  return (
    <section className="grid gap-5">
      <PageHeader title="Kategori" description="Kelompok produk yang dipakai di menu POS dan katalog." />

      <SplitLayout
        main={
          <>
            {categories.isLoading && <LoadingState />}
            {categories.error && <ErrorState message={getApiError(categories.error)} />}
            {!categories.isLoading && !categories.error && categories.data?.data.length === 0 && (
              <EmptyState title="Kategori kosong" description="Tambahkan kategori lewat form di samping." />
            )}

           

            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {categories.data?.data.map((category) => (
                <Card key={category.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-bold">{category.category_name}</h2>
                    <p className="mt-1 text-sm text-muted">{category.description || 'Tidak ada deskripsi'}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <IconButton label="Edit kategori" onClick={() => { setForm(category); setEditingId(category.id); }}>
                      <Edit2 className="h-4 w-4" />
                    </IconButton>
                    <IconButton label="Hapus kategori" tone="danger" onClick={() => remove.mutate(category.id)}>
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                </Card>
              ))}
            </div>

            {categories.data && categories.data.data.length > 0 && (
              <PaginationBar pageData={categories.data} page={page} setPage={setPage} isFetching={categories.isFetching} />
            )}
          </>
        }
        aside={
          <Card>
            <h2 className="mb-4 text-lg font-bold">{editingId ? 'Edit Kategori' : 'Buat Kategori'}</h2>
            <form onSubmit={submit} className="grid gap-3">
              <Field label="Nama kategori" required>
                <Input value={form.category_name ?? ''} onChange={(event) => setForm({ ...form, category_name: event.target.value })} required />
              </Field>
              <Field label="Deskripsi">
                <Textarea value={form.description ?? ''} onChange={(event) => setForm({ ...form, description: event.target.value })} />
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

interface PaginationBarProps {
  pageData: {
    from: number | null;
    to: number | null;
    total: number;
    last_page: number;
  };
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  isFetching: boolean;
}

function PaginationBar({ pageData, page, setPage, isFetching }: PaginationBarProps) {
  const startRow = pageData.from ?? 0;
  const endRow = pageData.to ?? 0;
  const totalRows = pageData.total ?? 0;
  const lastPage = pageData.last_page ?? 1;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-card px-4 py-3 text-sm shadow-card">
      <p className="text-muted">
        Menampilkan <span className="font-semibold text-ink">{startRow || 0}-{endRow || 0}</span> dari <span className="font-semibold text-ink">{totalRows}</span> kategori
      </p>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1 || isFetching} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button>
        <span className="rounded-md border border-line bg-subtle px-3 py-1 text-xs font-semibold text-ink">Page {page} / {lastPage}</span>
        <Button variant="secondary" size="sm" disabled={page >= lastPage || isFetching} onClick={() => setPage((current) => Math.min(lastPage, current + 1))}>Next</Button>
      </div>
    </div>
  );
}
