import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  AlertTriangle, BarChart3, Boxes, Building2, Calendar, ChefHat, ClipboardCheck, ClipboardList,
  FolderTree, Grid3x3, Layers, LayoutDashboard, LogOut, Menu, Package, ShieldCheck, ShoppingCart,
  SlidersHorizontal, Truck, UserPlus, Users, Wallet, X,
} from 'lucide-react';
import clsx from 'clsx';
import { type AppRole, useAuth } from '../lib/auth';
import { Button, Select } from '../components/ui';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: AppRole[];
}

/**
 * Menu dikelompokkan agar sidebar tetap terbaca saat jumlah halaman bertambah.
 * `roles` di sini hanya menyembunyikan menu; pembatasan akses sebenarnya ada di
 * router (RoleRoute) — dan backend sendiri belum memvalidasi role sama sekali.
 */
const NAV_GROUPS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'Operasional',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin'] },
      { to: '/pos', label: 'POS Kasir', icon: ShoppingCart, roles: ['admin', 'kasir'] },
      { to: '/cashier-session', label: 'Sesi Kasir', icon: Wallet, roles: ['admin', 'kasir'] },
      { to: '/orders', label: 'Orders', icon: ClipboardList, roles: ['admin', 'kasir'] },
      { to: '/tables', label: 'Meja & QR', icon: Grid3x3, roles: ['admin'] },
    ],
  },
  {
    title: 'Katalog',
    items: [
      { to: '/products', label: 'Produk', icon: Package, roles: ['admin'] },
      { to: '/categories', label: 'Kategori', icon: FolderTree, roles: ['admin'] },
      { to: '/recipes', label: 'Resep', icon: ChefHat, roles: ['admin'] },
    ],
  },
  {
    title: 'Inventori',
    items: [
      { to: '/stock', label: 'Stok', icon: Boxes, roles: ['admin'] },
      { to: '/stock-alerts', label: 'Stock Alerts', icon: AlertTriangle, roles: ['admin'] },
      { to: '/suppliers', label: 'Supplier', icon: Truck, roles: ['admin'] },
      { to: '/purchase-orders', label: 'Purchase Order', icon: ClipboardCheck, roles: ['admin'] },
      { to: '/stock-opnames', label: 'Stock Opname', icon: ClipboardCheck, roles: ['admin'] },
      { to: '/stock-adjustments', label: 'Penyesuaian Stok', icon: SlidersHorizontal, roles: ['admin'] },
      { to: '/product-batches', label: 'Batch Produk', icon: Layers, roles: ['admin'] },
    ],
  },
  {
    title: 'Organisasi',
    items: [
      { to: '/stores', label: 'Toko', icon: Building2, roles: ['admin'] },
      { to: '/employees', label: 'Karyawan', icon: Users, roles: ['admin'] },
      { to: '/users/register', label: 'Buat Akun Login', icon: UserPlus, roles: ['admin'] },
      { to: '/roles', label: 'Role', icon: ShieldCheck, roles: ['admin'] },
      { to: '/attendance', label: 'Absensi', icon: Calendar, roles: ['admin', 'kasir'] },
    ],
  },
  {
    title: 'Laporan',
    items: [{ to: '/revenue', label: 'Pendapatan', icon: BarChart3, roles: ['admin'] }],
  },
];

const ROLE_LABEL: Record<AppRole, string> = {
  admin: 'Admin',
  supervisor: 'Supervisor',
  kasir: 'Kasir',
  user: 'User',
};

export function AppLayout() {
  const { user, role, logout, stores, storeId, setCurrentStore, switchingStore } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // Supervisor memakai menu yang sama dengan admin.
  const effectiveRole: AppRole = role === 'supervisor' ? 'admin' : role;
  const groups = NAV_GROUPS
    .map((group) => ({ ...group, items: group.items.filter((item) => item.roles.includes(effectiveRole)) }))
    .filter((group) => group.items.length > 0);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const storePicker = stores.length > 0 && (
    <Select
      size="sm"
      aria-label="Toko aktif"
      value={storeId ? String(storeId) : ''}
      disabled={switchingStore}
      onChange={(event) => {
        const next = Number(event.target.value);
        if (next && next !== storeId) void setCurrentStore(next);
      }}
    >
      {!storeId && <option value="">Pilih toko</option>}
      {stores.map((store) => (
        <option key={store.id} value={store.id}>{store.store_name}</option>
      ))}
    </Select>
  );

  return (
    /* Shell dikunci setinggi viewport supaya sidebar dan konten punya scroll sendiri-sendiri. */
    <div className="admin-shell h-dvh overflow-hidden text-ink lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex h-dvh w-72 max-w-[85vw] flex-col border-r border-white/10 bg-sidebar text-white shadow-2xl transition-transform duration-200',
          'lg:static lg:w-auto lg:max-w-none lg:translate-x-0',
          menuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-ink">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold leading-tight">POS Management</p>
            <p className="truncate text-xs text-white/70">{ROLE_LABEL[role]} workspace</p>
          </div>
          <button
            className="ml-auto rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
            onClick={() => setMenuOpen(false)}
            aria-label="Tutup menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Pemilih toko ikut di sidebar karena header tidak muat di layar ponsel. */}
        {storePicker && (
          <div className="border-b border-white/10 px-3 py-3 sm:hidden">
            <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-white/50">Toko aktif</p>
            {storePicker}
          </div>
        )}

        <nav className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
          {groups.map((group) => (
            <div key={group.title} className="mb-4 last:mb-0">
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/40">{group.title}</p>
              <div className="grid gap-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    // Drawer ditutup saat menu dipilih supaya konten langsung terlihat di ponsel.
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition',
                        isActive ? 'bg-accent text-accent-ink shadow-lg shadow-amber-950/20' : 'text-white/75 hover:bg-white/10 hover:text-white',
                      )
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {menuOpen && <button className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Tutup menu" />}

      <div className="flex h-full min-w-0 flex-col overflow-hidden">
        {/* Header berada di luar area scroll, jadi selalu terlihat tanpa perlu sticky. */}
        <header className="z-20 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-card/95 px-3 shadow-sm backdrop-blur sm:px-4 lg:px-6">
          <button className="rounded-md p-2 hover:bg-subtle lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Buka menu">
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 truncate text-sm font-semibold text-ink">
              <span className="truncate">{user?.name ?? 'Operator'}</span>
              <span className="hidden shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand-dark xs:inline">{ROLE_LABEL[role]}</span>
            </p>
            <p className="truncate text-xs text-muted">Employee ID: {user?.employee_id ?? 'belum tersedia'}</p>
          </div>

          {storePicker && <div className="hidden w-44 sm:block lg:w-52">{storePicker}</div>}

          <Button variant="secondary" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto w-full max-w-[1500px] p-3 sm:p-4 lg:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
