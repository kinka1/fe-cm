import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Minus, Plus, Search, Trash2 } from 'lucide-react';
import { catalogApi, posApi, storesApi } from '../api/endpoints';
import { getApiError } from '../api/client';
import { Button, Field, Input, Select, Textarea } from '../components/ui';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { currency, toNumber } from '../lib/format';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import type { Product } from '../types/api';

interface CartItem { product: Product; quantity: number; notes: string }

export function PosPage() {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<'dine_in_cashier' | 'takeaway'>('dine_in_cashier');
  const [customerName, setCustomerName] = useState('');
  const [tableId, setTableId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris'>('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [discount, setDiscount] = useState('0');
  const [storeId, setStoreId] = useState('');
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const stores = useQuery({ queryKey: ['stores'], queryFn: () => storesApi.list() });

  // Default store dari user (current_store_id / employee.store_id) begitu daftar toko tersedia.
  const defaultStoreId = user?.current_store_id ?? user?.employee?.store_id ?? null;
  const effectiveStoreId = storeId || (defaultStoreId ? String(defaultStoreId) : '');

  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories });
  const menu = useQuery({ queryKey: ['pos-menu', search, categoryId, effectiveStoreId], queryFn: () => posApi.menu({ search: search || undefined, category_id: categoryId || undefined, store_id: effectiveStoreId || undefined, per_page: 100 }) });

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + toNumber(item.product.selling_price) * item.quantity, 0), [cart]);
  const total = Math.max(0, subtotal - toNumber(discount));
  const change = paymentMethod === 'cash' ? Math.max(0, toNumber(amountPaid) - total) : 0;

  const mutation = useMutation({
    mutationFn: posApi.createCashierOrder,
    onSuccess: (order) => {
      toast.success(`Order ${order.order_number} dibuat`);
      setCart([]); setCustomerName(''); setTableId(''); setAmountPaid(''); setDiscount('0');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock-report'] });
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  const addItem = (product: Product) => {
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) return current.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...current, { product, quantity: 1, notes: '' }];
    });
  };

  const updateQty = (productId: number, delta: number) => setCart((current) => current.map((item) => item.product.id === productId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item));
  const updateNotes = (productId: number, notes: string) => setCart((current) => current.map((item) => item.product.id === productId ? { ...item, notes } : item));
  const removeItem = (productId: number) => setCart((current) => current.filter((item) => item.product.id !== productId));

  const submit = () => {
    if (!user?.employee_id) { toast.error('employee_id tidak tersedia dari user login. Backend mewajibkan employee_id untuk order kasir.'); return; }
    if (!effectiveStoreId) { toast.error('Pilih toko/cabang terlebih dahulu. Backend mewajibkan store_id untuk order kasir.'); return; }
    mutation.mutate({
      order_type: orderType,
      store_id: Number(effectiveStoreId),
      table_id: orderType === 'dine_in_cashier' && tableId ? Number(tableId) : null,
      employee_id: user.employee_id,
      customer_name: customerName || null,
      payment_method: paymentMethod,
      amount_paid: paymentMethod === 'cash' ? toNumber(amountPaid) : null,
      discount: toNumber(discount),
      items: cart.map((item) => ({ product_id: item.product.id, quantity: item.quantity, notes: item.notes || null })),
    });
  };

  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="min-w-0 grid gap-4">
        <div><h1 className="text-2xl font-bold">POS Kasir</h1><p className="text-sm text-muted">Pilih menu, kelola cart, lalu submit order kasir.</p></div>
        <div className="grid gap-3 rounded-md border border-line bg-white p-4 md:grid-cols-[1fr_200px_200px]">
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-muted" /><Input className="pl-10" placeholder="Cari produk atau SKU" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <Select value={effectiveStoreId} onChange={(e) => setStoreId(e.target.value)}>{(stores.data?.length ?? 0) === 0 && <option value="">Semua toko</option>}{stores.data?.map((store) => <option key={store.id} value={store.id}>{store.store_name}</option>)}</Select>
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}><option value="">Semua kategori</option>{categories.data?.map((category) => <option key={category.id} value={category.id}>{category.category_name}</option>)}</Select>
        </div>
        {menu.isLoading && <LoadingState label="Memuat menu..." />}
        {menu.error && <ErrorState message={getApiError(menu.error)} />}
        {!menu.isLoading && (menu.data?.data.length ?? 0) === 0 && <EmptyState title="Menu tidak ditemukan" description="Ubah kata kunci atau kategori." />}
        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {menu.data?.data.map((product) => <button key={product.id} onClick={() => addItem(product)} className="rounded-md border border-line bg-white p-4 text-left shadow-sm transition hover:border-brand hover:shadow-soft"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-bold">{product.product_name}</p><p className="text-xs text-muted">{product.sku}</p></div><span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold">Stock {product.current_stock}</span></div><p className="mt-4 text-lg font-bold text-brand">{currency(product.selling_price)}</p><p className="mt-1 line-clamp-2 text-sm text-muted">{product.description || 'Tidak ada deskripsi'}</p></button>)}
        </div>
      </div>
      <aside className="grid content-start gap-4 rounded-md border border-line bg-white p-4 shadow-sm xl:sticky xl:top-20">
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Cart</h2><span className="text-sm text-muted">{cart.length} item</span></div>
        {cart.length === 0 ? <EmptyState title="Cart kosong" description="Tambahkan produk dari menu." /> : <div className="grid max-h-[360px] gap-3 overflow-auto pr-1">{cart.map((item) => <div key={item.product.id} className="rounded-md border border-line p-3"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{item.product.product_name}</p><p className="text-sm text-muted">{currency(item.product.selling_price)}</p></div><button onClick={() => removeItem(item.product.id)} className="rounded p-1 text-red-600 hover:bg-red-50" aria-label="Remove"><Trash2 className="h-4 w-4" /></button></div><div className="mt-3 flex items-center gap-2"><Button variant="secondary" className="h-9 w-9 px-0" onClick={() => updateQty(item.product.id, -1)}><Minus className="h-4 w-4" /></Button><span className="w-10 text-center font-bold">{item.quantity}</span><Button variant="secondary" className="h-9 w-9 px-0" onClick={() => updateQty(item.product.id, 1)}><Plus className="h-4 w-4" /></Button><span className="ml-auto font-bold">{currency(toNumber(item.product.selling_price) * item.quantity)}</span></div><Textarea className="mt-3 min-h-16" placeholder="Catatan item" value={item.notes} onChange={(e) => updateNotes(item.product.id, e.target.value)} /></div>)}</div>}
        <div className="grid gap-3 border-t border-line pt-4">
          <div className="grid grid-cols-2 gap-3"><Field label="Order type"><Select value={orderType} onChange={(e) => setOrderType(e.target.value as 'dine_in_cashier' | 'takeaway')}><option value="dine_in_cashier">Dine in cashier</option><option value="takeaway">Takeaway</option></Select></Field><Field label="Payment"><Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'qris')}><option value="cash">Cash</option><option value="qris">QRIS</option></Select></Field></div>
          <Field label="Customer name"><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></Field>
          {orderType === 'dine_in_cashier' && <Field label="Table ID"><Input type="number" min="1" value={tableId} onChange={(e) => setTableId(e.target.value)} /></Field>}
          <Field label="Discount"><Input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} /></Field>
          {paymentMethod === 'cash' && <Field label="Amount paid"><Input type="number" min="0" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} /></Field>}
          <div className="grid gap-2 rounded-md bg-slate-50 p-3 text-sm"><div className="flex justify-between"><span>Subtotal</span><strong>{currency(subtotal)}</strong></div><div className="flex justify-between"><span>Discount</span><strong>{currency(discount)}</strong></div><div className="flex justify-between text-lg"><span>Total</span><strong>{currency(total)}</strong></div>{paymentMethod === 'cash' && <div className="flex justify-between"><span>Change</span><strong>{currency(change)}</strong></div>}</div>
          <Button disabled={cart.length === 0 || mutation.isPending} onClick={submit}>{mutation.isPending ? 'Submit...' : 'Submit Order'}</Button>
        </div>
      </aside>
    </section>
  );
}
