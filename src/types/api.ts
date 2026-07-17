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
