export type ApiStatus = 'sukses' | 'gagal';

export interface ApiResponse<T> {
  status: ApiStatus;
  message: string;
  data: T;
  errors?: Record<string, string[]>;
}

export interface LaravelPage<T> {
  current_page: number;
  data: T[];
  first_page_url?: string;
  from: number | null;
  last_page: number;
  last_page_url?: string;
  links?: Array<{ url: string | null; label: string; active: boolean }>;
  next_page_url?: string | null;
  path?: string;
  per_page: number;
  prev_page_url?: string | null;
  to: number | null;
  total: number;
}

export interface User {
  id: number;
  employee_id?: number | null;
  name: string;
  username?: string;
  email?: string;
  role_id?: number | null;
  role_name?: string | null;
  role?: string | { name?: string | null; role_name?: string | null } | null;
  current_store_id?: number | null;
  current_store?: Store | null;
  employee?: { role_id?: number | null; store_id?: number | null; role?: string | { name?: string | null; role_name?: string | null } | null } | null;
}

export interface Store {
  id: number;
  store_name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  is_active: boolean | number;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: number;
  store_id?: number | null;
  category_name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: number;
  store_id?: number | null;
  product_name: string;
  sku: string;
  category_id: number;
  category?: Category;
  description?: string | null;
  unit_of_measure: string;
  minimum_stock: number | string;
  current_stock: number | string;
  cost_price: number | string;
  selling_price: number | string;
  is_active: boolean | number;
  created_at?: string;
  updated_at?: string;
}

export type TableStatus = 'available' | 'occupied' | 'reserved';

export interface DiningTable {
  id: number;
  store_id?: number | null;
  table_number: string;
  qr_code: string;
  capacity: number;
  status: TableStatus;
  created_at?: string;
  updated_at?: string;
}

export interface TableMenuResponse {
  table: DiningTable;
  menu: LaravelPage<Product>;
}

