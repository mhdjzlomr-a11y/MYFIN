import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_DIVISIONS,
  DEFAULT_SETTINGS,
  createSampleTransactions,
} from '../data/defaults';
import { t, type TranslationKey } from '../i18n/translations';
import {
  computeCategorySummary,
  computeDivisionSummary,
  computeSummary,
  filterTransactions,
} from '../services/analytics';
import {
  buildBackupPayload,
  loadFinanceState,
  parseBackupPayload,
  saveCategories,
  saveDivisions,
  saveSettings,
  saveTransactions,
} from '../services/storage';
import type {
  ActiveTab,
  AppSettings,
  Category,
  CategorySummaryRow,
  CategoryType,
  DivisionSummaryRow,
  FilterState,
  FinanceDivision,
  FinanceSummary,
  Transaction,
  TransactionType,
} from '../types/finance';

export interface NewTransactionInput {
  type: TransactionType;
  amount: number;
  date: string;
  divisionId: string;
  categoryId: string;
  note: string;
}

export interface NewCategoryInput {
  nameMl: string;
  nameEn: string;
  type: CategoryType;
  color: string;
  icon: string;
}

export interface NewDivisionInput {
  nameMl: string;
  nameEn: string;
  color: string;
  icon: string;
}

export interface ModalDefaults {
  categoryId?: string;
  divisionId?: string;
  type?: TransactionType;
}

interface FinanceContextValue {
  isReady: boolean;
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  divisions: FinanceDivision[];
  categories: Category[];
  settings: AppSettings;
  filters: FilterState;
  activeTab: ActiveTab;
  summary: FinanceSummary;
  categorySummary: CategorySummaryRow[];
  divisionSummary: DivisionSummaryRow[];
  isTxModalOpen: boolean;
  editingTransaction: Transaction | null;
  modalDefaults: ModalDefaults | null;
  toast: { id: number; text: string; kind: 'success' | 'error' } | null;
  setActiveTab: (tab: ActiveTab) => void;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;
  toggleTheme: () => void;
  toggleLanguage: () => void;
  openAddModal: (defaults?: ModalDefaults) => void;
  openEditModal: (tx: Transaction) => void;
  closeTxModal: () => void;
  addTransaction: (input: NewTransactionInput) => void;
  updateTransaction: (id: string, input: NewTransactionInput) => void;
  deleteTransaction: (id: string) => void;
  addCategory: (input: NewCategoryInput) => Category;
  deleteCategory: (id: string) => void;
  addDivision: (input: NewDivisionInput) => FinanceDivision;
  deleteDivision: (id: string) => void;
  loadSampleData: () => void;
  exportBackupJson: () => string;
  importBackupJson: (jsonText: string) => boolean;
  clearAllData: () => void;
  showToast: (keyOrText: TranslationKey | string, kind?: 'success' | 'error', isLiteral?: boolean) => void;
}

const INITIAL_FILTERS: FilterState = {
  preset: 'monthly',
  startDate: '',
  endDate: '',
  divisionId: 'all',
  categoryId: 'all',
  type: 'all',
  searchQuery: '',
};

const FinanceContext = createContext<FinanceContextValue | null>(null);

function makeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [divisions, setDivisions] = useState<FinanceDivision[]>(DEFAULT_DIVISIONS);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [modalDefaults, setModalDefaults] = useState<ModalDefaults | null>(null);
  const [toast, setToast] = useState<{ id: number; text: string; kind: 'success' | 'error' } | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    loadFinanceState().then((loaded) => {
      if (!active) return;
      setTransactions(loaded.transactions);
      setDivisions(loaded.divisions);
      setCategories(loaded.categories);
      setSettings(loaded.settings);
      setIsReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    document.documentElement.setAttribute('lang', settings.language);
  }, [settings.theme, settings.language]);

  const showToast = useCallback(
    (keyOrText: TranslationKey | string, kind: 'success' | 'error' = 'success', isLiteral = false) => {
      const text = isLiteral ? keyOrText : t(settings.language, keyOrText as TranslationKey);
      const id = Date.now();
      setToast({ id, text, kind });
      window.setTimeout(() => {
        setToast((prev) => (prev?.id === id ? null : prev));
      }, 3200);
    },
    [settings.language],
  );

  const toggleTheme = useCallback(() => {
    setSettings((prev) => {
      const next: AppSettings = {
        ...prev,
        theme: prev.theme === 'light' ? 'dark' : 'light',
      };
      void saveSettings(next);
      return next;
    });
  }, []);

  const toggleLanguage = useCallback(() => {
    setSettings((prev) => {
      const next: AppSettings = {
        ...prev,
        language: prev.language === 'ml' ? 'en' : 'ml',
      };
      void saveSettings(next);
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
  }, []);

  const openAddModal = useCallback((defaults?: ModalDefaults) => {
    setEditingTransaction(null);
    setModalDefaults(defaults ?? null);
    setIsTxModalOpen(true);
  }, []);

  const openEditModal = useCallback((tx: Transaction) => {
    setEditingTransaction(tx);
    setModalDefaults(null);
    setIsTxModalOpen(true);
  }, []);

  const closeTxModal = useCallback(() => {
    setIsTxModalOpen(false);
    setEditingTransaction(null);
    setModalDefaults(null);
  }, []);

  const addTransaction = useCallback(
    (input: NewTransactionInput) => {
      const now = new Date().toISOString();
      const created: Transaction = {
        id: makeId('tx'),
        ...input,
        createdAt: now,
        updatedAt: now,
      };
      setTransactions((prev) => {
        const next = [created, ...prev];
        void saveTransactions(next);
        return next;
      });
      showToast('toastSaved');
    },
    [showToast],
  );

  const updateTransaction = useCallback(
    (id: string, input: NewTransactionInput) => {
      const now = new Date().toISOString();
      setTransactions((prev) => {
        const next = prev.map((tx) => (tx.id === id ? { ...tx, ...input, updatedAt: now } : tx));
        void saveTransactions(next);
        return next;
      });
      showToast('toastUpdated');
    },
    [showToast],
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      setTransactions((prev) => {
        const next = prev.filter((tx) => tx.id !== id);
        void saveTransactions(next);
        return next;
      });
      showToast('toastDeleted');
    },
    [showToast],
  );

  const addCategory = useCallback(
    (input: NewCategoryInput): Category => {
      const created: Category = {
        id: makeId('cat'),
        nameMl: input.nameMl.trim(),
        nameEn: input.nameEn.trim() || input.nameMl.trim(),
        type: input.type,
        color: input.color,
        icon: input.icon,
        isCustom: true,
        createdAt: new Date().toISOString(),
      };
      setCategories((prev) => {
        const next = [...prev, created];
        void saveCategories(next);
        return next;
      });
      showToast('toastCategoryAdded');
      return created;
    },
    [showToast],
  );

  const deleteCategory = useCallback(
    (id: string) => {
      if (categories.length <= 1) {
        showToast('cannotDeleteLast', 'error');
        return;
      }
      const nextCategories = categories.filter((c) => c.id !== id);
      const fallbackId = nextCategories[0]?.id ?? '';
      setCategories(nextCategories);
      void saveCategories(nextCategories);

      setTransactions((prev) => {
        const updated = prev.map((tx) =>
          tx.categoryId === id ? { ...tx, categoryId: fallbackId } : tx,
        );
        void saveTransactions(updated);
        return updated;
      });
      showToast('toastDeleted');
    },
    [categories, showToast],
  );

  const addDivision = useCallback(
    (input: NewDivisionInput): FinanceDivision => {
      const created: FinanceDivision = {
        id: makeId('div'),
        nameMl: input.nameMl.trim(),
        nameEn: input.nameEn.trim() || input.nameMl.trim(),
        color: input.color,
        icon: input.icon,
        isCustom: true,
        createdAt: new Date().toISOString(),
      };
      setDivisions((prev) => {
        const next = [...prev, created];
        void saveDivisions(next);
        return next;
      });
      showToast('toastDivisionAdded');
      return created;
    },
    [showToast],
  );

  const deleteDivision = useCallback(
    (id: string) => {
      if (divisions.length <= 1) {
        showToast('cannotDeleteLast', 'error');
        return;
      }
      const nextDivisions = divisions.filter((d) => d.id !== id);
      const fallbackId = nextDivisions[0]?.id ?? '';
      setDivisions(nextDivisions);
      void saveDivisions(nextDivisions);

      setTransactions((prev) => {
        const updated = prev.map((tx) =>
          tx.divisionId === id ? { ...tx, divisionId: fallbackId } : tx,
        );
        void saveTransactions(updated);
        return updated;
      });
      showToast('toastDeleted');
    },
    [divisions, showToast],
  );

  const loadSampleData = useCallback(() => {
    const samples = createSampleTransactions();
    setTransactions((prev) => {
      const next = [...samples, ...prev];
      void saveTransactions(next);
      return next;
    });
    showToast('toastSampleLoaded');
  }, [showToast]);

  const exportBackupJson = useCallback(() => {
    const payload = buildBackupPayload({
      transactions,
      divisions,
      categories,
      settings,
    });
    return JSON.stringify(payload, null, 2);
  }, [transactions, divisions, categories, settings]);

  const importBackupJson = useCallback(
    (jsonText: string): boolean => {
      const parsed = parseBackupPayload(jsonText);
      if (!parsed) {
        showToast('toastInvalidBackup', 'error');
        return false;
      }
      setTransactions(parsed.transactions);
      setDivisions(parsed.divisions);
      setCategories(parsed.categories);
      void saveTransactions(parsed.transactions);
      void saveDivisions(parsed.divisions);
      void saveCategories(parsed.categories);
      if (parsed.settings) {
        setSettings(parsed.settings);
        void saveSettings(parsed.settings);
      }
      showToast('toastBackupImported');
      return true;
    },
    [showToast],
  );

  const clearAllData = useCallback(() => {
    setTransactions([]);
    setDivisions(DEFAULT_DIVISIONS);
    setCategories(DEFAULT_CATEGORIES);
    void saveTransactions([]);
    void saveDivisions(DEFAULT_DIVISIONS);
    void saveCategories(DEFAULT_CATEGORIES);
    showToast('toastDeleted');
  }, [showToast]);

  const filteredTransactions = useMemo(
    () => filterTransactions(transactions, filters, categories, divisions),
    [transactions, filters, categories, divisions],
  );

  const summary = useMemo(() => computeSummary(filteredTransactions), [filteredTransactions]);

  const categorySummary = useMemo(
    () => computeCategorySummary(filteredTransactions, categories),
    [filteredTransactions, categories],
  );

  const divisionSummary = useMemo(
    () => computeDivisionSummary(filteredTransactions, divisions),
    [filteredTransactions, divisions],
  );

  const value: FinanceContextValue = {
    isReady,
    transactions,
    filteredTransactions,
    divisions,
    categories,
    settings,
    filters,
    activeTab,
    summary,
    categorySummary,
    divisionSummary,
    isTxModalOpen,
    editingTransaction,
    modalDefaults,
    toast,
    setActiveTab,
    setFilters,
    resetFilters,
    toggleTheme,
    toggleLanguage,
    openAddModal,
    openEditModal,
    closeTxModal,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addCategory,
    deleteCategory,
    addDivision,
    deleteDivision,
    loadSampleData,
    exportBackupJson,
    importBackupJson,
    clearAllData,
    showToast,
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) {
    throw new Error('useFinance must be used inside FinanceProvider');
  }
  return ctx;
}
