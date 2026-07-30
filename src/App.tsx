import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { PosPage } from './pages/PosPage';
import { OrdersPage } from './pages/OrdersPage';
import { ProductsPage } from './pages/ProductsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { StockPage } from './pages/StockPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { PurchaseOrdersPage } from './pages/PurchaseOrdersPage';
import { StockAdjustmentsPage } from './pages/StockAdjustmentsPage';
import { StockOpnamesPage } from './pages/StockOpnamesPage';
import { ProductBatchesPage } from './pages/ProductBatchesPage';
import { RecipesPage } from './pages/RecipesPage';
import { StockAlertsPage } from './pages/StockAlertsPage';
import { AttendancePage } from './pages/AttendancePage';
import { TablesPage } from './pages/TablesPage';
import { CashierSessionPage } from './pages/CashierSessionPage';
import { UserOrderPage } from './pages/UserOrderPage';
import { LoginPage } from './pages/LoginPage';
import { Button } from './components/ui';
import { type AppRole, getRoleHome, useAuth } from './lib/auth';

function ProtectedRoute() {
  const { isAuthenticated, role } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role === 'user') return <Navigate to="/u" replace />;
  return <AppLayout />;
}

function RoleRoute({ roles, children }: { roles: AppRole[]; children: React.ReactNode }) {
  const { role, canAccess } = useAuth();
  if (!canAccess(roles)) return <Navigate to={getRoleHome(role)} replace />;
  return <>{children}</>;
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

const adminOnly: AppRole[] = ['admin', 'supervisor'];
const adminAndKasir: AppRole[] = ['admin', 'supervisor', 'kasir'];

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
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
      { path: 'cashier-session', element: <RoleRoute roles={adminAndKasir}><CashierSessionPage /></RoleRoute> },
      { path: 'orders', element: <RoleRoute roles={adminAndKasir}><OrdersPage /></RoleRoute> },
      { path: 'tables', element: <RoleRoute roles={adminOnly}><TablesPage /></RoleRoute> },
      { path: 'products', element: <RoleRoute roles={adminOnly}><ProductsPage /></RoleRoute> },
      { path: 'categories', element: <RoleRoute roles={adminOnly}><CategoriesPage /></RoleRoute> },
      { path: 'stock', element: <RoleRoute roles={adminOnly}><StockPage /></RoleRoute> },
      { path: 'employees', element: <RoleRoute roles={adminOnly}><EmployeesPage /></RoleRoute> },
      { path: 'suppliers', element: <RoleRoute roles={adminOnly}><SuppliersPage /></RoleRoute> },
      { path: 'purchase-orders', element: <RoleRoute roles={adminOnly}><PurchaseOrdersPage /></RoleRoute> },
      { path: 'stock-adjustments', element: <RoleRoute roles={adminOnly}><StockAdjustmentsPage /></RoleRoute> },
      { path: 'stock-opnames', element: <RoleRoute roles={adminOnly}><StockOpnamesPage /></RoleRoute> },
      { path: 'product-batches', element: <RoleRoute roles={adminOnly}><ProductBatchesPage /></RoleRoute> },
      { path: 'recipes', element: <RoleRoute roles={adminOnly}><RecipesPage /></RoleRoute> },
      { path: 'stock-alerts', element: <RoleRoute roles={adminOnly}><StockAlertsPage /></RoleRoute> },
      { path: 'attendance', element: <RoleRoute roles={adminAndKasir}><AttendancePage /></RoleRoute> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}