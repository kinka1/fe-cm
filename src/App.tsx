import { Suspense, lazy } from 'react';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { LoadingState } from './components/states';
import { Button } from './components/ui';
import { type AppRole, getRoleHome, useAuth } from './lib/auth';

const page = <T extends Record<string, React.ComponentType>>(loader: () => Promise<T>, name: keyof T) =>
  lazy(() => loader().then((module) => ({ default: module[name] })));

const LoginPage = page(() => import('./pages/LoginPage'), 'LoginPage');
const UserOrderPage = page(() => import('./pages/UserOrderPage'), 'UserOrderPage');
const PaymentStatusPage = page(() => import('./pages/PaymentStatusPage'), 'PaymentStatusPage');
const DashboardPage = page(() => import('./pages/DashboardPage'), 'DashboardPage');
const PosPage = page(() => import('./pages/PosPage'), 'PosPage');
const CashierSessionPage = page(() => import('./pages/CashierSessionPage'), 'CashierSessionPage');
const OrdersPage = page(() => import('./pages/OrdersPage'), 'OrdersPage');
const RevenueReportPage = page(() => import('./pages/RevenueReportPage'), 'RevenueReportPage');
const TablesPage = page(() => import('./pages/TablesPage'), 'TablesPage');
const StoresPage = page(() => import('./pages/StoresPage'), 'StoresPage');
const RolesPage = page(() => import('./pages/RolesPage'), 'RolesPage');
const RegisterUserPage = page(() => import('./pages/RegisterUserPage'), 'RegisterUserPage');
const ProductsPage = page(() => import('./pages/ProductsPage'), 'ProductsPage');
const CategoriesPage = page(() => import('./pages/CategoriesPage'), 'CategoriesPage');
const ModifiersPage = page(() => import('./pages/ModifiersPage'), 'ModifiersPage');
const StockPage = page(() => import('./pages/StockPage'), 'StockPage');
const EmployeesPage = page(() => import('./pages/EmployeesPage'), 'EmployeesPage');
const SuppliersPage = page(() => import('./pages/SuppliersPage'), 'SuppliersPage');
const PurchaseOrdersPage = page(() => import('./pages/PurchaseOrdersPage'), 'PurchaseOrdersPage');
const StockAdjustmentsPage = page(() => import('./pages/StockAdjustmentsPage'), 'StockAdjustmentsPage');
const StockOpnamesPage = page(() => import('./pages/StockOpnamesPage'), 'StockOpnamesPage');
const ProductBatchesPage = page(() => import('./pages/ProductBatchesPage'), 'ProductBatchesPage');
const RecipesPage = page(() => import('./pages/RecipesPage'), 'RecipesPage');
const StockAlertsPage = page(() => import('./pages/StockAlertsPage'), 'StockAlertsPage');
const AttendancePage = page(() => import('./pages/AttendancePage'), 'AttendancePage');

const ADMIN_ONLY: AppRole[] = ['admin', 'supervisor'];
const ADMIN_AND_KASIR: AppRole[] = ['admin', 'supervisor', 'kasir'];

/** Menahan render sampai chunk halaman selesai diunduh. */
function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingState label="Memuat halaman..." />}>{children}</Suspense>;
}

function ProtectedRoute() {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role === 'user') return <Navigate to="/u" replace />;

  return <AppLayout />;
}

function RoleRoute({ roles, children }: { roles: AppRole[]; children: React.ReactNode }) {
  const { role, canAccess } = useAuth();

  if (!canAccess(roles)) return <Navigate to={getRoleHome(role)} replace />;

  return <Lazy>{children}</Lazy>;
}

