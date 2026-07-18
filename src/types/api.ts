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
  employee?: { role_id?: number | null; role?: string | { name?: string | null; role_name?: string | null } | null } | null;
}

export interface Category {
  id: number;
  category_name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: number;
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

export interface DiningTable {
  id: number;
  table_number: string;
  qr_code: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved';
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
export type PaymentMethod = 'cash' | 'qris';
export type OrderType = 'dine_in_cashier' | 'takeaway';

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
  full_name: string;
  email: string;
  role_id: number;
  status: 'active' | 'inactive';
  join_date?: string;
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

/** POST /purchase-orders. Backend generate po_number sendiri dan selalu set status 'draft'. */
export interface PurchaseOrderPayload {
  supplier_id?: number | null;
  employee_id?: number | null;
  order_date: string;
  notes?: string | null;
  items: Array<{ product_id: number; quantity: number; unit_cost?: number | null; notes?: string | null }>;
}

/** PUT /purchase-orders/:id. Backend tidak menerima items di sini, dan status 'received' ditolak. */
export interface PurchaseOrderUpdatePayload {
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

export interface StockAlertRow {
  product_id: number;
  product_name?: string;
  current_stock: number | string;
  minimum_stock: number | string;
  [key: string]: unknown;
}