export interface OrderDetail {
  id: number;
  order_id: number;
  product_id: number;
  product?: Product;
  quantity: number | string;
  unit_price: number | string;
  subtotal: number | string;
  notes?: string | null;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'cancelled';
/** Backend menerima cash, qris, dan transfer (lihat CreateCashierOrderRequest & PaymentMethodController). */
export type PaymentMethod = 'cash' | 'qris' | 'transfer';
export type OrderType = 'dine_in_cashier' | 'takeaway';

/** GET /pos/payment-methods — daftar metode bayar beserta aturan input kasir. */
export interface PaymentMethodOption {
  value: PaymentMethod;
  label: string;
  requires_amount_paid: boolean;
  has_change: boolean;
}

export interface Payment {
  id: number;
  order_id: number;
  payment_method: PaymentMethod;
  amount_paid: number | string;
  change_amount: number | string;
  payment_status: 'pending' | 'success' | 'failed';
  payment_date?: string | null;
  qris_transaction_id?: string | null;
}

export interface Order {
  id: number;
  order_number: string;
  store_id?: number | null;
  store?: Store | null;
  cashier_session_id?: number | null;
  table_id?: number | null;
  order_type: OrderType | 'dine_in_qr';
  customer_name?: string | null;
  employee_id?: number | null;
  order_date: string;
  subtotal: number | string;
  tax: number | string;
  discount: number | string;
  payment_fee?: number | string;
  total_amount: number | string;
  payment_method?: PaymentMethod | null;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  details?: OrderDetail[];
  payment?: Payment | null;
}

export interface Employee {
  id: number;
  store_id?: number | null;
  full_name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  date_of_birth?: string | null;
  role_id: number;
  role?: { id?: number; role_name?: string } | null;
  photo_url?: string | null;
  ktp_url?: string | null;
  kk_url?: string | null;
  status: 'active' | 'inactive';
  join_date?: string;
}

export interface Role {
  id: number;
  role_name: string;
  permissions?: string[] | null;
}

export interface StockTransaction {
  id: number;
  product_id: number;
  transaction_type: 'in' | 'out' | 'adjustment';
  quantity: number | string;
  reference_type: 'purchase' | 'sale' | 'adjustment';
  reference_id?: number | null;
  employee_id?: number | null;
  notes?: string | null;
  transaction_date: string;
}

export interface StockReportRow {
  product_id: number;
  product_name: string;
  stock_in_total: number | string;
  stock_out_total: number | string;
  current_stock: number | string;
  last_transaction_date?: string | null;
}

export interface CashierOrderPayload {
  order_type: OrderType;
  store_id: number;
  table_id?: number | null;
  employee_id: number;
  customer_name?: string | null;
  payment_method: PaymentMethod;
  amount_paid?: number | null;
  discount?: number;
  items: Array<{ product_id: number; quantity: number; notes?: string | null }>;
}

export interface QrOrderPayload {
  qr_code: string;
  customer_name?: string | null;
  discount?: number;
  items: Array<{ product_id: number; quantity: number; notes?: string | null }>;
}

export type SupplierStatus = 'active' | 'inactive';

export interface Supplier {
  id: number;
  store_id?: number | null;
  supplier_name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  status: SupplierStatus;
  created_at?: string;
  updated_at?: string;
}

export type PurchaseOrderStatus = 'draft' | 'ordered' | 'received' | 'cancelled';

export interface PurchaseOrderItem {
  id: number;
  purchase_order_id: number;
  product_id: number;
  product?: Product;
  quantity: number | string;
  unit_cost: number | string;
  subtotal: number | string;
  notes?: string | null;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_id?: number | null;
  supplier?: Supplier | null;
  employee_id?: number | null;
  order_date: string;
  received_date?: string | null;
  status: PurchaseOrderStatus;
  total_amount: number | string;
  notes?: string | null;
  items?: PurchaseOrderItem[];
  created_at?: string;
  updated_at?: string;
}

/** POST /purchase-orders. Backend generate po_number sendiri dan selalu set status 'draft'. store_id wajib. */
export interface PurchaseOrderPayload {
  store_id: number;
  supplier_id?: number | null;
  employee_id?: number | null;
  order_date: string;
  notes?: string | null;
  items: Array<{ product_id: number; quantity: number; unit_cost?: number | null; notes?: string | null }>;
}

/** PUT /purchase-orders/:id. Backend tidak menerima items di sini, dan status 'received' ditolak. store_id wajib. */
export interface PurchaseOrderUpdatePayload {
  store_id: number;
  supplier_id?: number | null;
  employee_id?: number | null;
  order_date: string;
  status: Exclude<PurchaseOrderStatus, 'received'>;
  notes?: string | null;
}

/** Body approve/reject stock adjustment. */
export interface ApprovalPayload {
  approved_by?: number | null;
  approval_notes?: string | null;
}

export type StockAdjustmentType = 'increase' | 'decrease';
export type StockAdjustmentStatus = 'pending' | 'approved' | 'rejected';

export interface StockAdjustment {
  id: number;
  product_id: number;
  product?: Product;
  quantity: number | string;
  adjustment_type: StockAdjustmentType;
  requested_by?: number | null;
  approved_by?: number | null;
  status: StockAdjustmentStatus;
  reason?: string | null;
  approval_notes?: string | null;
  approved_at?: string | null;
  stock_transaction_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface StockAdjustmentPayload {
  product_id: number;
  quantity: number;
  adjustment_type: StockAdjustmentType;
  requested_by?: number | null;
  reason?: string | null;
}

export type StockOpnameStatus = 'draft' | 'submitted' | 'approved' | 'cancelled';

export interface StockOpnameItem {
  id: number;
  stock_opname_id: number;
  product_id: number;
  product?: Product;
  system_stock: number | string;
  physical_stock: number | string;
  difference: number | string;
  notes?: string | null;
}

export interface StockOpname {
  id: number;
  opname_number: string;
  employee_id?: number | null;
  opname_date: string;
  status: StockOpnameStatus;
  notes?: string | null;
  submitted_at?: string | null;
  approved_at?: string | null;
  approved_by?: number | null;
  items?: StockOpnameItem[];
  created_at?: string;
  updated_at?: string;
}

export interface ProductBatch {
  id: number;
  product_id: number;
  product?: Product;
  batch_number: string;
  expired_date?: string | null;
  quantity: number | string;
  received_date?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Recipe {
  id: number;
  product_id: number;
  product?: Product;
  ingredient_id: number;
  ingredient?: Product;
  quantity_needed: number | string;
  unit: string;
  created_at?: string;
  updated_at?: string;
}

export interface RecipePayload {
  product_id: number;
  ingredient_id: number;
  quantity_needed: number;
  unit: string;
}

export interface AssetsSummary {
  active_products: number;
  low_stock_items: number;
  stock_value: number | string;
  today_transactions: number;
}

export interface StockMovementSummaryRow {
  product_id: number;
  transaction_type: 'in' | 'out' | 'adjustment';
  total_quantity: number | string;
  product?: Product;
}

export interface StockAlertRow {
  product_id: number;
  product_name?: string;
  current_stock: number | string;
  minimum_stock: number | string;
  [key: string]: unknown;
}

export interface StockCardTransaction {
  id: number;
  transaction_type: 'in' | 'out' | 'adjustment';
  quantity: number | string;
  reference_type: 'purchase' | 'sale' | 'adjustment';
  reference_id?: number | null;
  running_balance: number | string;
  transaction_date: string;
  notes?: string | null;
}

export interface StockCardResponse {
  product: Product;
  transactions: StockCardTransaction[];
}

export interface Attendance {
  id: number;
  employee_id: number;
  employee?: Employee;
  store_id?: number | null;
  store?: Store | null;
  date: string;
  clock_in?: string | null;
  clock_out?: string | null;
  photo_url?: string | null;
  status: 'hadir' | 'izin' | 'sakit' | 'alpha';
  location_coordinates?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceSummary {
  total: number;
  hadir: number;
  izin: number;
  sakit: number;
  alpha: number;
  clocked_in: number;
  clocked_out: number;
}

export type CashierSessionStatus = 'open' | 'closed';
export type CashMovementType = 'cash_in' | 'cash_out';

export interface CashierCashMovement {
  id: number;
  cashier_session_id: number;
  store_id?: number | null;
  employee_id?: number | null;
  type: 'cash_in' | 'cash_out';
  amount: number | string;
  category?: string | null;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CashierSession {
  id: number;
  store_id: number;
  store?: Store | null;
  employee_id?: number | null;
  employee?: Employee | null;
  opened_by?: number | null;
  closed_by?: number | null;
  opening_cash: number | string;
  closing_cash?: number | string | null;
  expected_cash?: number | string | null;
  cash_difference?: number | string | null;
  status: CashierSessionStatus;
  opened_at?: string | null;
  closed_at?: string | null;
  opening_notes?: string | null;
  closing_notes?: string | null;
  orders?: Order[];
  cash_movements?: CashierCashMovement[];
  created_at?: string;
  updated_at?: string;
}

export type PosCartStatus = 'active' | 'checked_out' | 'cancelled';

/** Item cart POS yang tersimpan di server (tabel pos_cart_items). */
export interface PosCartItem {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes?: string | null;
  product: Product;
}

/**
 * Bentuk respons CartController::cartResponse — bukan model mentah:
 * subtotal & total_items sudah dihitung backend.
 */
export interface PosCart {
  id: number;
  user_id: number;
  store_id: number;
  name?: string | null;
  status: PosCartStatus;
  items: PosCartItem[];
  subtotal: number;
  total_items: number;
}

/** Body POST /pos/carts/:id/checkout. store_id ikut dari cart, jadi tidak dikirim. */
export interface CartCheckoutPayload {
  order_type: OrderType;
  table_id?: number | null;
  customer_name?: string | null;
  payment_method: PaymentMethod;
  amount_paid?: number | null;
  discount?: number;
}

export interface RevenueDailyRow {
  date: string;
  total_orders: number;
  subtotal: number;
  discount: number;
  tax: number;
  payment_fee: number;
  revenue: number;
  cash_revenue: number;
  qris_revenue: number;
  transfer_revenue: number;
}

/** GET /revenue/summary — agregat rentang tanggal + rincian harian. */
export interface RevenueSummary {
  from_date: string;
  to_date: string;
  store_id: number | null;
  payment_method: PaymentMethod | null;
  total_orders: number;
  subtotal: number;
  discount: number;
  tax: number;
  payment_fee: number;
  total_revenue: number;
  cash_revenue: number;
  qris_revenue: number;
  transfer_revenue: number;
  daily_details: RevenueDailyRow[];
}

export interface RevenueDayStat {
  date: string;
  store_id: number | null;
  payment_method: PaymentMethod | null;
  total_orders: number;
  subtotal: number;
  discount: number;
  tax: number;
  payment_fee: number;
  total_revenue: number;
  cash_revenue: number;
  qris_revenue: number;
  transfer_revenue: number;
}

/** GET /revenue/daily. orders hanya terisi bila include_orders=true. */
export interface RevenueDailyResponse {
  summary: RevenueDayStat;
  orders: LaravelPage<Order> | null;
}

export type SalesGroupBy = 'day' | 'store' | 'category' | 'product' | 'payment_method';

/** Baris breakdown /revenue/sales; kolom identitas tergantung group_by yang dipakai. */
export interface SalesBreakdownRow {
  total_orders: number;
  total_items: number;
  gross_sales: number;
  discount: number;
  net_sales: number;
  date?: string;
  store_id?: number;
  store_name?: string;
  category_id?: number | null;
  category_name?: string | null;
  product_id?: number;
  product_name?: string;
  sku?: string;
  payment_method?: PaymentMethod;
}

export interface SalesReportResponse {
  filters: {
    from_date: string;
    to_date: string;
    store_id: number | null;
    category_id: number | null;
    product_id: number | null;
    payment_method: PaymentMethod | null;
    group_by: SalesGroupBy | null;
  };
  summary: {
    total_orders: number;
    total_items: number;
    gross_sales: number;
    discount: number;
    net_sales: number;
    cash_revenue: number;
    qris_revenue: number;
    transfer_revenue: number;
  };
  breakdown: SalesBreakdownRow[];
  orders: LaravelPage<Order> | null;
}

/** Body POST /auth/register — membuat employee + user sekaligus. */
export interface RegisterPayload {
  name: string;
  username: string;
  email: string;
  password: string;
  password_confirmation: string;
  full_name: string;
  join_date: string;
  role_id: number;
  store_id?: number | null;
}

/** Body POST/PUT /attendances (input manual admin, bukan clock-in). */
export interface AttendancePayload {
  employee_id: number;
  store_id?: number | null;
  date: string;
  clock_in?: string | null;
  clock_out?: string | null;
  status: Attendance['status'];
  location_coordinates?: string | null;
  notes?: string | null;
}

export interface CashierSessionSummary {
  cashier_session_id: number;
  store_id: number;
  employee_id: number | null;
  status: CashierSessionStatus;
  opened_at?: string | null;
  closed_at?: string | null;
  opening_cash: number | string;
  cash_sales: number | string;
  qris_sales: number | string;
  transfer_sales: number | string;
  cash_in: number | string;
  cash_out: number | string;
  expected_cash: number | string;
  closing_cash: number | string | null;
  cash_difference: number | string | null;
  total_orders: number;
}


