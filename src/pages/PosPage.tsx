import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Minus, Plus, Search, ShoppingBag, Trash2, X } from 'lucide-react';
import { cartApi, cashierSessionsApi, catalogApi, posApi, tablesApi } from '../api/endpoints';
import { getApiError } from '../api/client';
import { Badge, Button, Card, Field, IconButton, Input, PageHeader, Select, Textarea } from '../components/ui';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { currency, toNumber } from '../lib/format';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import type { OrderType, PaymentMethod, PosCart, Product } from '../types/api';

export function PosPage() {
  const { user, storeId, stores } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [activeCartId, setActiveCartId] = useState<number | null>(null);
  const [orderType, setOrderType] = useState<OrderType>('dine_in_cashier');
  const [customerName, setCustomerName] = useState('');
  const [tableId, setTableId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [discount, setDiscount] = useState('0');

  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories });
  const paymentMethods = useQuery({ queryKey: ['pos', 'payment-methods'], queryFn: posApi.paymentMethods });

  const menu = useQuery({
    queryKey: ['pos-menu', search, categoryId, storeId],
    queryFn: () => posApi.menu({ search: search || undefined, category_id: categoryId || undefined, store_id: storeId ?? undefined, per_page: 100 }),
    enabled: Boolean(storeId),
  });

  const tables = useQuery({
    queryKey: ['tables', storeId],
    queryFn: () => tablesApi.list({ store_id: storeId ?? undefined, per_page: 100 }),
    enabled: Boolean(storeId) && orderType === 'dine_in_cashier',
  });

  // Backend menolak order kasir bila operator belum membuka sesi kasir di toko ini.
  const session = useQuery({
    queryKey: ['cashier-session', 'current', storeId],
    queryFn: () => cashierSessionsApi.current({ store_id: storeId ?? undefined }),
    enabled: Boolean(storeId),
  });

  const cartsKey = ['pos-carts', storeId];
  const carts = useQuery({
    queryKey: cartsKey,
    queryFn: () => cartApi.list(storeId as number, 'active'),
    enabled: Boolean(storeId),
  });

  const cartList = useMemo(() => carts.data ?? [], [carts.data]);

  // Pilihan user hanya preferensi: bila cart-nya hilang (dihapus atau sudah checkout)
  // otomatis jatuh ke cart pertama, tanpa efek sinkronisasi.
  const activeCart = cartList.find((cart) => cart.id === activeCartId) ?? cartList[0] ?? null;

  const refreshCarts = (cart?: PosCart) => {
    if (cart) setActiveCartId(cart.id);

    return queryClient.invalidateQueries({ queryKey: cartsKey });
  };

  const onError = (error: unknown) => toast.error(getApiError(error));

  const methodOptions = paymentMethods.data ?? [];
  const selectedMethod = methodOptions.find((option) => option.value === paymentMethod);

  const createCart = useMutation({
    mutationFn: (name: string) => cartApi.create({ store_id: storeId as number, name }),
    onSuccess: (cart) => { void refreshCarts(cart); toast.success(`Cart "${cart.name}" dibuat`); },
    onError,
  });

  const deleteCart = useMutation({
    mutationFn: cartApi.remove,
    onSuccess: () => { void refreshCarts(); toast.success('Cart dihapus'); },
    onError,
  });

  const addItem = useMutation({
    mutationFn: ({ cartId, productId }: { cartId: number; productId: number }) => cartApi.addItem(cartId, { product_id: productId, quantity: 1 }),
    onSuccess: () => refreshCarts(),
    onError,
  });

  const updateItem = useMutation({
    mutationFn: ({ cartId, itemId, quantity, notes }: { cartId: number; itemId: number; quantity: number; notes?: string | null }) =>
      cartApi.updateItem(cartId, itemId, { quantity, notes }),
    onSuccess: () => refreshCarts(),
    onError,
  });

  const removeItem = useMutation({
    mutationFn: ({ cartId, itemId }: { cartId: number; itemId: number }) => cartApi.removeItem(cartId, itemId),
    onSuccess: () => refreshCarts(),
    onError,
  });

  const clearCart = useMutation({
    mutationFn: cartApi.clear,
    onSuccess: () => refreshCarts(),
    onError,
  });

  const checkout = useMutation({
    mutationFn: (cartId: number) => cartApi.checkout(cartId, {
      order_type: orderType,
      table_id: orderType === 'dine_in_cashier' && tableId ? Number(tableId) : null,
      customer_name: customerName || null,
      payment_method: paymentMethod,
      amount_paid: selectedMethod?.requires_amount_paid ? toNumber(amountPaid) : null,
      discount: toNumber(discount),
    }),
    onSuccess: (order) => {
      toast.success(`Order ${order.order_number} dibuat`);
      setCustomerName('');
      setTableId('');
      setAmountPaid('');
      setDiscount('0');
      void refreshCarts();
      // Checkout memotong stok dan mengisi sesi kasir, jadi data terkait ikut disegarkan.
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['pos-menu'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock-report'] });
      queryClient.invalidateQueries({ queryKey: ['cashier-session'] });
    },
    onError,
  });

  const subtotal = toNumber(activeCart?.subtotal);
  const total = Math.max(0, subtotal - toNumber(discount));
  const change = selectedMethod?.has_change ? Math.max(0, toNumber(amountPaid) - total) : 0;
  const mutatingItems = addItem.isPending || updateItem.isPending || removeItem.isPending || clearCart.isPending;

  /** Klik produk pertama tanpa cart aktif otomatis membuka cart baru. */
  const addToCart = async (product: Product) => {
    let cartId = activeCart?.id ?? null;

    if (!cartId) {
      const created = await createCart.mutateAsync(`Order ${cartList.length + 1}`);
      cartId = created.id;
    }

    addItem.mutate({ cartId, productId: product.id });
  };

  const submit = () => {
    if (!activeCart || activeCart.items.length === 0) return toast.error('Cart masih kosong');
    if (!user?.employee_id) return toast.error('User belum terhubung ke data karyawan. Backend mewajibkan employee_id untuk order kasir.');
    if (!session.data) return toast.error('Buka sesi kasir dulu sebelum membuat order.');
    if (selectedMethod?.requires_amount_paid && toNumber(amountPaid) < total) return toast.error('Jumlah dibayar kurang dari total.');

    checkout.mutate(activeCart.id);
  };

  if (!storeId) {
    return (
      <EmptyState
        title="Toko aktif belum dipilih"
        description={stores.length > 0
          ? 'Pilih toko lewat selector di header sebelum membuka kasir.'
          : 'Akun ini belum punya akses toko. Hubungi admin untuk menambahkan akses.'}
      />
    );
  }

  return (
    <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="order-2 grid min-w-0 gap-4 xl:order-1">
        <PageHeader title="POS Kasir" description="Cart tersimpan di server, jadi order tertahan tetap ada saat halaman ditutup." />

        {!session.isLoading && !session.data && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <span><strong>Sesi kasir belum dibuka.</strong> Backend menolak order kasir tanpa sesi aktif.</span>
            <Link to="/cashier-session"><Button variant="secondary" size="sm">Buka sesi kasir</Button></Link>
          </div>
        )}

        <Card className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input className="pl-9" placeholder="Cari produk atau SKU" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <Select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} aria-label="Filter kategori">
            <option value="">Semua kategori</option>
            {categories.data?.map((category) => <option key={category.id} value={category.id}>{category.category_name}</option>)}
          </Select>
        </Card>

        {menu.isLoading && <LoadingState label="Memuat menu..." />}
        {menu.error && <ErrorState message={getApiError(menu.error)} />}
        {!menu.isLoading && !menu.error && (menu.data?.data.length ?? 0) === 0 && (
          <EmptyState title="Menu tidak ditemukan" description="Ubah kata kunci atau kategori." />
        )}

        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {menu.data?.data.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => void addToCart(product)}
              disabled={createCart.isPending || addItem.isPending}
              className="rounded-card border border-line bg-card p-4 text-left shadow-card transition hover:border-brand hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:opacity-60"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold">{product.product_name}</p>
                  <p className="truncate text-xs text-muted">{product.sku}</p>
                </div>
                <span className="shrink-0 rounded bg-subtle px-2 py-1 text-xs font-semibold">Stok {product.current_stock}</span>
              </div>
              <p className="mt-4 text-lg font-bold text-brand">{currency(product.selling_price)}</p>
              <p className="mt-1 line-clamp-2 text-sm text-muted">{product.description || 'Tidak ada deskripsi'}</p>
            </button>
          ))}
        </div>
      </div>

      <Card className="order-1 grid content-start gap-4 xl:order-2 xl:sticky xl:top-4">
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold">Cart tersimpan</h2>
            <Button variant="secondary" size="sm" loading={createCart.isPending} onClick={() => createCart.mutate(`Order ${cartList.length + 1}`)}>
              <Plus className="h-4 w-4" />Baru
            </Button>
          </div>

          {carts.isLoading ? (
            <LoadingState label="Memuat cart..." />
          ) : cartList.length === 0 ? (
            <p className="text-sm text-muted">Belum ada cart. Klik produk untuk membuat cart pertama.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {cartList.map((cart) => (
                <li key={cart.id}>
                  <span
                    className={`flex items-center gap-1.5 rounded-full border py-1 pl-3 pr-1.5 text-xs font-semibold transition ${
                      cart.id === activeCart?.id ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line text-muted'
                    }`}
                  >
                    <button type="button" onClick={() => setActiveCartId(cart.id)} className="flex items-center gap-1.5">
                      <ShoppingBag className="h-3.5 w-3.5" />
                      {cart.name || `Cart #${cart.id}`}
                      <span className="rounded-full bg-subtle px-1.5 text-ink">{cart.total_items}</span>
                    </button>
                    <IconButton label={`Hapus ${cart.name ?? 'cart'}`} tone="danger" size="sm" className="h-5 w-5" onClick={() => deleteCart.mutate(cart.id)}>
                      <X className="h-3.5 w-3.5" />
                    </IconButton>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {activeCart && activeCart.items.length === 0 && <EmptyState title="Cart kosong" description="Tambahkan produk dari menu." />}

        {activeCart && activeCart.items.length > 0 && (
          <div className="grid max-h-[340px] gap-3 overflow-y-auto pr-1">
            {activeCart.items.map((item) => (
              <div key={item.id} className="rounded-md border border-line p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{item.product.product_name}</p>
                    <p className="text-sm text-muted">{currency(item.unit_price)}</p>
                  </div>
                  <IconButton label="Hapus item" tone="danger" size="sm" onClick={() => removeItem.mutate({ cartId: activeCart.id, itemId: item.id })}>
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <IconButton
                    label="Kurangi jumlah"
                    disabled={mutatingItems || item.quantity <= 1}
                    className="border border-line"
                    onClick={() => updateItem.mutate({ cartId: activeCart.id, itemId: item.id, quantity: item.quantity - 1, notes: item.notes })}
                  >
                    <Minus className="h-4 w-4" />
                  </IconButton>
                  <span className="w-10 text-center font-bold">{item.quantity}</span>
                  <IconButton
                    label="Tambah jumlah"
                    disabled={mutatingItems}
                    className="border border-line"
                    onClick={() => updateItem.mutate({ cartId: activeCart.id, itemId: item.id, quantity: item.quantity + 1, notes: item.notes })}
                  >
                    <Plus className="h-4 w-4" />
                  </IconButton>
                  <span className="ml-auto font-bold">{currency(item.subtotal)}</span>
                </div>

                <Textarea
                  className="mt-3"
                  rows={2}
                  placeholder="Catatan item"
                  defaultValue={item.notes ?? ''}
                  onBlur={(event) => {
                    if (event.target.value !== (item.notes ?? '')) {
                      updateItem.mutate({ cartId: activeCart.id, itemId: item.id, quantity: item.quantity, notes: event.target.value || null });
                    }
                  }}
                />
              </div>
            ))}
            <Button variant="ghost" size="sm" disabled={mutatingItems} onClick={() => clearCart.mutate(activeCart.id)}>
              Kosongkan cart
            </Button>
          </div>
        )}

        <div className="grid gap-3 border-t border-line pt-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipe order">
              <Select value={orderType} onChange={(event) => setOrderType(event.target.value as OrderType)}>
                <option value="dine_in_cashier">Dine in</option>
                <option value="takeaway">Takeaway</option>
              </Select>
            </Field>
            <Field label="Pembayaran">
              <Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}>
                {methodOptions.length === 0 && <option value="cash">Tunai</option>}
                {methodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
            </Field>
          </div>

          <Field label="Nama customer">
            <Input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder={activeCart?.name ?? ''} />
          </Field>

          {orderType === 'dine_in_cashier' && (
            <Field label="Meja">
              <Select value={tableId} onChange={(event) => setTableId(event.target.value)}>
                <option value="">Tanpa meja</option>
                {tables.data?.map((table) => (
                  <option key={table.id} value={table.id} disabled={table.status === 'occupied'}>
                    Meja {table.table_number} ({table.status})
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <Field label="Diskon">
            <Input type="number" min="0" value={discount} onChange={(event) => setDiscount(event.target.value)} />
          </Field>

          {selectedMethod?.requires_amount_paid && (
            <Field label="Uang diterima">
              <Input type="number" min="0" value={amountPaid} onChange={(event) => setAmountPaid(event.target.value)} />
            </Field>
          )}

          <dl className="grid gap-2 rounded-md bg-subtle p-3 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd className="font-semibold">{currency(subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Diskon</dt><dd className="font-semibold">{currency(discount)}</dd></div>
            <div className="flex justify-between text-lg"><dt>Total</dt><dd className="font-bold">{currency(total)}</dd></div>
            {selectedMethod?.has_change && (
              <div className="flex justify-between"><dt>Kembalian</dt><dd className="font-semibold">{currency(change)}</dd></div>
            )}
          </dl>

          {session.data && <Badge tone="green">Sesi kasir #{session.data.id} aktif</Badge>}

          <Button block loading={checkout.isPending} disabled={!activeCart || activeCart.items.length === 0 || !session.data} onClick={submit}>
            Submit Order
          </Button>
        </div>
      </Card>
    </section>
  );
}
