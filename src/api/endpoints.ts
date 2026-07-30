import type { ApprovalPayload, AssetsSummary, CashierOrderPayload, Category, Employee, LaravelPage, Order, OrderStatus, Product, ProductBatch, PurchaseOrder, PurchaseOrderPayload, PurchaseOrderUpdatePayload, QrOrderPayload, Recipe, RecipePayload, StockAdjustment, StockAdjustmentPayload, StockAlertRow, StockOpname, StockOpnameItem, StockReportRow, StockTransaction, Supplier, TableMenuResponse, User, StockCardResponse, Attendance, AttendanceSummary, Store, Role, DiningTable, TableStatus, CashierSession, CashierCashMovement, CashMovementType, CashierSessionSummary } from '../types/api';
import { api } from './client';

const unwrap = <T>(response: { data: { data?: T } | T }) => {
  const payload = response.data;
  if (payload && typeof payload === 'object' && 'data' in payload) return payload.data as T;
  return payload as T;
};

/**
 * Backend tidak konsisten: sebagian endpoint mengembalikan array polos
 * (mis. /categories), sebagian lagi paginator Laravel (mis. /products).
 * Helper ini menormalkan keduanya jadi array.
 */
const toList = <T>(payload: T[] | LaravelPage<T> | { data?: T[] | LaravelPage<T> } | null | undefined): T[] => {
  if (Array.isArray(payload)) return payload;
  if (!payload) return [];

  const nested = (payload as { data?: T[] | LaravelPage<T> }).data;
  if (Array.isArray(nested)) return nested;
  if (nested && Array.isArray((nested as LaravelPage<T>).data)) return (nested as LaravelPage<T>).data;

  return [];
};

export const authApi = {
  login: async (payload: { username: string; password: string }) => unwrap<{ user: User; token: string }>(await api.post('/auth/login', payload)),
  me: async () => unwrap<User>(await api.get('/me')),
  stores: async () => toList(unwrap<Store[] | LaravelPage<Store>>(await api.get('/me/stores'))),
  updateCurrentStore: async (store_id: number) => unwrap<User>(await api.post('/me/current-store', { store_id })),
  logout: async () => unwrap<null>(await api.post('/auth/logout')),
};

export const catalogApi = {
  categories: async () => toList(unwrap<Category[] | LaravelPage<Category>>(await api.get('/categories'))),
  createCategory: async (payload: Partial<Category>) => unwrap<Category>(await api.post('/categories', payload)),
  updateCategory: async (id: number, payload: Partial<Category>) => unwrap<Category>(await api.put(`/categories/${id}`, payload)),
  deleteCategory: async (id: number) => unwrap<null>(await api.delete(`/categories/${id}`)),
  products: async (params?: Record<string, unknown>) => unwrap<LaravelPage<Product>>(await api.get('/products', { params })),
  createProduct: async (payload: Partial<Product>) => unwrap<Product>(await api.post('/products', payload)),
  updateProduct: async (id: number, payload: Partial<Product>) => unwrap<Product>(await api.put(`/products/${id}`, payload)),
  deleteProduct: async (id: number) => unwrap<null>(await api.delete(`/products/${id}`)),
  deletedProducts: async (params?: Record<string, unknown>) => unwrap<LaravelPage<Product>>(await api.get('/products/deleted', { params })),
  restoreProduct: async (id: number) => unwrap<Product>(await api.post(`/products/${id}/restore`)),
  forceDeleteProduct: async (id: number) => unwrap<null>(await api.delete(`/products/${id}/force`)),
};

