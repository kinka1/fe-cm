import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Loader2, Plus, Search, Trash2, RotateCcw, X } from 'lucide-react';
import { catalogApi } from '../api/endpoints';
import { getApiError } from '../api/client';
import { Badge, Button, Field, IconButton, Input, Select, Textarea } from '../components/ui';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { currency, decimal, toNumber } from '../lib/format';
import { useToast } from '../lib/toast';
import { useAuth } from '../lib/auth';
import type { Product } from '../types/api';

const blank: Partial<Product> = { product_name: '', sku: '', category_id: 0, description: '', unit_of_measure: 'pcs', minimum_stock: 0, current_stock: 0, cost_price: 0, selling_price: 0, is_active: true };

/** Jeda sebelum ketikan dikirim ke backend; cukup untuk menampung satu kata tanpa terasa lambat. */
const SEARCH_DEBOUNCE_MS = 400;

export function ProductsPage() {
  // `search` mengikuti ketikan agar input tetap responsif; `appliedSearch` yang
  // dipakai query — dijeda supaya tiap huruf tidak memicu satu request paginasi.
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [tab, setTab] = useState<'active' | 'deleted'>('active');
  const [editing, setEditing] = useState<Partial<Product>>(blank);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [deletedPage, setDeletedPage] = useState(1);
  const [perPage] = useState(10);

  const toast = useToast();
  const queryClient = useQueryClient();
  const { storeId } = useAuth();

  // Pencarian dikirim ke backend (bukan filter di klien) karena daftar produk dipaginasi;
  // menahan data sebelumnya membuat tabel tidak berkedip tiap huruf yang diketik.
  const products = useQuery({
    queryKey: ['products', appliedSearch, storeId, activePage, perPage],
    queryFn: () => catalogApi.products({ search: appliedSearch || undefined, store_id: storeId ?? undefined, page: activePage, per_page: perPage }),
    placeholderData: (previous) => previous
  });

  const deletedProducts = useQuery({
    queryKey: ['products-deleted', appliedSearch, storeId, deletedPage, perPage],
    queryFn: () => catalogApi.deletedProducts({ search: appliedSearch || undefined, store_id: storeId ?? undefined, page: deletedPage, per_page: perPage }),
    enabled: tab === 'deleted',
    placeholderData: (previous) => previous
  });

  const categories = useQuery({ queryKey: ['categories', 'list', storeId], queryFn: () => catalogApi.categories({ store_id: storeId ?? undefined, per_page: 100 }) });

  useEffect(() => {
    setActivePage(1);
    setDeletedPage(1);
  }, [storeId]);

  /**
   * Auto-search: query dijalankan sendiri setelah user berhenti mengetik, tanpa
   * tombol cari atau Enter. Timer di-reset tiap ketikan, jadi hanya kata terakhir
   * yang benar-benar dikirim. Paginasi ikut kembali ke halaman 1 karena hasilnya set baru.
   */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAppliedSearch(search.trim());
      setActivePage(1);
      setDeletedPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [search]);

  const save = useMutation({
    mutationFn: (payload: Partial<Product>) => editingId ? catalogApi.updateProduct(editingId, payload) : catalogApi.createProduct(payload),
    onSuccess: () => {
      toast.success(editingId ? 'Produk diperbarui' : 'Produk dibuat');
      setEditing(blank);
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => toast.error(getApiError(error))
  });

  const remove = useMutation({
    mutationFn: catalogApi.deleteProduct,
    onSuccess: () => {
      toast.success('Produk dihapus (dipindahkan ke Sampah)');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-deleted'] });
    },
    onError: (error) => toast.error(getApiError(error))
  });

  const restore = useMutation({
    mutationFn: catalogApi.restoreProduct,
    onSuccess: () => {
      toast.success('Produk dipulihkan');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-deleted'] });
    },
    onError: (error) => toast.error(getApiError(error))
  });

  const forceDelete = useMutation({
    mutationFn: catalogApi.forceDeleteProduct,
    onSuccess: () => {
      toast.success('Produk dihapus permanen');
      queryClient.invalidateQueries({ queryKey: ['products-deleted'] });
    },
    onError: (error) => toast.error(getApiError(error))
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const targetStoreId = editing.store_id ?? storeId;
    if (!targetStoreId) { toast.error('store_id tidak tersedia dari user login. Backend mewajibkan store_id untuk produk.'); return; }
    save.mutate({
      ...editing,
      store_id: targetStoreId,
      category_id: Number(editing.category_id),
      minimum_stock: toNumber(editing.minimum_stock),
      current_stock: toNumber(editing.current_stock),
      cost_price: toNumber(editing.cost_price),
      selling_price: toNumber(editing.selling_price),
      is_active: Boolean(editing.is_active)
    });
  };

  const handleForceDelete = (id: number, name: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus permanen produk "${name}"?\nTindakan ini tidak dapat dibatalkan.`)) {
      forceDelete.mutate(id);
    }
  };

  // Menghapus pencarian tidak perlu menunggu debounce; hasil penuh langsung tampil.
  const clearSearch = () => {
    setSearch('');
    setAppliedSearch('');
  };

  // Selama masih menunggu debounce atau request berjalan, tampilkan spinner di dalam input.
  const searching = search.trim() !== appliedSearch || (Boolean(appliedSearch) && (tab === 'active' ? products.isFetching : deletedProducts.isFetching));

  return (
    <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="order-2 grid min-w-0 gap-4 xl:order-1">
        <div>
          <h1 className="text-xl font-bold text-ink sm:text-2xl">Products</h1>
          <p className="text-sm text-muted">Kelola katalog produk, restore produk terhapus, dan master data.</p>
        </div>

        <div className="flex border-b border-line">
          <button
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition ${tab === 'active' ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-ink'}`}
            onClick={() => setTab('active')}
          >
            Daftar Produk
          </button>
          <button
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition ${tab === 'deleted' ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-ink'}`}
            onClick={() => setTab('deleted')}
          >
            Sampah / Terhapus
          </button>
        </div>

        {/* Satu baris filter untuk kedua tab: query aktif dan query sampah sama-sama memakai `search`. */}
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
            <Search className="h-4 w-4" />
          </span>
          <Input
            className="pl-9 pr-10"
            placeholder="Nama produk atau SKU..."
            aria-label="Cari produk"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {searching ? (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
            </span>
          ) : search ? (
            <IconButton
              label="Bersihkan pencarian"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2"
              onClick={clearSearch}
            >
              <X className="h-4 w-4" />
            </IconButton>
          ) : null}
        </div>
        {tab === 'active' ? (
          <>
            {products.isLoading && <LoadingState />}
            {products.error && <ErrorState message={getApiError(products.error)} />}
            {!products.isLoading && (products.data?.data.length ?? 0) === 0 && (
              <EmptyState
                title={appliedSearch ? 'Produk tidak ditemukan' : 'Produk kosong'}
                description={appliedSearch ? `Tidak ada produk yang cocok dengan "${appliedSearch}".` : undefined}
              />
            )}

            {!products.isLoading && products.data && products.data.data.length > 0 && (
              <div className="overflow-hidden rounded-card border border-line bg-card shadow-card">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px] text-left text-sm">
                    <thead className="bg-subtle text-xs uppercase text-muted font-semibold border-b border-line">
                      <tr>
                        <th className="px-4 py-3">Produk</th>
                        <th className="px-4 py-3">SKU</th>
                        <th className="px-4 py-3">Stock</th>
                        <th className="px-4 py-3">Harga</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.data.data.map((product) => (
                        <tr key={product.id} className="border-t border-line hover:bg-subtle/40 transition">
                          <td className="px-4 py-3 font-semibold text-slate-800">{product.product_name}</td>
                          <td className="px-4 py-3 text-muted">{product.sku}</td>
                          <td className="px-4 py-3">{decimal(product.current_stock)} {product.unit_of_measure}</td>
                          <td className="px-4 py-3">{currency(product.selling_price)}</td>
                          <td className="px-4 py-3">
                            <Badge tone={product.is_active ? 'green' : 'slate'}>{product.is_active ? 'active' : 'inactive'}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <Button variant="secondary" className="h-8 min-h-8 px-3 text-xs" onClick={() => { setEditing(product); setEditingId(product.id); }}>
                                <Edit2 className="h-3 w-3" />Edit
                              </Button>
                              <Button variant="danger" className="h-8 min-h-8 px-3 text-xs" onClick={() => remove.mutate(product.id)}>
                                <Trash2 className="h-3 w-3" />Hapus
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <PaginationBar pageData={products.data} page={activePage} setPage={setActivePage} isFetching={products.isFetching} />
              </div>
            )}
          </>
        ) : (
          <>
            {deletedProducts.isLoading && <LoadingState />}
            {deletedProducts.error && <ErrorState message={getApiError(deletedProducts.error)} />}
            {!deletedProducts.isLoading && (deletedProducts.data?.data.length ?? 0) === 0 && (
              <EmptyState
                title={appliedSearch ? 'Produk tidak ditemukan' : 'Sampah kosong'}
                description={appliedSearch ? `Tidak ada produk terhapus yang cocok dengan "${appliedSearch}".` : 'Tidak ada produk yang di-soft delete.'}
              />
            )}

            {!deletedProducts.isLoading && deletedProducts.data && deletedProducts.data.data.length > 0 && (
              <div className="overflow-hidden rounded-card border border-line bg-card shadow-card">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px] text-left text-sm">
                    <thead className="bg-subtle text-xs uppercase text-muted font-semibold border-b border-line">
                      <tr>
                        <th className="px-4 py-3">Produk</th>
                        <th className="px-4 py-3">SKU</th>
                        <th className="px-4 py-3">Stock Terakhir</th>
                        <th className="px-4 py-3">Harga Jual</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {deletedProducts.data.data.map((product) => (
                        <tr key={product.id} className="border-t border-line hover:bg-subtle/40 transition">
                          <td className="px-4 py-3 font-semibold text-slate-500 line-through">{product.product_name}</td>
                          <td className="px-4 py-3 text-muted">{product.sku}</td>
                          <td className="px-4 py-3 text-muted">{decimal(product.current_stock)} {product.unit_of_measure}</td>
                          <td className="px-4 py-3 text-muted">{currency(product.selling_price)}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <Button variant="secondary" className="h-8 min-h-8 px-3 text-xs flex items-center gap-1 text-emerald-700 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50" onClick={() => restore.mutate(product.id)}>
                                <RotateCcw className="h-3 w-3" />Restore
                              </Button>
                              <Button variant="danger" className="h-8 min-h-8 px-3 text-xs" onClick={() => handleForceDelete(product.id, product.product_name)}>
                                <Trash2 className="h-3 w-3" />Hapus Permanen
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <PaginationBar pageData={deletedProducts.data} page={deletedPage} setPage={setDeletedPage} isFetching={deletedProducts.isFetching} />
              </div>
            )}
          </>
        )}
      </div>

      <aside className="order-1 xl:order-2 rounded-card border border-line bg-card p-4 shadow-card xl:sticky xl:top-4 h-fit">
        {tab === 'active' ? (
          <>
            <h2 className="mb-4 text-lg font-bold">{editingId ? 'Edit Product' : 'Create Product'}</h2>
            <form onSubmit={submit} className="grid gap-3">
              <Field label="Product name"><Input value={editing.product_name ?? ''} onChange={(e) => setEditing({ ...editing, product_name: e.target.value })} required /></Field>
              <Field label="SKU"><Input value={editing.sku ?? ''} onChange={(e) => setEditing({ ...editing, sku: e.target.value })} required /></Field>
              <Field label="Category">
                <Select value={editing.category_id ?? ''} onChange={(e) => setEditing({ ...editing, category_id: Number(e.target.value) })} required>
                  <option value="">Pilih kategori</option>
                  {categories.data?.map((cat) => <option key={cat.id} value={cat.id}>{cat.category_name}</option>)}
                </Select>
              </Field>
              <Field label="Description"><Textarea value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Unit"><Input value={editing.unit_of_measure ?? ''} onChange={(e) => setEditing({ ...editing, unit_of_measure: e.target.value })} required /></Field>
                <Field label="Active">
                  <Select value={String(Boolean(editing.is_active))} onChange={(e) => setEditing({ ...editing, is_active: e.target.value === 'true' })}>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Minimum stock"><Input type="number" value={editing.minimum_stock ?? 0} onChange={(e) => setEditing({ ...editing, minimum_stock: Number(e.target.value) })} /></Field>
                <Field label="Current stock"><Input type="number" value={editing.current_stock ?? 0} onChange={(e) => setEditing({ ...editing, current_stock: Number(e.target.value) })} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cost price"><Input type="number" value={editing.cost_price ?? 0} onChange={(e) => setEditing({ ...editing, cost_price: Number(e.target.value) })} /></Field>
                <Field label="Selling price"><Input type="number" value={editing.selling_price ?? 0} onChange={(e) => setEditing({ ...editing, selling_price: Number(e.target.value) })} /></Field>
              </div>
              <div className="flex gap-2 mt-2">
                <Button disabled={save.isPending} className="flex-1"><Plus className="h-4 w-4" />Save</Button>
                <Button type="button" variant="secondary" onClick={() => { setEditing(blank); setEditingId(null); }}>Reset</Button>
              </div>
            </form>
          </>
        ) : (
          <div className="p-4 border border-line rounded-lg bg-[#fffaf0] text-sm text-[#12323a]">
            <h3 className="font-bold text-base mb-2">Manajemen Sampah</h3>
            <p className="leading-relaxed">
              Daftar produk di halaman ini adalah produk yang telah dihapus sementara (*soft deleted*).
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-xs">
              <li>Pilih **Restore** untuk mengaktifkan kembali produk ke katalog.</li>
              <li>Pilih **Hapus Permanen** untuk menghapus produk selamanya dari sistem.</li>
            </ul>
            <p className="mt-4 text-xs text-muted">
              Kembali ke tab **Daftar Produk** untuk membuat atau mengubah data produk aktif.
            </p>
          </div>
        )}
      </aside>
    </section>
  );
}

interface PaginationBarProps {
  pageData?: {
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
  const startRow = pageData?.from ?? 0;
  const endRow = pageData?.to ?? 0;
  const totalRows = pageData?.total ?? 0;
  const lastPage = pageData?.last_page ?? 1;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-card px-4 py-3 text-sm">
      <p className="text-muted">
        Menampilkan <span className="font-semibold text-ink">{startRow || 0}-{endRow || 0}</span> dari <span className="font-semibold text-ink">{totalRows}</span> produk
      </p>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1 || isFetching} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button>
        <span className="rounded-md border border-line bg-subtle px-3 py-1 text-xs font-semibold text-ink">Page {page} / {lastPage}</span>
        <Button variant="secondary" size="sm" disabled={page >= lastPage || isFetching} onClick={() => setPage((current) => Math.min(lastPage, current + 1))}>Next</Button>
      </div>
    </div>
  );
}
