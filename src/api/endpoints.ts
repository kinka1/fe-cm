import type { CashierOrderPayload, Category, Employee, LaravelPage, Order, OrderStatus, Product, QrOrderPayload, StockReportRow, StockTransaction, TableMenuResponse, User } from '../types/api';
import { api } from './client';

const unwrap = <T>(response: { data: { data: T } }) => response.data.data;

export const authApi = {
  login: async (payload: { username: string; password: string }) => unwrap<{ user: User; token: string }>(await api.post('/auth/login', payload)),
  me: async () => unwrap<User>(await api.get('/me')),
  logout: async () => unwrap<null>(await api.post('/auth/logout')),
};

export const catalogApi = {
  categories: async () => unwrap<Category[]>(await api.get('/categories')),
  createCategory: async (payload: Partial<Category>) => unwrap<Category>(await api.post('/categories', payload)),
  updateCategory: async (id: number, payload: Partial<Category>) => unwrap<Category>(await api.put(`/categories/${id}`, payload)),
  deleteCategory: async (id: number) => unwrap<null>(await api.delete(`/categories/${id}`)),
  products: async (params?: Record<string, unknown>) => unwrap<LaravelPage<Product>>(await api.get('/products', { params })),
  createProduct: async (payload: Partial<Product>) => unwrap<Product>(await api.post('/products', payload)),
  updateProduct: async (id: number, payload: Partial<Product>) => unwrap<Product>(await api.put(`/products/${id}`, payload)),
  deleteProduct: async (id: number) => unwrap<null>(await api.delete(`/products/${id}`)),
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
  report: async () => unwrap<StockReportRow[]>(await api.get('/stock-report')),
};

export const employeesApi = {
  list: async (params?: Record<string, unknown>) => unwrap<LaravelPage<Employee>>(await api.get('/employees', { params })),
  create: async (payload: Partial<Employee> & { password?: string }) => unwrap<Employee>(await api.post('/employees', payload)),
  update: async (id: number, payload: Partial<Employee> & { password?: string }) => unwrap<Employee>(await api.put(`/employees/${id}`, payload)),
  delete: async (id: number) => unwrap<null>(await api.delete(`/employees/${id}`)),
};
