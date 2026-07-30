import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Download, X, Loader2 } from 'lucide-react';
import { catalogApi, stockApi } from '../api/endpoints';
import { getApiError } from '../api/client';
import { Badge, Button, Field, Input, Select, Textarea } from '../components/ui';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { dateTime, decimal, toNumber, currency } from '../lib/format';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';

export function StockPage() {
  const [form, setForm] = useState({ product_id: '', transaction_type: 'in', quantity: '', reference_type: 'purchase', notes: '' });
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  // Stock Report Filters State
  const [filters, setFilters] = useState({
    search: '',
    category_id: '',
    product_id: '',
    low_stock_only: false,
  });

  // Stock Card Modal State
  const [selectedProductCard, setSelectedProductCard] = useState<number | null>(null);
  const [cardFromDate, setCardFromDate] = useState('');
  const [cardToDate, setCardToDate] = useState('');
  const [cardTransactionType, setCardTransactionType] = useState('');
  const [cardReferenceType, setCardReferenceType] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Queries
  const products = useQuery({ queryKey: ['products', 'stock'], queryFn: () => catalogApi.products({ per_page: 200 }) });
  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories });
  const transactions = useQuery({ queryKey: ['stock-transactions'], queryFn: () => stockApi.transactions({ per_page: 50 }) });
  
  const report = useQuery({
    queryKey: ['stock-report', filters],
    queryFn: () => stockApi.report({
      search: filters.search || undefined,
      category_id: filters.category_id ? Number(filters.category_id) : undefined,
      product_id: filters.product_id ? Number(filters.product_id) : undefined,
      low_stock_only: filters.low_stock_only ? true : undefined,
    }),
  });

  const cardQuery = useQuery({
    queryKey: ['stock-card', selectedProductCard, cardFromDate, cardToDate, cardTransactionType, cardReferenceType],
    queryFn: () => {
      if (!selectedProductCard) return null;
      return stockApi.card(selectedProductCard, {
        from_date: cardFromDate || undefined,
        to_date: cardToDate || undefined,
        transaction_type: cardTransactionType || undefined,
        reference_type: cardReferenceType || undefined,
      });
    },
    enabled: !!selectedProductCard,
  });

  const productMap = useMemo(() => new Map((products.data?.data ?? []).map((product) => [product.id, product])), [products.data]);
  const lowStock = (products.data?.data ?? []).filter((product) => toNumber(product.current_stock) <= toNumber(product.minimum_stock));

  // Mutations
  const mutation = useMutation({
    mutationFn: stockApi.createTransaction,
    onSuccess: () => {
      toast.success('Transaksi stok dibuat');
      setForm({ product_id: '', transaction_type: 'in', quantity: '', reference_type: 'purchase', notes: '' });
      queryClient.invalidateQueries({ queryKey: ['stock-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['stock-report'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => toast.error(getApiError(error))
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    mutation.mutate({
      product_id: Number(form.product_id),
      transaction_type: form.transaction_type as 'in' | 'out' | 'adjustment',
      quantity: Number(form.quantity),
      reference_type: form.reference_type as 'purchase' | 'sale' | 'adjustment',
      employee_id: user?.employee_id ?? null,
      notes: form.notes || null
    });
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const blob = await stockApi.exportReport({
        search: filters.search || undefined,
        category_id: filters.category_id ? Number(filters.category_id) : undefined,
        product_id: filters.product_id ? Number(filters.product_id) : undefined,
        low_stock_only: filters.low_stock_only ? true : undefined,
      });
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `stock-report-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success('Laporan stok berhasil diexport ke CSV');
    } catch (error) {
      toast.error('Gagal mengekspor CSV: ' + getApiError(error));
    } finally {
      setIsExporting(false);
    }
  };

  if (products.isLoading || transactions.isLoading || report.isLoading) return <LoadingState />;

  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="grid gap-5">
        <div>
          <h1 className="text-2xl font-bold">Stock</h1>
          <p className="text-sm text-muted">Transaksi stok, laporan stok, dan kartu riwayat stok.</p>
        </div>

        {(products.error || transactions.error || report.error) && <ErrorState message="Gagal memuat salah satu data stok." />}

        {lowStock.length > 0 && (
          <div className="grid gap-3 md:grid-cols-3">
            {lowStock.slice(0, 6).map((product) => (
              <div key={product.id} className="rounded-md border border-amber-200 bg-amber-50 p-4">
                <p className="font-bold text-amber-900">{product.product_name}</p>
                <p className="text-sm text-amber-800">Stock {decimal(product.current_stock)} / min {decimal(product.minimum_stock)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Stock Report Section */}
        <div className="rounded-md border border-line bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
            <div>
              <h2 className="font-bold text-lg">Stock Report</h2>
              <p className="text-xs text-muted">Klik nama produk untuk melihat detail Kartu Stok.</p>
            </div>
            <Button
              variant="secondary"
              onClick={handleExportCSV}
              disabled={isExporting}
              className="flex items-center gap-2 hover:bg-slate-50 transition"
            >
              <Download className="h-4 w-4" />
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          </div>

          {/* Filters Bar */}
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 bg-slate-50/50 p-3 rounded-md border border-line/80">
            <Field label="Cari Produk">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
                  <Search className="h-4 w-4" />
                </span>
                <Input
                  placeholder="Nama atau SKU..."
                  className="pl-9 h-9 min-h-9"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
            </Field>

            <Field label="Kategori">
              <Select
                value={filters.category_id}
                onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
                className="h-9 min-h-9"
              >
                <option value="">Semua Kategori</option>
                {categories.data?.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                ))}
              </Select>
            </Field>

            <Field label="Produk">
              <Select
                value={filters.product_id}
                onChange={(e) => setFilters({ ...filters, product_id: e.target.value })}
                className="h-9 min-h-9"
              >
                <option value="">Semua Produk</option>
                {products.data?.data.map((prod) => (
                  <option key={prod.id} value={prod.id}>{prod.product_name}</option>
                ))}
              </Select>
            </Field>

            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filters.low_stock_only}
                  onChange={(e) => setFilters({ ...filters, low_stock_only: e.target.checked })}
                  className="h-4 w-4 rounded border-line text-brand focus:ring-brand"
                />
                <span className="text-sm font-medium text-ink">Hanya Low Stock</span>
              </label>
            </div>
          </div>

          {(filters.search || filters.category_id || filters.product_id || filters.low_stock_only) && (
            <div className="mb-3 flex justify-end">
              <Button
                variant="ghost"
                onClick={() => setFilters({ search: '', category_id: '', product_id: '', low_stock_only: false })}
                className="text-xs h-7 min-h-7 px-2 hover:bg-slate-100 transition"
              >
                Reset Filter
              </Button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-muted font-semibold border-b border-line">
                <tr>
                  <th className="px-4 py-3">Produk</th>
                  <th className="px-4 py-3">In</th>
                  <th className="px-4 py-3">Out</th>
                  <th className="px-4 py-3">Current</th>
                  <th className="px-4 py-3">Last transaction</th>
                </tr>
              </thead>
              <tbody>
                {report.data?.map((row) => (
                  <tr key={row.product_id} className="border-t border-line hover:bg-slate-50/40 transition">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedProductCard(row.product_id)}
                        className="font-semibold text-brand hover:text-teal-800 hover:underline text-left"
                      >
                        {row.product_name}
                      </button>
                    </td>
                    <td className="px-4 py-3">{decimal(row.stock_in_total)}</td>
                    <td className="px-4 py-3">{decimal(row.stock_out_total)}</td>
                    <td className="px-4 py-3 font-semibold">{decimal(row.current_stock)}</td>
                    <td className="px-4 py-3 text-muted">{dateTime(row.last_transaction_date)}</td>
                  </tr>
                ))}
                {report.data?.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted">
                      Tidak ada data laporan stok yang cocok dengan kriteria filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Transactions List */}
        <div className="rounded-md border border-line bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-bold text-lg">Stock Transactions</h2>
          {transactions.data?.data.length === 0 && <EmptyState title="Belum ada transaksi stok" />}
          <div className="grid gap-3">
            {transactions.data?.data.map((tx) => (
              <div key={tx.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line p-3 text-sm hover:bg-slate-50/50 transition">
                <div>
                  <p className="font-semibold">{productMap.get(tx.product_id)?.product_name ?? `Product #${tx.product_id}`}</p>
                  <p className="text-muted">{dateTime(tx.transaction_date)} - {tx.notes || 'Tanpa catatan'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={tx.transaction_type === 'in' ? 'green' : tx.transaction_type === 'out' ? 'red' : 'amber'}>
                    {tx.transaction_type}
                  </Badge>
                  <strong>{decimal(tx.quantity)}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar Form */}
      <aside className="rounded-md border border-line bg-white p-4 shadow-sm xl:sticky xl:top-20 h-fit">
        <h2 className="mb-4 text-lg font-bold">Tambah Stock Transaction</h2>
        <form onSubmit={submit} className="grid gap-3">
          <Field label="Product">
            <Select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} required>
              <option value="">Pilih produk</option>
              {products.data?.data.map((product) => (
                <option key={product.id} value={product.id}>{product.product_name}</option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select value={form.transaction_type} onChange={(e) => setForm({ ...form, transaction_type: e.target.value, reference_type: e.target.value === 'adjustment' ? 'adjustment' : form.reference_type })}>
                <option value="in">In</option>
                <option value="out">Out</option>
                <option value="adjustment">Adjustment</option>
              </Select>
            </Field>
            <Field label="Reference">
              <Select value={form.reference_type} onChange={(e) => setForm({ ...form, reference_type: e.target.value })}>
                <option value="purchase">Purchase</option>
                <option value="sale">Sale</option>
                <option value="adjustment">Adjustment</option>
              </Select>
            </Field>
          </div>
          <Field label="Quantity">
            <Input type="number" step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
          </Field>
          <Field label="Notes">
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <Button disabled={mutation.isPending} className="w-full">
            <Plus className="h-4 w-4" />Save Transaction
          </Button>
        </form>
      </aside>

      {/* Stock Card Modal */}
      {selectedProductCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-all duration-300">
          <div className="relative flex flex-col w-full max-w-4xl rounded-lg border border-line bg-white p-6 shadow-2xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-line pb-4">
              <div>
                <h3 className="text-xl font-bold text-ink">
                  Kartu Stok: {cardQuery.data?.product?.product_name ?? 'Loading...'}
                </h3>
                <p className="text-sm text-muted mt-0.5">
                  SKU: {cardQuery.data?.product?.sku ?? '-'} | Unit: {cardQuery.data?.product?.unit_of_measure ?? '-'}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedProductCard(null);
                  setCardFromDate('');
                  setCardToDate('');
                  setCardTransactionType('');
                  setCardReferenceType('');
                }}
                className="rounded-full p-1.5 text-muted hover:bg-slate-100 hover:text-ink transition"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto mt-4 pr-1">
              {/* Product Info Summary cards */}
              {cardQuery.data?.product && (
                <div className="mb-5 grid gap-4 grid-cols-2 sm:grid-cols-4">
                  <div className="rounded-md border border-line bg-slate-50 p-3 text-center">
                    <span className="text-xs text-muted block uppercase font-semibold">Stok Saat Ini</span>
                    <span className="text-lg font-bold block text-brand mt-0.5">
                      {decimal(cardQuery.data.product.current_stock)}
                    </span>
                  </div>
                  <div className="rounded-md border border-line bg-slate-50 p-3 text-center">
                    <span className="text-xs text-muted block uppercase font-semibold">Min. Stok</span>
                    <span className="text-lg font-bold block text-ink mt-0.5">
                      {decimal(cardQuery.data.product.minimum_stock)}
                    </span>
                  </div>
                  <div className="rounded-md border border-line bg-slate-50 p-3 text-center">
                    <span className="text-xs text-muted block uppercase font-semibold">Harga Beli</span>
                    <span className="text-lg font-bold block text-ink mt-0.5">
                      {currency(cardQuery.data.product.cost_price)}
                    </span>
                  </div>
                  <div className="rounded-md border border-line bg-slate-50 p-3 text-center">
                    <span className="text-xs text-muted block uppercase font-semibold">Status Stok</span>
                    <div className="mt-1">
                      {toNumber(cardQuery.data.product.current_stock) <= toNumber(cardQuery.data.product.minimum_stock) ? (
                        <Badge tone="red">Low Stock</Badge>
                      ) : (
                        <Badge tone="green">Aman</Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Filters for Stock Card */}
              <div className="mb-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4 rounded-md border border-line bg-slate-50/50 p-3">
                <Field label="Dari Tanggal">
                  <Input
                    type="date"
                    value={cardFromDate}
                    onChange={(e) => setCardFromDate(e.target.value)}
                    className="min-h-9"
                  />
                </Field>
                <Field label="Sampai Tanggal">
                  <Input
                    type="date"
                    value={cardToDate}
                    onChange={(e) => setCardToDate(e.target.value)}
                    className="min-h-9"
                  />
                </Field>
                <Field label="Tipe Transaksi">
                  <Select
                    value={cardTransactionType}
                    onChange={(e) => setCardTransactionType(e.target.value)}
                    className="min-h-9"
                  >
                    <option value="">Semua Tipe</option>
                    <option value="in">Masuk (In)</option>
                    <option value="out">Keluar (Out)</option>
                    <option value="adjustment">Penyesuaian (Adjustment)</option>
                  </Select>
                </Field>
                <Field label="Referensi">
                  <Select
                    value={cardReferenceType}
                    onChange={(e) => setCardReferenceType(e.target.value)}
                    className="min-h-9"
                  >
                    <option value="">Semua Referensi</option>
                    <option value="purchase">Pembelian (Purchase)</option>
                    <option value="sale">Penjualan (Sale)</option>
                    <option value="adjustment">Penyesuaian (Adjustment)</option>
                  </Select>
                </Field>
              </div>

              {cardQuery.isLoading && (
                <div className="py-12 flex flex-col justify-center items-center">
                  <Loader2 className="h-8 w-8 animate-spin text-brand" />
                  <span className="mt-2 text-sm text-muted">Memuat kartu stok...</span>
                </div>
              )}

              {cardQuery.error && (
                <ErrorState message={getApiError(cardQuery.error)} />
              )}

              {!cardQuery.isLoading && !cardQuery.error && cardQuery.data && (
                <div className="border border-line rounded-md bg-white overflow-hidden">
                  <div className="overflow-x-auto max-h-[350px]">
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-slate-50 border-b border-line text-xs uppercase text-muted font-semibold z-10">
                        <tr>
                          <th className="px-4 py-2.5">Tanggal</th>
                          <th className="px-4 py-2.5">Tipe</th>
                          <th className="px-4 py-2.5">Referensi</th>
                          <th className="px-4 py-2.5 text-right">Qty</th>
                          <th className="px-4 py-2.5 text-right">Saldo Berjalan</th>
                          <th className="px-4 py-2.5">Catatan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cardQuery.data.transactions.map((tx) => (
                          <tr key={tx.id} className="border-t border-line hover:bg-slate-50/50 transition">
                            <td className="px-4 py-3 text-xs whitespace-nowrap">
                              {dateTime(tx.transaction_date)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <Badge tone={tx.transaction_type === 'in' ? 'green' : tx.transaction_type === 'out' ? 'red' : 'amber'}>
                                {tx.transaction_type}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700 capitalize">
                              {tx.reference_type} {tx.reference_id ? `#${tx.reference_id}` : ''}
                            </td>
                            <td className="px-4 py-3 text-right font-bold whitespace-nowrap">
                              {tx.transaction_type === 'out' ? '-' : '+'}{decimal(tx.quantity)}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-slate-800 whitespace-nowrap">
                              {decimal(tx.running_balance)}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted max-w-[200px] truncate" title={tx.notes || ''}>
                              {tx.notes || '-'}
                            </td>
                          </tr>
                        ))}
                        {cardQuery.data.transactions.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-muted">
                              Tidak ada riwayat transaksi untuk filter ini.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
