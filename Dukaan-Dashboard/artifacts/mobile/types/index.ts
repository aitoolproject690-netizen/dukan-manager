export interface Customer {
  id: string;
  name: string;
  mobile: string;
  address: string;
  notes: string;
  credit_balance: number;
  created_at: number;
  updated_at: number;
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  purchase_price: number;
  selling_price: number;
  stock: number;
  low_stock_alert: number;
  unit: string;
  created_at: number;
  updated_at: number;
}

export interface Sale {
  id: string;
  customer_id: string | null;
  customer_name: string;
  invoice_number: string;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: 'cash' | 'upi' | 'credit' | 'mixed';
  cash_amount: number;
  upi_amount: number;
  credit_amount: number;
  notes: string;
  date: number;
  created_at: number;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  price: number;
  purchase_price: number;
}

export interface KhataTransaction {
  id: string;
  customer_id: string;
  type: 'credit' | 'payment';
  amount: number;
  note: string;
  date: number;
  created_at: number;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  note: string;
  date: number;
  created_at: number;
}

export interface DashboardData {
  today_sales: number;
  today_profit: number;
  today_cash: number;
  today_upi: number;
  today_credit: number;
  total_pending_credit: number;
  monthly_sales: number;
  monthly_profit: number;
  monthly_expenses: number;
  today_expenses: number;
}

export interface CartItem {
  product_id: string | null;
  product_name: string;
  quantity: number;
  price: number;
  purchase_price: number;
  unit: string;
}

export interface AppSettings {
  business_name: string;
  business_phone: string;
  business_address: string;
  business_gstn: string;
  pin_enabled: boolean;
  fingerprint_enabled: boolean;
  dark_mode: 'system' | 'light' | 'dark';
  upi_id: string;
  low_stock_alerts: boolean;
  invoice_prefix: string;
  currency_symbol: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  business_name: 'My Dukaan',
  business_phone: '',
  business_address: '',
  business_gstn: '',
  pin_enabled: false,
  fingerprint_enabled: false,
  dark_mode: 'system',
  upi_id: '',
  low_stock_alerts: true,
  invoice_prefix: 'INV',
  currency_symbol: '₹',
};

export const EXPENSE_CATEGORIES = [
  'Rent',
  'Electricity',
  'Salaries',
  'Transport',
  'Raw Material',
  'Maintenance',
  'Marketing',
  'Packaging',
  'Miscellaneous',
];
