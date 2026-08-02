import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Minus, Plus, Search, Sparkles, Trash2, X, CreditCard, CheckCircle2, Coffee, MessageSquare, ArrowLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { useParams, useSearchParams } from 'react-router-dom';
import { catalogApi, posApi, storesApi } from '../api/endpoints';
import { getApiError } from '../api/client';
import { Button } from '../components/ui';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { currency, toNumber } from '../lib/format';
import { useToast } from '../lib/toast';
import type { Category, DiningTable, Order, Product } from '../types/api';

interface CartItem {
  product: Product;
  quantity: number;
  notes: string;
}

/** Menebak apakah produk termasuk minuman; dipakai untuk memilih ikon menu. */
const isBeverage = (product: Product, categoriesList?: Category[]) => {
  const cat = categoriesList?.find((c) => c.id === product.category_id);
  if (!cat) {
    const name = product.product_name.toLowerCase();
    return name.includes('kopi') || name.includes('coffee') || name.includes('latte') || name.includes('tea') || name.includes('teh') || name.includes('ice') || name.includes('minum') || name.includes('drink') || name.includes('espresso') || name.includes('matcha') || name.includes('coklat') || name.includes('chocolate');
  }
  const catName = cat.category_name.toLowerCase();
  return catName.includes('minum') || catName.includes('kopi') || catName.includes('coffee') || catName.includes('beverage') || catName.includes('drink') || catName.includes('tea') || catName.includes('teh') || catName.includes('jus') || catName.includes('juice') || catName.includes('boba');
};

