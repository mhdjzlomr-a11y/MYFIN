export type TransactionType = 'income' | 'expense';
export type CategoryType = 'income' | 'expense' | 'both';
export type Language = 'ml' | 'en';
export type Theme = 'light' | 'dark';
export type DateFilterPreset = 'daily' | 'weekly' | 'monthly' | 'all' | 'custom';
export type ArchivePeriodType = 'weekly' | 'monthly';
export type ActiveTab = 'dashboard' | 'calendar' | 'categories' | 'transactions' | 'reports';

export interface FinanceDivision {
  id: string;
  nameMl: string;
  nameEn: string;
  color: string;
  icon: string;
  isCustom: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  nameMl: string;
  nameEn: string;
  type: CategoryType;
  color: string;
  icon: string;
  isCustom: boolean;
  createdAt: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string; // YYYY-MM-DD
  divisionId: string;
  categoryId: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface FilterState {
  preset: DateFilterPreset;
  startDate: string;
  endDate: string;
  divisionId: string; // 'all' or specific divisionId
  categoryId: string; // 'all' or specific categoryId
  type: 'all' | TransactionType;
  searchQuery: string;
}

export interface AppSettings {
  theme: Theme;
  language: Language;
  currency: 'INR';
}

export interface FinanceSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactionCount: number;
  savingsRate: number;
}

export interface CategorySummaryRow {
  category: Category;
  income: number;
  expense: number;
  balance: number;
  count: number;
  expenseSharePercent: number;
  incomeSharePercent: number;
}

export interface DivisionSummaryRow {
  division: FinanceDivision;
  income: number;
  expense: number;
  balance: number;
  count: number;
  expenseSharePercent: number;
}

export interface TimeSeriesData {
  labels: string[];
  income: number[];
  expense: number[];
}

export interface ArchivedBreakdownItem {
  id: string;
  nameMl: string;
  nameEn: string;
  icon: string;
  color: string;
  income: number;
  expense: number;
  balance: number;
  count: number;
  expenseSharePercent: number;
}

export interface StoredPeriodReport {
  id: string;
  periodType: ArchivePeriodType;
  startDate: string;
  endDate: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  savingsRate: number;
  transactionCount: number;
  categoryBreakdown: ArchivedBreakdownItem[];
  divisionBreakdown: ArchivedBreakdownItem[];
  transactions: Transaction[];
  createdAt: string;
  updatedAt: string;
}

export interface FinanceBackupPayload {
  version: 1;
  exportedAt: string;
  transactions: Transaction[];
  divisions: FinanceDivision[];
  categories: Category[];
  settings?: AppSettings;
  archives?: StoredPeriodReport[];
}

export interface FirebaseSyncConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

export type CloudSyncStatus =
  | 'unconfigured'
  | 'signed_out'
  | 'connecting'
  | 'syncing'
  | 'synced'
  | 'error';

export interface CloudUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}
