import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AlertTriangle, BarChart3, Boxes, Calendar, ChefHat, ClipboardList, ClipboardCheck, FolderTree, Layers, LayoutDashboard, LogOut, Menu, Package, ShoppingCart, SlidersHorizontal, Truck, Users } from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';
import { type AppRole, useAuth } from '../lib/auth';
import { Button } from '../components/ui';

const navItems: Array<{ to: string; label: string; icon: typeof LayoutDashboard; roles: AppRole[] }> = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin'] },
  { to: '/pos', label: 'POS Kasir', icon: ShoppingCart, roles: ['admin', 'kasir'] },
  { to: '/orders', label: 'Orders', icon: ClipboardList, roles: ['admin', 'kasir'] },
  { to: '/products', label: 'Products', icon: Package, roles: ['admin'] },
  { to: '/categories', label: 'Categories', icon: FolderTree, roles: ['admin'] },
  { to: '/stock', label: 'Stock', icon: Boxes, roles: ['admin'] },
  { to: '/employees', label: 'Employees', icon: Users, roles: ['admin'] },
  { to: '/suppliers', label: 'Suppliers', icon: Truck, roles: ['admin'] },
  { to: '/purchase-orders', label: 'Purchase Orders', icon: ClipboardCheck, roles: ['admin'] },
  { to: '/stock-adjustments', label: 'Stock Adjustments', icon: SlidersHorizontal, roles: ['admin'] },
  { to: '/stock-opnames', label: 'Stock Opname', icon: ClipboardCheck, roles: ['admin'] },
  { to: '/product-batches', label: 'Product Batches', icon: Layers, roles: ['admin'] },
  { to: '/recipes', label: 'Recipes', icon: ChefHat, roles: ['admin'] },
  { to: '/stock-alerts', label: 'Stock Alerts', icon: AlertTriangle, roles: ['admin'] },
  { to: '/attendance', label: 'Attendance', icon: Calendar, roles: ['admin', 'kasir'] },
];

const roleLabel: Record<AppRole, string> = {
  admin: 'Admin',
  kasir: 'Kasir',
  user: 'User',
};

const AUTH_GUARD_DISABLED = true;

export function AppLayout() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const activeRole: AppRole = AUTH_GUARD_DISABLED && !user ? 'admin' : role;
  const visibleNavItems = AUTH_GUARD_DISABLED ? navItems : navItems.filter((item) => item.roles.includes(role));

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="admin-shell min-h-screen bg-surface text-ink lg:grid lg:grid-cols-[260px_1fr]">
      <aside className={clsx('fixed inset-y-0 left-0 z-40 w-64 border-r border-teal-800/70 bg-[#12323a] text-white shadow-2xl transition lg:static lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#f59e0b] text-[#17212b]"><BarChart3 className="h-5 w-5" /></div>
          <div>
            <p className="font-bold leading-tight">POS Management</p>
            <p className="text-xs text-teal-100/80">{roleLabel[activeRole]} workspace</p>
          </div>
        </div>
        <nav className="grid gap-1 p-3">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)} className={({ isActive }) => clsx('flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold', isActive ? 'bg-[#f59e0b] text-[#17212b] shadow-lg shadow-amber-950/20' : 'text-teal-50/80 hover:bg-white/10 hover:text-white')}>
                <Icon className="h-4 w-4" />{item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>
      {open && <button className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu" />}
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-teal-100 bg-[#fffaf0]/95 px-4 shadow-sm backdrop-blur lg:px-6">
          <button className="rounded-md p-2 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{user?.name ?? 'Operator'} <span className="ml-2 rounded-full bg-teal-100 px-2 py-0.5 text-xs text-teal-800">{roleLabel[activeRole]}</span></p>
            <p className="truncate text-xs text-muted">Employee ID: {user?.employee_id ?? 'belum tersedia'}</p>
          </div>
          <Button variant="secondary" onClick={handleLogout}><LogOut className="h-4 w-4" />Logout</Button>
        </header>
        <main className="mx-auto w-full max-w-[1500px] p-4 lg:p-6"><Outlet /></main>
      </div>
    </div>
  );
}