import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Minus, Plus, Search, ShoppingBag, Sparkles, TicketCheck, Trash2, Utensils } from 'lucide-react';
import clsx from 'clsx';
import { useParams, useSearchParams } from 'react-router-dom';
import { catalogApi, posApi } from '../api/endpoints';
import { getApiError } from '../api/client';
import { Button, Field, Input, Textarea } from '../components/ui';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { currency, decimal, statusLabel, toNumber } from '../lib/format';
import { useToast } from '../lib/toast';
import type { DiningTable, Order, Product } from '../types/api';

interface CartItem {
  product: Product;
  quantity: number;
  notes: string;
}

const quickNotes = ['Level 0', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5', 'Tanpa bawang', 'Extra pangsit', 'Es sedikit'];

export function UserOrderPage() {
  const { qrCode } = useParams();
  const [searchParams] = useSearchParams();
  const urlQrCode = qrCode || searchParams.get('qr') || '';
  const [manualQrCode, setManualQrCode] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const toast = useToast();
  const queryClient = useQueryClient();
  const submitQrCode = urlQrCode || manualQrCode.trim();

  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories });
  const tableMenu = useQuery({
    queryKey: ['user-table-menu', urlQrCode, search, categoryId],
    enabled: Boolean(urlQrCode),
    queryFn: () => posApi.tableMenu(urlQrCode, { search: search || undefined, category_id: categoryId || undefined, per_page: 100 }),
  });
  const publicMenu = useQuery({
    queryKey: ['user-menu', search, categoryId],
    enabled: !urlQrCode,
    queryFn: () => posApi.menu({ search: search || undefined, category_id: categoryId || undefined, per_page: 100 }),
  });

  const menuRows = urlQrCode ? tableMenu.data?.menu.data ?? [] : publicMenu.data?.data ?? [];
  const table: DiningTable | undefined = tableMenu.data?.table;
  const isLoading = urlQrCode ? tableMenu.isLoading : publicMenu.isLoading;
  const error = urlQrCode ? tableMenu.error : publicMenu.error;
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + toNumber(item.product.selling_price) * item.quantity, 0), [cart]);
  const totalItems = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const mutation = useMutation({
    mutationFn: posApi.createQrOrder,
    onSuccess: (order) => {
      setCreatedOrder(order);
      setCart([]);
      toast.success(`Order ${order.order_number} dikirim`);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['stock-report'] });
    },
    onError: (mutationError) => toast.error(getApiError(mutationError)),
  });

  const addItem = (product: Product) => {
    setCreatedOrder(null);
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        return current.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...current, { product, quantity: 1, notes: '' }];
    });
  };

  const updateQty = (productId: number, delta: number) => {
    setCart((current) => current.map((item) => item.product.id === productId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item));
  };

  const removeItem = (productId: number) => setCart((current) => current.filter((item) => item.product.id !== productId));
  const updateNotes = (productId: number, notes: string) => setCart((current) => current.map((item) => item.product.id === productId ? { ...item, notes } : item));

  const addQuickNote = (productId: number, note: string) => {
    setCart((current) => current.map((item) => {
      if (item.product.id !== productId) return item;
      const notes = item.notes ? `${item.notes}, ${note}` : note;
      return { ...item, notes };
    }));
  };

  const submitOrder = () => {
    if (!submitQrCode) {
      toast.error('Masukkan kode QR meja dulu');
      return;
    }
    if (cart.length === 0) {
      toast.error('Keranjang masih kosong');
      return;
    }

    mutation.mutate({
      qr_code: submitQrCode,
      customer_name: customerName || null,
      discount: 0,
      items: cart.map((item) => ({ product_id: item.product.id, quantity: item.quantity, notes: item.notes || null })),
    });
  };

  return (
    <main className="user-order-shell min-h-screen text-[#26110c]">
      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 pb-28 pt-5 lg:grid-cols-[1fr_390px] lg:px-6 lg:pb-10">
        <div className="min-w-0 space-y-5">
          <header className="user-order-hero overflow-hidden rounded-[28px] px-5 py-6 text-white shadow-[0_24px_70px_rgba(119,31,18,0.24)] md:px-8">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="max-w-2xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/18 px-3 py-1 text-sm font-semibold backdrop-blur">
                  <Utensils className="h-4 w-4" /> Pemesanan meja
                </div>
                <h1 className="text-3xl font-black leading-tight md:text-5xl">Pesan mie pedas tanpa antre kasir</h1>
                <p className="mt-3 max-w-xl text-sm font-medium text-white/85 md:text-base">Pilih menu, set level, kirim order. Pembayaran user menggunakan QRIS sesuai kontrak backend.</p>
              </div>
              <div className="rounded-2xl border border-white/25 bg-white/15 px-4 py-3 text-right backdrop-blur">
                <p className="text-xs font-semibold uppercase text-white/70">Meja</p>
                <p className="text-2xl font-black">{table?.table_number ?? (urlQrCode ? urlQrCode : 'Manual')}</p>
              </div>
            </div>
          </header>

          <div className="grid gap-3 rounded-2xl border border-[#f2c4ad] bg-white/90 p-3 shadow-sm md:grid-cols-[1fr_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-[#9b5b37]" />
              <Input className="border-[#e5b096] bg-[#fff9f4] pl-10 focus:border-[#d9481f] focus:ring-orange-100" placeholder="Cari mie, dimsum, minuman" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            {!urlQrCode && (
              <Input className="border-[#e5b096] bg-[#fff9f4] focus:border-[#d9481f] focus:ring-orange-100" placeholder="Kode QR meja" value={manualQrCode} onChange={(event) => setManualQrCode(event.target.value)} />
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => setCategoryId('')} className={clsx('shrink-0 rounded-full px-4 py-2 text-sm font-black transition', !categoryId ? 'bg-[#26110c] text-white' : 'bg-white text-[#6a3524] ring-1 ring-[#f0c2a8]')}>Semua</button>
            {categories.data?.map((category) => (
              <button key={category.id} onClick={() => setCategoryId(String(category.id))} className={clsx('shrink-0 rounded-full px-4 py-2 text-sm font-black transition', categoryId === String(category.id) ? 'bg-[#d9481f] text-white' : 'bg-white text-[#6a3524] ring-1 ring-[#f0c2a8]')}>
                {category.category_name}
              </button>
            ))}
          </div>

          {isLoading && <LoadingState label="Memuat menu..." />}
          {error && <ErrorState message={getApiError(error)} />}
          {!isLoading && !error && menuRows.length === 0 && <EmptyState title="Menu belum tersedia" description="Tambahkan produk aktif dari dashboard admin atau ubah filter pencarian." />}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {menuRows.map((product) => {
              const cartItem = cart.find((item) => item.product.id === product.id);
              const stock = toNumber(product.current_stock);
              const disabled = stock <= 0;
              return (
                <article key={product.id} className="group grid min-h-[210px] overflow-hidden rounded-2xl border border-[#f0c2a8] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(119,31,18,0.13)]">
                  <div className="menu-plate flex h-24 items-center justify-between px-4 text-white">
                    <div>
                      <p className="text-xs font-bold uppercase text-white/70">{product.sku}</p>
                      <p className="mt-1 max-w-[170px] truncate text-lg font-black">{product.product_name}</p>
                    </div>
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-2xl font-black backdrop-blur">{product.product_name.slice(0, 1)}</div>
                  </div>
                  <div className="grid gap-3 p-4">
                    <p className="line-clamp-2 min-h-10 text-sm text-[#7b4a35]">{product.description || 'Menu siap dipesan untuk meja kamu.'}</p>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-black text-[#d9481f]">{currency(product.selling_price)}</p>
                        <p className="text-xs font-semibold text-[#9b5b37]">Stock {decimal(product.current_stock)}</p>
                      </div>
                      {cartItem ? (
                        <div className="flex items-center gap-2 rounded-full bg-[#fff0e8] p-1">
                          <button className="rounded-full bg-white p-2 text-[#d9481f] shadow-sm" onClick={() => updateQty(product.id, -1)} aria-label="Kurangi"><Minus className="h-4 w-4" /></button>
                          <span className="w-6 text-center font-black">{cartItem.quantity}</span>
                          <button className="rounded-full bg-[#d9481f] p-2 text-white shadow-sm" onClick={() => updateQty(product.id, 1)} aria-label="Tambah"><Plus className="h-4 w-4" /></button>
                        </div>
                      ) : (
                        <Button className="rounded-full bg-[#d9481f] hover:bg-[#aa2f16]" disabled={disabled} onClick={() => addItem(product)}><Plus className="h-4 w-4" />Tambah</Button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="hidden lg:block">
          <CartPanel
            cart={cart}
            customerName={customerName}
            createdOrder={createdOrder}
            isSubmitting={mutation.isPending}
            subtotal={subtotal}
            totalItems={totalItems}
            tableLabel={(table?.table_number ?? submitQrCode) || 'Belum dipilih'}
            onCustomerNameChange={setCustomerName}
            onQuickNote={addQuickNote}
            onRemove={removeItem}
            onSubmit={submitOrder}
            onUpdateNotes={updateNotes}
            onUpdateQty={updateQty}
          />
        </aside>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#f0c2a8] bg-white/95 p-3 shadow-[0_-18px_40px_rgba(38,17,12,0.12)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black">{totalItems} item di keranjang</p>
            <p className="text-lg font-black text-[#d9481f]">{currency(subtotal)}</p>
          </div>
          <Button className="rounded-full bg-[#d9481f] px-5 hover:bg-[#aa2f16]" disabled={cart.length === 0 || mutation.isPending} onClick={submitOrder}><ShoppingBag className="h-4 w-4" />Pesan</Button>
        </div>
      </div>

      <section className="px-4 pb-28 lg:hidden">
        <CartPanel
          cart={cart}
          customerName={customerName}
          createdOrder={createdOrder}
          isSubmitting={mutation.isPending}
          subtotal={subtotal}
          totalItems={totalItems}
          tableLabel={(table?.table_number ?? submitQrCode) || 'Belum dipilih'}
          onCustomerNameChange={setCustomerName}
          onQuickNote={addQuickNote}
          onRemove={removeItem}
          onSubmit={submitOrder}
          onUpdateNotes={updateNotes}
          onUpdateQty={updateQty}
        />
      </section>
    </main>
  );
}

function CartPanel({ cart, customerName, createdOrder, isSubmitting, subtotal, totalItems, tableLabel, onCustomerNameChange, onQuickNote, onRemove, onSubmit, onUpdateNotes, onUpdateQty }: {
  cart: CartItem[];
  customerName: string;
  createdOrder: Order | null;
  isSubmitting: boolean;
  subtotal: number;
  totalItems: number;
  tableLabel: string;
  onCustomerNameChange: (value: string) => void;
  onQuickNote: (productId: number, note: string) => void;
  onRemove: (productId: number) => void;
  onSubmit: () => void;
  onUpdateNotes: (productId: number, notes: string) => void;
  onUpdateQty: (productId: number, delta: number) => void;
}) {
  return (
    <div className="sticky top-5 space-y-4 rounded-[24px] border border-[#f0c2a8] bg-white p-4 shadow-[0_20px_60px_rgba(119,31,18,0.14)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase text-[#9b5b37]">Keranjang</p>
          <h2 className="text-2xl font-black">Meja {tableLabel}</h2>
        </div>
        <div className="rounded-full bg-[#fff0e8] px-3 py-1 text-sm font-black text-[#d9481f]">{totalItems} item</div>
      </div>

      {createdOrder && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          <div className="flex items-start gap-3">
            <TicketCheck className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-black">Order terkirim</p>
              <p className="text-sm">{createdOrder.order_number} - {statusLabel(createdOrder.order_status)}</p>
              <p className="mt-1 text-sm font-semibold">Bayar QRIS: {currency(createdOrder.total_amount)}</p>
            </div>
          </div>
        </div>
      )}

      <Field label="Nama pemesan">
        <Input className="border-[#e5b096] bg-[#fff9f4] focus:border-[#d9481f] focus:ring-orange-100" placeholder="Nama untuk panggilan order" value={customerName} onChange={(event) => onCustomerNameChange(event.target.value)} />
      </Field>

      {cart.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#f0c2a8] bg-[#fff9f4] p-5 text-center text-sm text-[#7b4a35]">
          <Sparkles className="mx-auto mb-2 h-5 w-5 text-[#d9481f]" />
          Pilih menu favorit dulu.
        </div>
      ) : (
        <div className="max-h-[48vh] space-y-3 overflow-auto pr-1">
          {cart.map((item) => (
            <div key={item.product.id} className="rounded-2xl border border-[#f0c2a8] bg-[#fffdfb] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-black">{item.product.product_name}</p>
                  <p className="text-sm font-semibold text-[#d9481f]">{currency(item.product.selling_price)}</p>
                </div>
                <button onClick={() => onRemove(item.product.id)} className="rounded-full p-2 text-red-600 hover:bg-red-50" aria-label="Hapus item"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button className="rounded-full bg-[#fff0e8] p-2 text-[#d9481f]" onClick={() => onUpdateQty(item.product.id, -1)} aria-label="Kurangi"><Minus className="h-4 w-4" /></button>
                <span className="w-7 text-center font-black">{item.quantity}</span>
                <button className="rounded-full bg-[#d9481f] p-2 text-white" onClick={() => onUpdateQty(item.product.id, 1)} aria-label="Tambah"><Plus className="h-4 w-4" /></button>
                <span className="ml-auto font-black">{currency(toNumber(item.product.selling_price) * item.quantity)}</span>
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {quickNotes.map((note) => <button key={note} onClick={() => onQuickNote(item.product.id, note)} className="shrink-0 rounded-full bg-[#fff0e8] px-3 py-1 text-xs font-black text-[#9b3c1f]">{note}</button>)}
              </div>
              <Textarea className="mt-3 min-h-16 border-[#e5b096] bg-white focus:border-[#d9481f] focus:ring-orange-100" placeholder="Catatan lain" value={item.notes} onChange={(event) => onUpdateNotes(item.product.id, event.target.value)} />
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl bg-[#26110c] p-4 text-white">
        <div className="flex justify-between text-sm text-white/75"><span>Subtotal</span><strong>{currency(subtotal)}</strong></div>
        <div className="mt-2 flex justify-between text-lg font-black"><span>Total QRIS</span><span>{currency(subtotal)}</span></div>
      </div>

      <Button className="w-full rounded-full bg-[#d9481f] py-3 text-base hover:bg-[#aa2f16]" disabled={cart.length === 0 || isSubmitting} onClick={onSubmit}>
        <ShoppingBag className="h-5 w-5" />{isSubmitting ? 'Mengirim order...' : 'Kirim Order' }
      </Button>
    </div>
  );
}