function UnauthorizedPage() {
  const { role } = useAuth();

  return (
    <main className="grid min-h-dvh place-items-center bg-surface p-4 text-ink">
      <section className="max-w-md rounded-card border border-line bg-white p-6 text-center shadow-soft">
        <h1 className="text-2xl font-bold">Akses tidak tersedia</h1>
        <p className="mt-2 text-sm text-muted">Role kamu tidak memiliki akses ke halaman ini.</p>
        <Button className="mt-5" onClick={() => window.location.assign(getRoleHome(role))}>Kembali</Button>
      </section>
    </main>
  );
}

const router = createBrowserRouter([
  { path: '/login', element: <Lazy><LoginPage /></Lazy> },
  { path: '/u', element: <Lazy><UserOrderPage /></Lazy> },
  { path: '/u/:qrCode', element: <Lazy><UserOrderPage /></Lazy> },
  { path: '/order', element: <Lazy><UserOrderPage /></Lazy> },
  { path: '/order/:qrCode', element: <Lazy><UserOrderPage /></Lazy> },
  { path: '/payment-status/:orderNumber', element: <Lazy><PaymentStatusPage /></Lazy> },
  { path: '/unauthorized', element: <UnauthorizedPage /> },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      { index: true, element: <RoleRoute roles={ADMIN_ONLY}><DashboardPage /></RoleRoute> },
      { path: 'pos', element: <RoleRoute roles={ADMIN_AND_KASIR}><PosPage /></RoleRoute> },
      { path: 'cashier-session', element: <RoleRoute roles={ADMIN_AND_KASIR}><CashierSessionPage /></RoleRoute> },
      { path: 'orders', element: <RoleRoute roles={ADMIN_AND_KASIR}><OrdersPage /></RoleRoute> },
      { path: 'revenue', element: <RoleRoute roles={ADMIN_ONLY}><RevenueReportPage /></RoleRoute> },
      { path: 'tables', element: <RoleRoute roles={ADMIN_ONLY}><TablesPage /></RoleRoute> },
      { path: 'stores', element: <RoleRoute roles={ADMIN_ONLY}><StoresPage /></RoleRoute> },
      { path: 'roles', element: <RoleRoute roles={ADMIN_ONLY}><RolesPage /></RoleRoute> },
      { path: 'users/register', element: <RoleRoute roles={ADMIN_ONLY}><RegisterUserPage /></RoleRoute> },
      { path: 'products', element: <RoleRoute roles={ADMIN_ONLY}><ProductsPage /></RoleRoute> },
      { path: 'categories', element: <RoleRoute roles={ADMIN_ONLY}><CategoriesPage /></RoleRoute> },
      { path: 'modifiers', element: <RoleRoute roles={ADMIN_ONLY}><ModifiersPage /></RoleRoute> },
      { path: 'stock', element: <RoleRoute roles={ADMIN_ONLY}><StockPage /></RoleRoute> },
      { path: 'employees', element: <RoleRoute roles={ADMIN_ONLY}><EmployeesPage /></RoleRoute> },
      { path: 'suppliers', element: <RoleRoute roles={ADMIN_ONLY}><SuppliersPage /></RoleRoute> },
      { path: 'purchase-orders', element: <RoleRoute roles={ADMIN_ONLY}><PurchaseOrdersPage /></RoleRoute> },
      { path: 'stock-adjustments', element: <RoleRoute roles={ADMIN_ONLY}><StockAdjustmentsPage /></RoleRoute> },
      { path: 'stock-opnames', element: <RoleRoute roles={ADMIN_ONLY}><StockOpnamesPage /></RoleRoute> },
      { path: 'product-batches', element: <RoleRoute roles={ADMIN_ONLY}><ProductBatchesPage /></RoleRoute> },
      { path: 'recipes', element: <RoleRoute roles={ADMIN_ONLY}><RecipesPage /></RoleRoute> },
      { path: 'stock-alerts', element: <RoleRoute roles={ADMIN_ONLY}><StockAlertsPage /></RoleRoute> },
      { path: 'attendance', element: <RoleRoute roles={ADMIN_AND_KASIR}><AttendancePage /></RoleRoute> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