export function UserOrderPage() {
  const { qrCode } = useParams();
  const [searchParams] = useSearchParams();
  const urlQrCode = qrCode || searchParams.get('qr') || '';
  const [manualQrCode, setManualQrCode] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<'dine-in' | 'pick-up'>('dine-in');

  // Mobile navigation views
  const [showCart, setShowCart] = useState(false);

  // Checkout & Payment states
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [showQrisModal, setShowQrisModal] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success'>('pending');

  const toast = useToast();
  const queryClient = useQueryClient();
  
  // Resolve active QR Code table representation
  const submitQrCode = urlQrCode || manualQrCode.trim();

  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories });
  const stores = useQuery({ queryKey: ['stores'], queryFn: () => storesApi.list() });
  const tableMenu = useQuery({
    queryKey: ['user-table-menu', urlQrCode, search, categoryId, selectedStoreId],
    enabled: Boolean(urlQrCode),
    queryFn: () => posApi.tableMenu(urlQrCode, { search: search || undefined, category_id: categoryId || undefined, store_id: selectedStoreId || undefined, per_page: 100 }),
  });
  const publicMenu = useQuery({
    queryKey: ['user-menu', search, categoryId, selectedStoreId],
    enabled: !urlQrCode,
    queryFn: () => posApi.menu({ search: search || undefined, category_id: categoryId || undefined, store_id: selectedStoreId || undefined, per_page: 100 }),
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
      setPaymentStatus('pending');
      setShowQrisModal(true);
      setCart([]);
      setShowCart(false);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['stock-report'] });
    },
    onError: (mutationError) => toast.error(getApiError(mutationError)),
  });

  const addItem = (product: Product) => {
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        return current.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      const drink = isBeverage(product, categories.data);
      return [...current, { product, quantity: 1, notes: drink ? 'Dingin/Es, Normal Sugar' : 'Biasa' }];
    });
    toast.success(`${product.product_name} masuk keranjang`);
  };

  const updateQty = (productId: number, delta: number) => {
    setCart((current) => current.map((item) => item.product.id === productId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item));
  };

  const removeItem = (productId: number) => setCart((current) => current.filter((item) => item.product.id !== productId));
  const updateNotes = (productId: number, notes: string) => setCart((current) => current.map((item) => item.product.id === productId ? { ...item, notes } : item));

  // Drink option selector that formats note string cleanly
  const handleDrinkOption = (productId: number, optionName: string, category: 'temp' | 'sugar' | 'ice' | 'milk' | 'shot') => {
    setCart((current) => current.map((item) => {
      if (item.product.id !== productId) return item;

      let currentNotes = item.notes;
      if (currentNotes.includes(optionName)) return item; 

      // Remove contradictory options
      if (category === 'temp') {
        currentNotes = currentNotes.replace(/Panas|Dingin\/Es/g, '').trim();
      } else if (category === 'sugar') {
        currentNotes = currentNotes.replace(/Less Sugar|Normal Sugar|Tanpa Gula/g, '').trim();
      } else if (category === 'ice') {
        currentNotes = currentNotes.replace(/Less Ice|Normal Ice|Tanpa Es/g, '').trim();
      }

      // Clean double commas/whitespaces
      currentNotes = currentNotes.split(',').map(s => s.trim()).filter(Boolean).join(', ');
      const finalNotes = currentNotes ? `${currentNotes}, ${optionName}` : optionName;
      return { ...item, notes: finalNotes };
    }));
  };

  // Food option selector that formats note string cleanly
  const handleFoodOption = (productId: number, optionName: string, category: 'heat' | 'spicy' | 'add') => {
    setCart((current) => current.map((item) => {
      if (item.product.id !== productId) return item;

      let currentNotes = item.notes;
      if (currentNotes.includes(optionName)) return item;

      // Remove contradictory options
      if (category === 'heat') {
        currentNotes = currentNotes.replace(/Hangatkan|Biasa/g, '').trim();
      } else if (category === 'spicy') {
        currentNotes = currentNotes.replace(/Pedas Sedang|Ekstra Pedas/g, '').trim();
      }

      // Clean double commas/whitespaces
      currentNotes = currentNotes.split(',').map(s => s.trim()).filter(Boolean).join(', ');
      const finalNotes = currentNotes ? `${currentNotes}, ${optionName}` : optionName;
      return { ...item, notes: finalNotes };
    }));
  };

  const submitOrder = () => {
    if (!submitQrCode) {
      toast.error('Masukkan kode QR atau nomor meja makan Anda');
      return;
    }
    if (cart.length === 0) {
      toast.error('Keranjang belanja Anda masih kosong');
      return;
    }
    if (!customerName.trim()) {
      toast.error('Masukkan nama pemesan terlebih dahulu');
      return;
    }

    mutation.mutate({
      qr_code: submitQrCode,
      customer_name: customerName.trim(),
      discount: 0,
      items: cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        notes: orderType === 'pick-up'
          ? (item.notes ? `[PICKUP] ${item.notes}` : '[PICKUP]')
          : item.notes || null
      })),
    });
  };

  const handleSimulatePayment = () => {
    setPaymentStatus('success');
    toast.success('Simulasi Pembayaran Berhasil! Pesanan diproses Barista.');
    setTimeout(() => {
      setShowQrisModal(false);
      setCreatedOrder(null);
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center">
      <div className="w-full max-w-md bg-[#FDFBF7] text-[#2E1D19] min-h-screen flex flex-col shadow-2xl relative border-x border-[#FAF0E6] pb-24">
        
        {!showCart ? (
          <>
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#FAF0E6] px-4 py-3.5 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 bg-gradient-to-br from-[#4A2C2A] to-[#C8A27B] rounded-xl flex items-center justify-center text-white shadow">
                  <Coffee className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h1 className="text-sm font-black tracking-tight text-[#4A2C2A] uppercase">Calon Mantoe</h1>
                  <p className="text-[8px] font-bold text-[#C8A27B] uppercase tracking-wider">Premium Experience</p>
                </div>
              </div>

              <div className="flex rounded-full bg-[#FAF5F0] p-0.5 border border-[#EADAC9]">
                <button
                  onClick={() => setOrderType('dine-in')}
                  className={clsx(
                    'rounded-full px-3 py-1 text-[10px] font-bold transition-all duration-300',
                    orderType === 'dine-in' ? 'bg-[#4A2C2A] text-white shadow' : 'text-[#7D645E]'
                  )}
                >
                  Dine-In
                </button>
                <button
                  onClick={() => setOrderType('pick-up')}
                  className={clsx(
                    'rounded-full px-3 py-1 text-[10px] font-bold transition-all duration-300',
                    orderType === 'pick-up' ? 'bg-[#4A2C2A] text-white shadow' : 'text-[#7D645E]'
                  )}
                >
                  Pick-Up
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
              <div className="bg-gradient-to-br from-[#4A2C2A] to-[#361E1C] rounded-2xl p-4 text-white shadow-md relative overflow-hidden flex justify-between items-center gap-4">
                <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none scale-150 transform translate-x-4 translate-y-4">
                  <Coffee className="h-32 w-32 text-white" />
                </div>

                <div className="relative z-10 space-y-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-semibold backdrop-blur-sm text-[#C8A27B]">
                    <Sparkles className="h-2.5 w-2.5" /> Skip the Line
                  </span>
                  <h2 className="text-xl font-black">Seduh Kenangan</h2>
                  <p className="text-[10px] text-white/80 max-w-[200px] leading-relaxed">Kustomisasi kopimu dan pesan instan langsung ke barista.</p>
                </div>

                <div className="relative z-10 rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-center backdrop-blur-md min-w-[75px]">
                  <p className="text-[8px] font-bold uppercase text-[#C8A27B] tracking-wider">Meja</p>
                  <p className="text-xl font-black">{table?.table_number ?? (urlQrCode ? urlQrCode : 'Input')}</p>
                  {!urlQrCode && (
                    <input
                      type="text"
                      value={manualQrCode}
                      onChange={(e) => setManualQrCode(e.target.value)}
                      placeholder="Input Meja"
                      className="w-14 mt-1 bg-white/20 border border-white/25 text-white rounded text-center text-[10px] font-bold py-0.5 placeholder:text-white/40 focus:outline-none"
                    />
                  )}
                </div>
              </div>

               <div className="relative rounded-xl bg-[#FAF5F0] border border-[#EADAC9] px-3 py-2 flex items-center shadow-sm">
                 <Search className="h-4.5 w-4.5 text-[#8A6F6A]" />
                 <input
                   type="text"
                   value={search}
                   onChange={(e) => setSearch(e.target.value)}
                   placeholder="Cari kopi, latte, teh, roti..."
                   className="w-full bg-transparent border-0 pl-2 text-xs text-[#2E1D19] placeholder:text-[#8A6F6A] focus:outline-none focus:ring-0 p-0"
                 />
               </div>

               <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                 <button
                   onClick={() => setSelectedStoreId('')}
                   className={clsx(
                     'shrink-0 rounded-full px-4 py-1.5 text-[10px] font-black transition border',
                     !selectedStoreId 
                       ? 'bg-[#4A2C2A] border-[#4A2C2A] text-white' 
                       : 'bg-white border-[#FAF0E6] text-[#7D645E]'
                   )}
                 >
                   Semua Cabang
                 </button>
                 {stores.data?.map((store) => (
                   <button
                     key={store.id}
                     onClick={() => setSelectedStoreId(String(store.id))}
                     className={clsx(
                       'shrink-0 rounded-full px-4 py-1.5 text-[10px] font-black transition border',
                       selectedStoreId === String(store.id)
                         ? 'bg-[#4A2C2A] border-[#4A2C2A] text-white'
                         : 'bg-white border-[#FAF0E6] text-[#7D645E]'
                     )}
                   >
                     {store.store_name}
                   </button>
                 ))}
               </div>

              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setCategoryId('')}
                  className={clsx(
                    'shrink-0 rounded-full px-4 py-1.5 text-[10px] font-black transition border',
                    !categoryId 
                      ? 'bg-[#4A2C2A] border-[#4A2C2A] text-white' 
                      : 'bg-white border-[#FAF0E6] text-[#7D645E]'
                  )}
                >
                  Semua
                </button>
                {categories.data?.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryId(String(cat.id))}
                    className={clsx(
                      'shrink-0 rounded-full px-4 py-1.5 text-[10px] font-black transition border',
                      categoryId === String(cat.id)
                        ? 'bg-[#4A2C2A] border-[#4A2C2A] text-white'
                        : 'bg-white border-[#FAF0E6] text-[#7D645E]'
                    )}
                  >
                    {cat.category_name}
                  </button>
                ))}
              </div>

              {isLoading && <LoadingState label="Menyeduh kopi terbaik..." />}
              {error && <ErrorState message={getApiError(error)} />}
              {!isLoading && !error && menuRows.length === 0 && (
                <EmptyState title="Menu Belum Tersedia" description="Silakan isi katalog dari admin panel." />
              )}

              {!isLoading && !error && menuRows.length > 0 && (
                <div className="grid gap-3">
                  {menuRows.map((product) => {
                    const cartItem = cart.find((item) => item.product.id === product.id);
                    const stock = toNumber(product.current_stock);
                    const disabled = stock <= 0;

                    return (
                      <div
                        key={product.id}
                        className="bg-white rounded-2xl border border-[#FAF0E6] p-3 flex gap-3 shadow-sm hover:border-[#EADAC9] transition duration-200"
                      >
                        <div className="h-16 w-16 bg-gradient-to-br from-[#4A2C2A] to-[#C8A27B] rounded-xl flex items-center justify-center text-white text-2xl font-black shrink-0 shadow-inner select-none">
                          {product.product_name.charAt(0)}
                        </div>

                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div>
                            <span className="text-[8px] uppercase tracking-wider text-[#C8A27B] font-bold block">{product.sku}</span>
                            <h3 className="text-sm font-black text-[#2E1D19] truncate">{product.product_name}</h3>
                            <p className="text-[10px] text-[#7D645E] line-clamp-1 mt-0.5">
                              {product.description || 'Barista special crafted.'}
                            </p>
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-1.5">
                            <span className="text-xs font-black text-[#4A2C2A]">{currency(product.selling_price)}</span>
                            
                            {cartItem ? (
                              <div className="flex items-center gap-1.5 rounded-full bg-[#FAF5F0] border border-[#EADAC9] p-0.5">
                                <button
                                  onClick={() => updateQty(product.id, -1)}
                                  className="h-6 w-6 rounded-full bg-white flex items-center justify-center text-[#4A2C2A] shadow-sm"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="w-4 text-center font-bold text-xs">{cartItem.quantity}</span>
                                <button
                                  onClick={() => updateQty(product.id, 1)}
                                  className="h-6 w-6 rounded-full bg-[#4A2C2A] flex items-center justify-center text-white"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addItem(product)}
                                disabled={disabled}
                                className="rounded-full bg-[#4A2C2A] text-white hover:bg-[#C8A27B] text-[10px] font-black py-1 px-3 shadow transition active:scale-95 disabled:opacity-50"
                              >
                                + Tambah
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="fixed bottom-0 w-full max-w-md z-30 border-t border-[#FAF0E6] bg-white/95 p-3.5 shadow-[0_-8px_25px_rgba(74,44,42,0.12)] backdrop-blur-md flex items-center justify-between gap-4 animate-in slide-in-from-bottom duration-200">
                <div>
                  <p className="text-[10px] text-[#7D645E] font-semibold">{totalItems} item di keranjang</p>
                  <p className="text-base font-black text-[#4A2C2A] mt-0.5">{currency(subtotal)}</p>
                </div>
                <button
                  onClick={() => setShowCart(true)}
                  className="rounded-full bg-[#4A2C2A] hover:bg-[#3D2321] text-white text-xs font-black py-2.5 px-5 flex items-center justify-center gap-1.5 shadow"
                >
                  Lihat Keranjang <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          
          <>
            <header className="sticky top-0 z-40 bg-white border-b border-[#FAF0E6] px-3 py-3.5 flex items-center gap-3">
              <button
                onClick={() => setShowCart(false)}
                className="p-1 rounded-full text-[#4A2C2A] hover:bg-slate-100 transition"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h2 className="text-base font-black text-[#4A2C2A]">Konfirmasi Pesanan</h2>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              <div className="rounded-2xl border border-[#EADAC9] bg-[#FAF5F0] p-4 flex items-center justify-between">
                <div>
                  <span className="text-[8px] font-bold uppercase text-[#C8A27B] tracking-wider block">Metode Pelayanan</span>
                  <strong className="text-[#4A2C2A] text-sm mt-0.5 block">
                    {orderType === 'dine-in' ? `Antar ke Meja ${table?.table_number ?? submitQrCode}` : `Ambil di Bar (Meja ${table?.table_number ?? submitQrCode})`}
                  </strong>
                </div>
                <div className="rounded-full bg-white border border-[#EADAC9] px-3 py-1 text-[10px] font-black text-[#4A2C2A]">
                  {orderType === 'dine-in' ? 'Dine In' : 'Pick Up'}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#7D645E] block">Nama Pemesan</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nama untuk panggilan barista..."
                  className="w-full rounded-xl border border-[#EADAC9] bg-white py-2.5 px-3 text-xs text-[#2E1D19] placeholder:text-[#8A6F6A]/50 focus:border-[#4A2C2A] focus:ring-1 focus:ring-[#4A2C2A] focus:outline-none transition p-0 pl-3"
                  required
                />
              </div>

              <div className="space-y-3">
                <span className="text-xs font-bold text-[#7D645E] block">Daftar Pesanan</span>
                {cart.map((item) => {
                  const drink = isBeverage(item.product, categories.data);
                  return (
                    <div
                      key={item.product.id}
                      className="rounded-2xl border border-[#FAF0E6] bg-white p-3.5 space-y-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="font-black text-xs text-[#2E1D19] truncate">{item.product.product_name}</h4>
                          <span className="text-[10px] font-semibold text-[#C8A27B]">{currency(item.product.selling_price)}</span>
                        </div>
                        <button
                          onClick={() => removeItem(item.product.id)}
                          className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-full transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="space-y-2 border-t border-[#FAF5F0] pt-2">
                        <span className="text-[9px] font-bold text-[#8A6F6A] block">Kustomisasi</span>
                        
                        {drink ? (
                          <>
                            <div className="flex flex-wrap gap-1">
                              <button
                                type="button"
                                onClick={() => handleDrinkOption(item.product.id, 'Panas', 'temp')}
                                className={clsx(
                                  'text-[9px] font-bold px-2 py-0.5 rounded transition',
                                  item.notes.includes('Panas') ? 'bg-[#4A2C2A] text-white' : 'bg-[#FAF5F0] text-[#7D645E]'
                                )}
                              >
                                Panas
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDrinkOption(item.product.id, 'Dingin/Es', 'temp')}
                                className={clsx(
                                  'text-[9px] font-bold px-2 py-0.5 rounded transition',
                                  item.notes.includes('Dingin/Es') ? 'bg-[#4A2C2A] text-white' : 'bg-[#FAF5F0] text-[#7D645E]'
                                )}
                              >
                                Es
                              </button>

                              <div className="h-3 bg-slate-200 w-px mx-0.5 self-center" />
                              <button
                                type="button"
                                onClick={() => handleDrinkOption(item.product.id, 'Normal Sugar', 'sugar')}
                                className={clsx(
                                  'text-[9px] font-bold px-2 py-0.5 rounded transition',
                                  item.notes.includes('Normal Sugar') ? 'bg-[#4A2C2A] text-white' : 'bg-[#FAF5F0] text-[#7D645E]'
                                )}
                              >
                                Normal Sugar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDrinkOption(item.product.id, 'Less Sugar', 'sugar')}
                                className={clsx(
                                  'text-[9px] font-bold px-2 py-0.5 rounded transition',
                                  item.notes.includes('Less Sugar') ? 'bg-[#4A2C2A] text-white' : 'bg-[#FAF5F0] text-[#7D645E]'
                                )}
                              >
                                Less Sugar
                              </button>
                            </div>

                            <div className="flex flex-wrap gap-1">
                              <button
                                type="button"
                                onClick={() => handleDrinkOption(item.product.id, 'Normal Ice', 'ice')}
                                className={clsx(
                                  'text-[9px] font-bold px-2 py-0.5 rounded transition',
                                  item.notes.includes('Normal Ice') ? 'bg-[#4A2C2A] text-white' : 'bg-[#FAF5F0] text-[#7D645E]'
                                )}
                              >
                                Normal Ice
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDrinkOption(item.product.id, 'Less Ice', 'ice')}
                                className={clsx(
                                  'text-[9px] font-bold px-2 py-0.5 rounded transition',
                                  item.notes.includes('Less Ice') ? 'bg-[#4A2C2A] text-white' : 'bg-[#FAF5F0] text-[#7D645E]'
                                )}
                              >
                                Less Ice
                              </button>

                              <div className="h-3 bg-slate-200 w-px mx-0.5 self-center" />
                              <button
                                type="button"
                                onClick={() => handleDrinkOption(item.product.id, '+1 Shot Espresso', 'shot')}
                                className={clsx(
                                  'text-[9px] font-bold px-2 py-0.5 rounded transition',
                                  item.notes.includes('+1 Shot Espresso') ? 'bg-[#4A2C2A] text-white' : 'bg-[#FAF5F0] text-[#7D645E]'
                                )}
                              >
                                +Shot
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDrinkOption(item.product.id, 'Oat Milk', 'milk')}
                                className={clsx(
                                  'text-[9px] font-bold px-2 py-0.5 rounded transition',
                                  item.notes.includes('Oat Milk') ? 'bg-[#4A2C2A] text-white' : 'bg-[#FAF5F0] text-[#7D645E]'
                                )}
                              >
                                Oat Milk
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex flex-wrap gap-1">
                              <button
                                type="button"
                                onClick={() => handleFoodOption(item.product.id, 'Hangatkan', 'heat')}
                                className={clsx(
                                  'text-[9px] font-bold px-2 py-0.5 rounded transition',
                                  item.notes.includes('Hangatkan') ? 'bg-[#4A2C2A] text-white' : 'bg-[#FAF5F0] text-[#7D645E]'
                                )}
                              >
                                Hangatkan
                              </button>
                              <button
                                type="button"
                                onClick={() => handleFoodOption(item.product.id, 'Biasa', 'heat')}
                                className={clsx(
                                  'text-[9px] font-bold px-2 py-0.5 rounded transition',
                                  item.notes.includes('Biasa') ? 'bg-[#4A2C2A] text-white' : 'bg-[#FAF5F0] text-[#7D645E]'
                                )}
                              >
                                Suhu Biasa
                              </button>

                              <div className="h-3 bg-slate-200 w-px mx-0.5 self-center" />
                              <button
                                type="button"
                                onClick={() => handleFoodOption(item.product.id, 'Pedas Sedang', 'spicy')}
                                className={clsx(
                                  'text-[9px] font-bold px-2 py-0.5 rounded transition',
                                  item.notes.includes('Pedas Sedang') ? 'bg-[#4A2C2A] text-white' : 'bg-[#FAF5F0] text-[#7D645E]'
                                )}
                              >
                                Pedas Sedang
                              </button>
                              <button
                                type="button"
                                onClick={() => handleFoodOption(item.product.id, 'Ekstra Pedas', 'spicy')}
                                className={clsx(
                                  'text-[9px] font-bold px-2 py-0.5 rounded transition',
                                  item.notes.includes('Ekstra Pedas') ? 'bg-[#4A2C2A] text-white' : 'bg-[#FAF5F0] text-[#7D645E]'
                                )}
                              >
                                Ekstra Pedas
                              </button>
                            </div>

                            <div className="flex flex-wrap gap-1">
                              <button
                                type="button"
                                onClick={() => handleFoodOption(item.product.id, 'Extra Sambal', 'add')}
                                className={clsx(
                                  'text-[9px] font-bold px-2 py-0.5 rounded transition',
                                  item.notes.includes('Extra Sambal') ? 'bg-[#4A2C2A] text-white' : 'bg-[#FAF5F0] text-[#7D645E]'
                                )}
                              >
                                + Sambal
                              </button>
                              <button
                                type="button"
                                onClick={() => handleFoodOption(item.product.id, 'Extra Topping', 'add')}
                                className={clsx(
                                  'text-[9px] font-bold px-2 py-0.5 rounded transition',
                                  item.notes.includes('Extra Topping') ? 'bg-[#4A2C2A] text-white' : 'bg-[#FAF5F0] text-[#7D645E]'
                                )}
                              >
                                + Topping
                              </button>
                              <button
                                type="button"
                                onClick={() => handleFoodOption(item.product.id, 'Extra Alat Makan', 'add')}
                                className={clsx(
                                  'text-[9px] font-bold px-2 py-0.5 rounded transition',
                                  item.notes.includes('Extra Alat Makan') ? 'bg-[#4A2C2A] text-white' : 'bg-[#FAF5F0] text-[#7D645E]'
                                )}
                              >
                                + Alat Makan
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 bg-[#FAF6F0] p-2 rounded-xl">
                        <MessageSquare className="h-3.5 w-3.5 text-[#C8A27B] shrink-0" />
                        <input
                          type="text"
                          value={item.notes}
                          onChange={(e) => updateNotes(item.product.id, e.target.value)}
                          placeholder="Catatan khusus koki/barista..."
                          className="w-full bg-transparent border-0 text-[10px] text-[#4A2C2A] placeholder:text-[#8A6F6A]/40 focus:outline-none p-0"
                        />
                      </div>

                      <div className="flex items-center justify-between border-t border-[#FAF5F0] pt-2.5">
                        <div className="flex items-center gap-2 bg-[#FAF5F0] rounded-full p-0.5 border border-[#EADAC9]">
                          <button
                            onClick={() => updateQty(item.product.id, -1)}
                            className="h-5 w-5 rounded-full bg-white flex items-center justify-center text-[#4A2C2A] shadow-sm"
                          >
                            <Minus className="h-2.5 w-2.5" />
                          </button>
                          <span className="w-4 text-center font-bold text-xs">{item.quantity}</span>
                          <button
                            onClick={() => updateQty(item.product.id, 1)}
                            className="h-5 w-5 rounded-full bg-[#4A2C2A] flex items-center justify-center text-white"
                          >
                            <Plus className="h-2.5 w-2.5" />
                          </button>
                        </div>
                        <strong className="text-xs font-black text-[#4A2C2A]">
                          {currency(toNumber(item.product.selling_price) * item.quantity)}
                        </strong>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-2xl bg-white border border-[#FAF0E6] p-4 space-y-2.5 shadow-sm text-xs">
                <div className="flex justify-between text-[#7D645E]">
                  <span>Subtotal</span>
                  <span>{currency(subtotal)}</span>
                </div>
                <div className="flex justify-between font-black text-[#4A2C2A] text-sm border-t border-[#FAF5F0] pt-2.5">
                  <span>Total Bayar (QRIS)</span>
                  <span>{currency(subtotal)}</span>
                </div>
              </div>
            </div>

            <div className="absolute inset-x-0 bottom-0 z-30 border-t border-[#FAF0E6] bg-white p-3.5 shadow-md flex justify-center">
              <Button
                onClick={submitOrder}
                disabled={cart.length === 0 || mutation.isPending}
                className="w-full rounded-full bg-[#4A2C2A] hover:bg-[#3D2321] text-white text-xs font-black py-3.5 flex items-center justify-center gap-1.5 shadow"
              >
                {mutation.isPending ? 'Memproses Order...' : 'Pesan & Bayar Sekarang'}
              </Button>
            </div>
          </>
        )}

        {showQrisModal && createdOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-all duration-300">
            <div className="relative w-full max-w-sm overflow-hidden rounded-[28px] bg-white p-5 shadow-2xl border border-[#FAF0E6] animate-in fade-in zoom-in-95 duration-200">
              
              <button
                onClick={() => setShowQrisModal(false)}
                className="absolute top-4 right-4 rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 transition"
              >
                <X className="h-4 w-4" />
              </button>

              {paymentStatus === 'pending' ? (
                <div className="space-y-4 text-center">
                  <div>
                    <h3 className="text-lg font-black text-[#4A2C2A]">Pembayaran QRIS</h3>
                    <p className="text-[10px] text-[#7D645E]">Scan kode QRIS dibawah ini untuk membayar</p>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-3 border border-[#EADAC9] max-w-[210px] mx-auto">
                    <div className="bg-[#122A4E] text-white py-0.5 px-2 rounded text-[8px] font-black tracking-widest uppercase mb-2 inline-block">
                      QRIS GPN
                    </div>
                    
                    <svg width="150" height="150" viewBox="0 0 100 100" className="mx-auto bg-white p-2 rounded-lg border border-slate-200">
                      <rect width="100" height="100" fill="white" />
                      {/* Finders */}
                      <rect x="2" y="2" width="20" height="20" fill="#1A1A1A" />
                      <rect x="5" y="5" width="14" height="14" fill="white" />
                      <rect x="8" y="8" width="8" height="8" fill="#1A1A1A" />

                      <rect x="78" y="2" width="20" height="20" fill="#1A1A1A" />
                      <rect x="81" y="5" width="14" height="14" fill="white" />
                      <rect x="84" y="8" width="8" height="8" fill="#1A1A1A" />

                      <rect x="2" y="78" width="20" height="20" fill="#1A1A1A" />
                      <rect x="5" y="81" width="14" height="14" fill="white" />
                      <rect x="8" y="84" width="8" height="8" fill="#1A1A1A" />

                      {/* Data mock pattern */}
                      <rect x="30" y="5" width="6" height="6" fill="#1A1A1A" />
                      <rect x="42" y="8" width="4" height="8" fill="#1A1A1A" />
                      <rect x="54" y="3" width="8" height="4" fill="#1A1A1A" />
                      <rect x="66" y="12" width="6" height="6" fill="#1A1A1A" />
                      
                      <rect x="5" y="30" width="8" height="4" fill="#1A1A1A" />
                      <rect x="16" y="38" width="4" height="12" fill="#1A1A1A" />
                      
                      <rect x="30" y="30" width="40" height="40" rx="4" fill="#1A1A1A" />
                      <rect x="35" y="35" width="30" height="30" fill="white" />
                      
                      <rect x="78" y="30" width="6" height="12" fill="#1A1A1A" />
                      <rect x="88" y="48" width="8" height="4" fill="#1A1A1A" />

                      <rect x="30" y="78" width="12" height="6" fill="#1A1A1A" />
                      <rect x="48" y="84" width="6" height="12" fill="#1A1A1A" />
                      <rect x="60" y="78" width="12" height="4" fill="#1A1A1A" />
                      
                      <rect x="78" y="78" width="6" height="6" fill="#1A1A1A" />
                      <rect x="88" y="88" width="10" height="10" fill="#1A1A1A" />

                      <rect x="42" y="42" width="16" height="16" rx="4" fill="#4A2C2A" />
                      <text x="50" y="52" fontSize="9" fontWeight="black" fill="#C8A27B" textAnchor="middle">☕</text>
                    </svg>
                    
                    <p className="text-[9px] font-bold text-[#8A6F6A] mt-1.5 uppercase tracking-wide">NMID: ID20261108229</p>
                  </div>

                  <div className="rounded-2xl bg-[#FAF5F0] p-3 text-left border border-[#FAF0E6] text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[#8A6F6A]">Nomor Order</span>
                      <strong className="text-[#2E1D19]">{createdOrder.order_number}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8A6F6A]">Pelanggan</span>
                      <strong className="text-[#2E1D19]">{createdOrder.customer_name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8A6F6A]">Nomor Meja</span>
                      <strong className="text-[#2E1D19]">
                        {orderType === 'dine-in' ? `Meja ${table?.table_number ?? submitQrCode}` : `Pick Up (Meja ${table?.table_number ?? submitQrCode})`}
                      </strong>
                    </div>
                    <div className="h-px bg-[#EADAC9] my-1.5" />
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-[#4A2C2A]">Total Tagihan</span>
                      <strong className="text-[#4A2C2A] text-sm font-black">{currency(createdOrder.total_amount)}</strong>
                    </div>
                  </div>

                  <Button
                    onClick={handleSimulatePayment}
                    className="w-full rounded-full bg-[#4A2C2A] hover:bg-[#3D2321] text-white py-3 font-bold text-xs shadow flex items-center justify-center gap-1.5"
                  >
                    <CreditCard className="h-4 w-4" /> Simulasikan Bayar Sukses
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4 space-y-4">
                  <div className="mx-auto h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 animate-bounce">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-black text-emerald-800">Pembayaran Berhasil!</h3>
                    <p className="text-xs text-[#7D645E] mt-1.5 leading-relaxed">
                      Terima kasih <strong>{createdOrder.customer_name}</strong>, pesanan dengan nomor order <strong>{createdOrder.order_number}</strong> sedang diproses Barista kami.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-150 inline-block text-[10px] font-semibold text-emerald-800">
                    ⚡ Memulai Pemrosesan Bar Calon Mantoe
                  </div>
                  
                  <Button
                    onClick={() => setShowQrisModal(false)}
                    className="w-full rounded-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 mt-3 text-xs"
                  >
                    Tutup & Kembali
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