export const posApi = {
  menu: async (params?: Record<string, unknown>) => unwrap<LaravelPage<Product>>(await api.get('/pos/menu', { params })),
  tableMenu: async (qrCode: string, params?: Record<string, unknown>) => unwrap<TableMenuResponse>(await api.get(`/pos/tables/${qrCode}/menu`, { params })),
  createQrOrder: async (payload: QrOrderPayload) => unwrap<Order>(await api.post('/pos/qr-orders', payload)),
  createCashierOrder: async (payload: CashierOrderPayload) => unwrap<Order>(await api.post('/pos/cashier-orders', payload)),
  orders: async (params?: Record<string, unknown>) => unwrap<LaravelPage<Order>>(await api.get('/pos/orders', { params })),
  order: async (id: number) => unwrap<Order>(await api.get(`/pos/orders/${id}`)),
  updateStatus: async (id: number, order_status: OrderStatus) => unwrap<Order>(await api.patch(`/pos/orders/${id}/status`, { order_status })),
};

export const stockApi = {
  transactions: async (params?: Record<string, unknown>) => unwrap<LaravelPage<StockTransaction>>(await api.get('/stock-transactions', { params })),
  createTransaction: async (payload: Partial<StockTransaction>) => unwrap<StockTransaction>(await api.post('/stock-transactions', payload)),
  report: async (params?: Record<string, unknown>) => toList(unwrap<StockReportRow[] | LaravelPage<StockReportRow>>(await api.get('/stock-report', { params }))),
  card: async (productId: number, params?: Record<string, unknown>) => unwrap<StockCardResponse>(await api.get(`/products/${productId}/stock-card`, { params })),
  exportReport: async (params?: Record<string, unknown>) => {
    const response = await api.get('/stock-report/export', { params, responseType: 'blob' });
    return response.data;
  },
};

export const employeesApi = {
  list: async (params?: Record<string, unknown>) => unwrap<LaravelPage<Employee>>(await api.get('/employees', { params })),
  // Backend mewajibkan multipart (ktp & kk berupa image) untuk create.
  // Content-Type sengaja TIDAK diset manual: axios mengisi 'multipart/form-data; boundary=...'
  // otomatis dari FormData. Menyetelnya manual menghapus boundary dan membuat parsing backend gagal.
  create: async (payload: FormData) => unwrap<Employee>(await api.post('/employees', payload)),
  // Laravel tidak mem-parse multipart pada PUT; pakai POST + _method=PUT (payload sudah menyertakan _method).
  update: async (id: number, payload: FormData) => unwrap<Employee>(await api.post(`/employees/${id}`, payload)),
  delete: async (id: number) => unwrap<null>(await api.delete(`/employees/${id}`)),
};

export const rolesApi = {
  list: async () => toList(unwrap<Role[] | LaravelPage<Role>>(await api.get('/roles'))),
};

export const suppliersApi = {
  list: async (params?: Record<string, unknown>) => toList(unwrap<Supplier[] | LaravelPage<Supplier>>(await api.get('/suppliers', { params }))),
  create: async (payload: Partial<Supplier>) => unwrap<Supplier>(await api.post('/suppliers', payload)),
  update: async (id: number, payload: Partial<Supplier>) => unwrap<Supplier>(await api.put(`/suppliers/${id}`, payload)),
  delete: async (id: number) => unwrap<null>(await api.delete(`/suppliers/${id}`)),
};

export const purchaseOrdersApi = {
  list: async (params?: Record<string, unknown>) => toList(unwrap<PurchaseOrder[] | LaravelPage<PurchaseOrder>>(await api.get('/purchase-orders', { params }))),
  show: async (id: number) => unwrap<PurchaseOrder>(await api.get(`/purchase-orders/${id}`)),
  create: async (payload: PurchaseOrderPayload) => unwrap<PurchaseOrder>(await api.post('/purchase-orders', payload)),
  update: async (id: number, payload: PurchaseOrderUpdatePayload) => unwrap<PurchaseOrder>(await api.put(`/purchase-orders/${id}`, payload)),
  // receive & cancel tidak menerima body sama sekali di backend.
  receive: async (id: number) => unwrap<PurchaseOrder>(await api.post(`/purchase-orders/${id}/receive`)),
  cancel: async (id: number) => unwrap<PurchaseOrder>(await api.post(`/purchase-orders/${id}/cancel`)),
};

