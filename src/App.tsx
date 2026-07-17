import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { PosPage } from './pages/PosPage';
import { OrdersPage } from './pages/OrdersPage';
import { ProductsPage } from './pages/ProductsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { StockPage } from './pages/StockPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { UserOrderPage } from './pages/UserOrderPage';
import { Button } from './components/ui';
import { type AppRole, getRoleHome, useAuth } from './lib/auth';

const AUTH_GUARD_DISABLED = true;

function ProtectedRoute() {
  if (AUTH_GUARD_DISABLED) return <AppLayout />;

  const { isAuthenticated, role } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role === 'user') return <Navigate to="/u" replace />;
  return <AppLayout />;
}

function RoleRoute({ roles, children }: { roles: AppRole[]; children: React.ReactNode }) {
  if (AUTH_GUARD_DISABLED) return children;

  const { role, canAccess } = useAuth();
  if (!canAccess(roles)) return <Navigate to={getRoleHome(role)} replace />;
  return children;
}

function UnauthorizedPage() {
  const { role } = useAuth();
  return (
    <main className="grid min-h-screen place-items-center bg-surface p-4 text-ink">
      <section className="max-w-md rounded-lg border border-line bg-white p-6 text-center shadow-soft">
        <h1 className="text-2xl font-bold">Akses tidak tersedia</h1>
        <p className="mt-2 text-sm text-muted">Role kamu tidak memiliki akses ke halaman ini.</p>
        <Button className="mt-5" onClick={() => window.location.assign(getRoleHome(role))}>Kembali</Button>
      </section>
    </main>
  );
}

const adminOnly: AppRole[] = ['admin'];
const adminAndKasir: AppRole[] = ['admin', 'kasir'];

const router = createBrowserRouter([
  { path: '/login', element: <Navigate to="/" replace /> },
  { path: '/u', element: <UserOrderPage /> },
  { path: '/u/:qrCode', element: <UserOrderPage /> },
  { path: '/order', element: <UserOrderPage /> },
  { path: '/order/:qrCode', element: <UserOrderPage /> },
  { path: '/unauthorized', element: <UnauthorizedPage /> },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      { index: true, element: <RoleRoute roles={adminOnly}><DashboardPage /></RoleRoute> },
      { path: 'pos', element: <RoleRoute roles={adminAndKasir}><PosPage /></RoleRoute> },
      { path: 'orders', element: <RoleRoute roles={adminAndKasir}><OrdersPage /></RoleRoute> },
      { path: 'products', element: <RoleRoute roles={adminOnly}><ProductsPage /></RoleRoute> },
      { path: 'categories', element: <RoleRoute roles={adminOnly}><CategoriesPage /></RoleRoute> },
      { path: 'stock', element: <RoleRoute roles={adminOnly}><StockPage /></RoleRoute> },
      { path: 'employees', element: <RoleRoute roles={adminOnly}><EmployeesPage /></RoleRoute> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}