export const stockAdjustmentsApi = {
  list: async (params?: Record<string, unknown>) => toList(unwrap<StockAdjustment[] | LaravelPage<StockAdjustment>>(await api.get('/stock-adjustments', { params }))),
  create: async (payload: StockAdjustmentPayload) => unwrap<StockAdjustment>(await api.post('/stock-adjustments', payload)),
  approve: async (id: number, payload?: ApprovalPayload) => unwrap<StockAdjustment>(await api.post(`/stock-adjustments/${id}/approve`, payload ?? {})),
  reject: async (id: number, payload?: ApprovalPayload) => unwrap<StockAdjustment>(await api.post(`/stock-adjustments/${id}/reject`, payload ?? {})),
};

export const stockOpnamesApi = {
  list: async (params?: Record<string, unknown>) => toList(unwrap<StockOpname[] | LaravelPage<StockOpname>>(await api.get('/stock-opnames', { params }))),
  show: async (id: number) => unwrap<StockOpname>(await api.get(`/stock-opnames/${id}`)),
  create: async (payload: { store_id: number; opname_date: string; employee_id?: number | null; notes?: string | null }) => unwrap<StockOpname>(await api.post('/stock-opnames', payload)),
  addItem: async (id: number, payload: { product_id: number; physical_stock: number; notes?: string | null }) => unwrap<StockOpnameItem>(await api.post(`/stock-opnames/${id}/items`, payload)),
  submit: async (id: number) => unwrap<StockOpname>(await api.post(`/stock-opnames/${id}/submit`)),
  approve: async (id: number, payload?: { approved_by?: number | null }) => unwrap<StockOpname>(await api.post(`/stock-opnames/${id}/approve`, payload ?? {})),
};

export const productBatchesApi = {
  list: async (params?: Record<string, unknown>) => toList(unwrap<ProductBatch[] | LaravelPage<ProductBatch>>(await api.get('/product-batches', { params }))),
  expiringSoon: async (params?: Record<string, unknown>) => toList(unwrap<ProductBatch[] | LaravelPage<ProductBatch>>(await api.get('/product-batches/expiring-soon', { params }))),
  create: async (payload: Partial<ProductBatch>) => unwrap<ProductBatch>(await api.post('/product-batches', payload)),
};

export const recipesApi = {
  list: async (params?: Record<string, unknown>) => toList(unwrap<Recipe[] | LaravelPage<Recipe>>(await api.get('/recipes', { params }))),
  show: async (id: number) => unwrap<Recipe>(await api.get(`/recipes/${id}`)),
  create: async (payload: RecipePayload) => unwrap<Recipe>(await api.post('/recipes', payload)),
  update: async (id: number, payload: RecipePayload) => unwrap<Recipe>(await api.put(`/recipes/${id}`, payload)),
  delete: async (id: number) => unwrap<null>(await api.delete(`/recipes/${id}`)),
  byProduct: async (productId: number) => toList(unwrap<Recipe[] | LaravelPage<Recipe>>(await api.get(`/products/${productId}/recipes`))),
};

export const stockAlertsApi = {
  list: async (params?: Record<string, unknown>) => toList(unwrap<StockAlertRow[] | LaravelPage<StockAlertRow>>(await api.get('/stock-alerts', { params }))),
  summary: async () => unwrap<{ low_stock_count: number; out_of_stock_count: number }>(await api.get('/stock-alerts/summary')),
};

export const assetsApi = {
  summary: async () => unwrap<AssetsSummary>(await api.get('/assets/summary')),
  lowStockSummary: async () => toList(unwrap<StockAlertRow[] | LaravelPage<StockAlertRow>>(await api.get('/assets/low-stock-summary'))),
  stockMovementSummary: async () => toList(unwrap<Array<{ product_id: number; transaction_type: string; total_quantity: number | string }> | LaravelPage<{ product_id: number; transaction_type: string; total_quantity: number | string }>>(await api.get('/assets/stock-movement-summary'))),
};

export const storesApi = {
  list: async (params?: Record<string, unknown>) => toList(unwrap<Store[] | LaravelPage<Store>>(await api.get('/stores', { params }))),
  show: async (id: number) => unwrap<Store>(await api.get(`/stores/${id}`)),
  create: async (payload: Partial<Store>) => unwrap<Store>(await api.post('/stores', payload)),
  update: async (id: number, payload: Partial<Store>) => unwrap<Store>(await api.put(`/stores/${id}`, payload)),
  delete: async (id: number) => unwrap<null>(await api.delete(`/stores/${id}`)),
};

export const tablesApi = {
  list: async (params?: Record<string, unknown>) => toList(unwrap<DiningTable[] | LaravelPage<DiningTable>>(await api.get('/tables', { params }))),
  show: async (id: number) => unwrap<DiningTable>(await api.get(`/tables/${id}`)),
  create: async (payload: Partial<DiningTable>) => unwrap<DiningTable>(await api.post('/tables', payload)),
  update: async (id: number, payload: Partial<DiningTable>) => unwrap<DiningTable>(await api.put(`/tables/${id}`, payload)),
  delete: async (id: number) => unwrap<null>(await api.delete(`/tables/${id}`)),
  updateStatus: async (id: number, status: TableStatus) => unwrap<DiningTable>(await api.patch(`/tables/${id}/status`, { status })),
};

export const cashierSessionsApi = {
  list: async (params?: Record<string, unknown>) => unwrap<LaravelPage<CashierSession>>(await api.get('/pos/cashier-sessions', { params })),
  current: async (params?: Record<string, unknown>) => unwrap<CashierSession | null>(await api.get('/pos/cashier-sessions/current', { params })),
  show: async (id: number) => unwrap<CashierSession>(await api.get(`/pos/cashier-sessions/${id}`)),
  open: async (payload: { store_id: number; opening_cash: number; opening_notes?: string | null }) => unwrap<CashierSession>(await api.post('/pos/cashier-sessions/open', payload)),
  close: async (id: number, payload: { closing_cash: number; closing_notes?: string | null }) => unwrap<CashierSession>(await api.post(`/pos/cashier-sessions/${id}/close`, payload)),
  addCashMovement: async (id: number, payload: { type: CashMovementType; amount: number; category?: string | null; description?: string | null }) => unwrap<CashierCashMovement>(await api.post(`/pos/cashier-sessions/${id}/cash-movements`, payload)),
  summary: async (id: number) => unwrap<CashierSessionSummary>(await api.get(`/pos/cashier-sessions/${id}/summary`)),
  orders: async (id: number, params?: Record<string, unknown>) => unwrap<LaravelPage<Order>>(await api.get(`/pos/cashier-sessions/${id}/orders`, { params })),
  cashMovements: async (id: number, params?: Record<string, unknown>) => unwrap<LaravelPage<CashierCashMovement>>(await api.get(`/pos/cashier-sessions/${id}/cash-movements`, { params })),
};

export const attendanceApi = {
  list: async (params?: Record<string, unknown>) => toList(unwrap<Attendance[] | LaravelPage<Attendance>>(await api.get('/attendances', { params }))),
  today: async (params?: Record<string, unknown>) => unwrap<Attendance | null>(await api.get('/attendances/today', { params })),
  summary: async (params?: Record<string, unknown>) => unwrap<AttendanceSummary>(await api.get('/attendances/summary', { params })),
  // Content-Type dibiarkan otomatis agar axios menambahkan boundary multipart yang benar.
  checkIn: async (payload: FormData) => unwrap<Attendance>(await api.post('/attendances/clock-in', payload)),
  checkOut: async (payload: { employee_id: number; location_coordinates?: string | null; notes?: string | null }) => unwrap<Attendance>(await api.post('/attendances/clock-out', payload)),
};

