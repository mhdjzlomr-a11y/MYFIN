import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_DIVISIONS,
  DEFAULT_SETTINGS,
  createSampleTransactions,
} from '../data/defaults';
import { t, type TranslationKey } from '../i18n/translations';
import {
  buildStoredPeriodReport,
  computeCategorySummary,
  computeDivisionSummary,
  computeSummary,
  filterTransactions,
  getPeriodTransactions,
} from '../services/analytics';
import {
  clearFirebaseConfig,
  loadSavedFirebaseConfig,
  mergeLocalWithCloudOnSignIn,
  saveFirebaseConfig,
  signInWithGoogleCloud,
  signOutGoogleCloud,
  subscribeAuthUser,
  subscribeCloudFinanceData,
  syncEntityDelete,
  syncEntityUpsert,
} from '../services/cloudSync';
import {
  buildBackupPayload,
  loadFinanceState,
  parseBackupPayload,
  saveArchives,
  saveCategories,
  saveDivisions,
  saveSettings,
  saveTransactions,
} from '../services/storage';
import type {
  ActiveTab,
  AppSettings,
  ArchivePeriodType,
  Category,
  CategorySummaryRow,
  CategoryType,
  CloudSyncStatus,
  CloudUser,
  DivisionSummaryRow,
  FilterState,
  FinanceDivision,
  FinanceSummary,
  FirebaseSyncConfig,
  StoredPeriodReport,
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
  isSyncModalOpen: boolean;
  openSyncModal: () => void;
  closeSyncModal: () => void;
  syncConfig: FirebaseSyncConfig | null;
  cloudUser: CloudUser | null;
  syncStatus: CloudSyncStatus;
  syncError: string | null;
  saveAndConnectCloudConfig: (config: FirebaseSyncConfig) => void;
  disconnectAndClearCloudConfig: () => void;
  signInWithGoogle: () => Promise<void>;
  signOutGoogle: () => Promise<void>;
  forceSyncNow: () => Promise<void>;
  archives: StoredPeriodReport[];
  storePeriodReport: (periodType: ArchivePeriodType) => StoredPeriodReport | null;
  startNewPeriod: (periodType: ArchivePeriodType) => void;
  deleteStoredReport: (id: string) => void;
}

function sortArchivesNewest(list: StoredPeriodReport[]): StoredPeriodReport[] {
  return [...list].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

function sortTransactionsNewest(list: Transaction[]): Transaction[] {
  return [...list].sort((a, b) => {
    const byDate = b.date.localeCompare(a.date);
    if (byDate !== 0) return byDate;
    return (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
  });
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
  const [archives, setArchives] = useState<StoredPeriodReport[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [modalDefaults, setModalDefaults] = useState<ModalDefaults | null>(null);
  const [toast, setToast] = useState<{ id: number; text: string; kind: 'success' | 'error' } | null>(
    null,
  );
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncConfig, setSyncConfig] = useState<FirebaseSyncConfig | null>(() =>
    loadSavedFirebaseConfig(),
  );
  const [cloudUser, setCloudUser] = useState<CloudUser | null>(null);
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>(() =>
    syncConfig ? 'signed_out' : 'unconfigured',
  );
  const [syncError, setSyncError] = useState<string | null>(null);

  const transactionsRef = useRef(transactions);
  transactionsRef.current = transactions;
  const divisionsRef = useRef(divisions);
  divisionsRef.current = divisions;
  const categoriesRef = useRef(categories);
  categoriesRef.current = categories;
  const archivesRef = useRef(archives);
  archivesRef.current = archives;

  useEffect(() => {
    let active = true;
    loadFinanceState().then((loaded) => {
      if (!active) return;
      setTransactions(loaded.transactions);
      setDivisions(loaded.divisions);
      setCategories(loaded.categories);
      setArchives(sortArchivesNewest(loaded.archives));
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

  const handleSyncFailure = useCallback((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    setSyncError(message);
    setSyncStatus('error');
  }, []);

  useEffect(() => {
    if (!syncConfig) {
      setCloudUser(null);
      setSyncStatus('unconfigured');
      return;
    }

    let active = true;
    let unsub: (() => void) | undefined;

    setSyncStatus((prev) => (prev === 'synced' || prev === 'syncing' ? prev : 'connecting'));

    subscribeAuthUser(
      syncConfig,
      (user) => {
        if (!active) return;
        setCloudUser(user);
        setSyncError(null);
        if (!user) {
          setSyncStatus('signed_out');
        }
      },
      (message) => {
        if (!active) return;
        setSyncError(message);
        setSyncStatus('error');
      },
    )
      .then((unsubscribe) => {
        if (!active) {
          unsubscribe();
          return;
        }
        unsub = unsubscribe;
      })
      .catch((err) => {
        if (active) handleSyncFailure(err);
      });

    return () => {
      active = false;
      unsub?.();
    };
  }, [syncConfig, handleSyncFailure]);

  useEffect(() => {
    if (!isReady || !syncConfig || !cloudUser) return;

    let active = true;
    let unsubData: (() => void) | undefined;

    const applyMergedState = (merged: {
      transactions: Transaction[];
      divisions: FinanceDivision[];
      categories: Category[];
      archives: StoredPeriodReport[];
    }) => {
      const sortedTxs = sortTransactionsNewest(merged.transactions);
      const sortedArcs = sortArchivesNewest(merged.archives);
      setTransactions(sortedTxs);
      setDivisions(merged.divisions);
      setCategories(merged.categories);
      setArchives(sortedArcs);
      void saveTransactions(sortedTxs);
      void saveDivisions(merged.divisions);
      void saveCategories(merged.categories);
      void saveArchives(sortedArcs);
    };

    setSyncStatus('syncing');
    setSyncError(null);

    mergeLocalWithCloudOnSignIn(syncConfig, cloudUser.uid, {
      transactions: transactionsRef.current,
      divisions: divisionsRef.current,
      categories: categoriesRef.current,
      archives: archivesRef.current,
    })
      .then(async (merged) => {
        if (!active) return;
        applyMergedState(merged);

        const unsubscribe = await subscribeCloudFinanceData(syncConfig, cloudUser.uid, {
          onTransactions: (items) => {
            if (!active) return;
            const sorted = sortTransactionsNewest(items);
            setTransactions(sorted);
            void saveTransactions(sorted);
            setSyncStatus('synced');
          },
          onDivisions: (items) => {
            if (!active) return;
            setDivisions(items);
            void saveDivisions(items);
            setSyncStatus('synced');
          },
          onCategories: (items) => {
            if (!active) return;
            setCategories(items);
            void saveCategories(items);
            setSyncStatus('synced');
          },
          onArchives: (items) => {
            if (!active) return;
            const sorted = sortArchivesNewest(items);
            setArchives(sorted);
            void saveArchives(sorted);
            setSyncStatus('synced');
          },
          onError: (msg) => {
            if (!active) return;
            setSyncError(msg);
            setSyncStatus('error');
          },
        });

        if (!active) {
          unsubscribe();
          return;
        }
        unsubData = unsubscribe;
        setSyncStatus('synced');
      })
      .catch((err) => {
        if (active) handleSyncFailure(err);
      });

    return () => {
      active = false;
      unsubData?.();
    };
  }, [isReady, syncConfig, cloudUser, handleSyncFailure]);

  const syncUpsertIfConnected = useCallback(
    (
      collectionName: 'transactions' | 'divisions' | 'categories' | 'archives',
      id: string,
      payload: Transaction | FinanceDivision | Category | StoredPeriodReport,
    ) => {
      if (!syncConfig || !cloudUser) return;
      void syncEntityUpsert(syncConfig, cloudUser.uid, collectionName, id, payload).catch(
        handleSyncFailure,
      );
    },
    [syncConfig, cloudUser, handleSyncFailure],
  );

  const syncDeleteIfConnected = useCallback(
    (collectionName: 'transactions' | 'divisions' | 'categories' | 'archives', id: string) => {
      if (!syncConfig || !cloudUser) return;
      void syncEntityDelete(syncConfig, cloudUser.uid, collectionName, id).catch(handleSyncFailure);
    },
    [syncConfig, cloudUser, handleSyncFailure],
  );

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
      syncUpsertIfConnected('transactions', created.id, created);
      showToast('toastSaved');
    },
    [showToast, syncUpsertIfConnected],
  );

  const updateTransaction = useCallback(
    (id: string, input: NewTransactionInput) => {
      const now = new Date().toISOString();
      const existing = transactionsRef.current.find((tx) => tx.id === id);
      const updatedTx: Transaction | null = existing
        ? { ...existing, ...input, updatedAt: now }
        : null;
      setTransactions((prev) => {
        const next = prev.map((tx) => (tx.id === id ? { ...tx, ...input, updatedAt: now } : tx));
        void saveTransactions(next);
        return next;
      });
      if (updatedTx) {
        syncUpsertIfConnected('transactions', id, updatedTx);
      }
      showToast('toastUpdated');
    },
    [showToast, syncUpsertIfConnected],
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      setTransactions((prev) => {
        const next = prev.filter((tx) => tx.id !== id);
        void saveTransactions(next);
        return next;
      });
      syncDeleteIfConnected('transactions', id);
      showToast('toastDeleted');
    },
    [showToast, syncDeleteIfConnected],
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
      syncUpsertIfConnected('categories', created.id, created);
      showToast('toastCategoryAdded');
      return created;
    },
    [showToast, syncUpsertIfConnected],
  );

  const deleteCategory = useCallback(
    (id: string) => {
      if (categories.length <= 1) {
        showToast('cannotDeleteLast', 'error');
        return;
      }
      const nextCategories = categories.filter((c) => c.id !== id);
      const fallbackId = nextCategories[0]?.id ?? '';
      const now = new Date().toISOString();
      setCategories(nextCategories);
      void saveCategories(nextCategories);
      syncDeleteIfConnected('categories', id);

      const impacted = transactionsRef.current
        .filter((tx) => tx.categoryId === id)
        .map((tx) => ({ ...tx, categoryId: fallbackId, updatedAt: now }));

      setTransactions((prev) => {
        const updated = prev.map((tx) =>
          tx.categoryId === id ? { ...tx, categoryId: fallbackId, updatedAt: now } : tx,
        );
        void saveTransactions(updated);
        return updated;
      });
      for (const tx of impacted) {
        syncUpsertIfConnected('transactions', tx.id, tx);
      }
      showToast('toastDeleted');
    },
    [categories, showToast, syncDeleteIfConnected, syncUpsertIfConnected],
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
      syncUpsertIfConnected('divisions', created.id, created);
      showToast('toastDivisionAdded');
      return created;
    },
    [showToast, syncUpsertIfConnected],
  );

  const deleteDivision = useCallback(
    (id: string) => {
      if (divisions.length <= 1) {
        showToast('cannotDeleteLast', 'error');
        return;
      }
      const nextDivisions = divisions.filter((d) => d.id !== id);
      const fallbackId = nextDivisions[0]?.id ?? '';
      const now = new Date().toISOString();
      setDivisions(nextDivisions);
      void saveDivisions(nextDivisions);
      syncDeleteIfConnected('divisions', id);

      const impacted = transactionsRef.current
        .filter((tx) => tx.divisionId === id)
        .map((tx) => ({ ...tx, divisionId: fallbackId, updatedAt: now }));

      setTransactions((prev) => {
        const updated = prev.map((tx) =>
          tx.divisionId === id ? { ...tx, divisionId: fallbackId, updatedAt: now } : tx,
        );
        void saveTransactions(updated);
        return updated;
      });
      for (const tx of impacted) {
        syncUpsertIfConnected('transactions', tx.id, tx);
      }
      showToast('toastDeleted');
    },
    [divisions, showToast, syncDeleteIfConnected, syncUpsertIfConnected],
  );

  const loadSampleData = useCallback(() => {
    const samples = createSampleTransactions();
    setTransactions((prev) => {
      const next = [...samples, ...prev];
      void saveTransactions(next);
      return next;
    });
    for (const tx of samples) {
      syncUpsertIfConnected('transactions', tx.id, tx);
    }
    showToast('toastSampleLoaded');
  }, [showToast, syncUpsertIfConnected]);

  const exportBackupJson = useCallback(() => {
    const payload = buildBackupPayload({
      transactions,
      divisions,
      categories,
      settings,
      archives,
    });
    return JSON.stringify(payload, null, 2);
  }, [transactions, divisions, categories, settings, archives]);

  const importBackupJson = useCallback(
    (jsonText: string): boolean => {
      const parsed = parseBackupPayload(jsonText);
      if (!parsed) {
        showToast('toastInvalidBackup', 'error');
        return false;
      }
      const importedArchives = sortArchivesNewest(parsed.archives ?? []);
      setTransactions(parsed.transactions);
      setDivisions(parsed.divisions);
      setCategories(parsed.categories);
      setArchives(importedArchives);
      void saveTransactions(parsed.transactions);
      void saveDivisions(parsed.divisions);
      void saveCategories(parsed.categories);
      void saveArchives(importedArchives);
      if (parsed.settings) {
        setSettings(parsed.settings);
        void saveSettings(parsed.settings);
      }
      for (const d of parsed.divisions) {
        syncUpsertIfConnected('divisions', d.id, d);
      }
      for (const c of parsed.categories) {
        syncUpsertIfConnected('categories', c.id, c);
      }
      for (const tx of parsed.transactions) {
        syncUpsertIfConnected('transactions', tx.id, tx);
      }
      for (const arc of importedArchives) {
        syncUpsertIfConnected('archives', arc.id, arc);
      }
      showToast('toastBackupImported');
      return true;
    },
    [showToast, syncUpsertIfConnected],
  );

  const clearAllData = useCallback(() => {
    const oldTxIds = transactionsRef.current.map((tx) => tx.id);
    const oldArcIds = archivesRef.current.map((a) => a.id);
    const customDivIds = divisionsRef.current.filter((d) => d.isCustom).map((d) => d.id);
    const customCatIds = categoriesRef.current.filter((c) => c.isCustom).map((c) => c.id);

    setTransactions([]);
    setDivisions(DEFAULT_DIVISIONS);
    setCategories(DEFAULT_CATEGORIES);
    setArchives([]);
    void saveTransactions([]);
    void saveDivisions(DEFAULT_DIVISIONS);
    void saveCategories(DEFAULT_CATEGORIES);
    void saveArchives([]);

    for (const id of oldTxIds) syncDeleteIfConnected('transactions', id);
    for (const id of oldArcIds) syncDeleteIfConnected('archives', id);
    for (const id of customDivIds) syncDeleteIfConnected('divisions', id);
    for (const id of customCatIds) syncDeleteIfConnected('categories', id);

    showToast('toastDeleted');
  }, [showToast, syncDeleteIfConnected]);

  const archiveAndPersistPeriod = useCallback(
    (periodType: ArchivePeriodType): StoredPeriodReport | null => {
      const report = buildStoredPeriodReport({
        id: makeId('rep'),
        periodType,
        transactions: transactionsRef.current,
        categories: categoriesRef.current,
        divisions: divisionsRef.current,
      });
      if (report.transactionCount === 0) {
        return null;
      }
      setArchives((prev) => {
        const next = sortArchivesNewest([report, ...prev]);
        void saveArchives(next);
        return next;
      });
      syncUpsertIfConnected('archives', report.id, report);
      return report;
    },
    [syncUpsertIfConnected],
  );

  const storePeriodReport = useCallback(
    (periodType: ArchivePeriodType): StoredPeriodReport | null => {
      const saved = archiveAndPersistPeriod(periodType);
      if (!saved) {
        showToast('toastNoEntriesToArchive', 'error');
        return null;
      }
      showToast('toastReportStored');
      return saved;
    },
    [archiveAndPersistPeriod, showToast],
  );

  const startNewPeriod = useCallback(
    (periodType: ArchivePeriodType) => {
      const { entries } = getPeriodTransactions(transactionsRef.current, periodType);
      if (entries.length > 0) {
        archiveAndPersistPeriod(periodType);
        const removeIds = new Set(entries.map((tx) => tx.id));
        setTransactions((prev) => {
          const remaining = prev.filter((tx) => !removeIds.has(tx.id));
          void saveTransactions(remaining);
          return remaining;
        });
        for (const id of removeIds) {
          syncDeleteIfConnected('transactions', id);
        }
      }
      setFilters((prev) => ({
        ...prev,
        preset: periodType,
        startDate: '',
        endDate: '',
        divisionId: 'all',
        categoryId: 'all',
        type: 'all',
        searchQuery: '',
      }));
      showToast('toastNewPeriodStarted');
    },
    [archiveAndPersistPeriod, syncDeleteIfConnected, showToast],
  );

  const deleteStoredReport = useCallback(
    (id: string) => {
      setArchives((prev) => {
        const next = prev.filter((a) => a.id !== id);
        void saveArchives(next);
        return next;
      });
      syncDeleteIfConnected('archives', id);
      showToast('toastDeleted');
    },
    [syncDeleteIfConnected, showToast],
  );

  const openSyncModal = useCallback(() => setIsSyncModalOpen(true), []);
  const closeSyncModal = useCallback(() => setIsSyncModalOpen(false), []);

  const saveAndConnectCloudConfig = useCallback(
    (config: FirebaseSyncConfig) => {
      saveFirebaseConfig(config);
      setSyncError(null);
      setSyncConfig(config);
      setSyncStatus('connecting');
      showToast('cloudSyncSuccess');
    },
    [showToast],
  );

  const disconnectAndClearCloudConfig = useCallback(() => {
    if (syncConfig) {
      void signOutGoogleCloud(syncConfig).catch(() => undefined);
    }
    clearFirebaseConfig();
    setCloudUser(null);
    setSyncConfig(null);
    setSyncError(null);
    setSyncStatus('unconfigured');
  }, [syncConfig]);

  const signInWithGoogle = useCallback(async () => {
    if (!syncConfig) return;
    setSyncError(null);
    setSyncStatus('connecting');
    try {
      await signInWithGoogleCloud(syncConfig);
    } catch (err) {
      handleSyncFailure(err);
    }
  }, [syncConfig, handleSyncFailure]);

  const signOutGoogle = useCallback(async () => {
    if (!syncConfig) return;
    try {
      await signOutGoogleCloud(syncConfig);
      setCloudUser(null);
      setSyncError(null);
      setSyncStatus('signed_out');
    } catch (err) {
      handleSyncFailure(err);
    }
  }, [syncConfig, handleSyncFailure]);

  const forceSyncNow = useCallback(async () => {
    if (!syncConfig || !cloudUser) return;
    setSyncStatus('syncing');
    setSyncError(null);
    try {
      const merged = await mergeLocalWithCloudOnSignIn(syncConfig, cloudUser.uid, {
        transactions: transactionsRef.current,
        divisions: divisionsRef.current,
        categories: categoriesRef.current,
        archives: archivesRef.current,
      });
      const sortedTxs = sortTransactionsNewest(merged.transactions);
      const sortedArcs = sortArchivesNewest(merged.archives);
      setTransactions(sortedTxs);
      setDivisions(merged.divisions);
      setCategories(merged.categories);
      setArchives(sortedArcs);
      void saveTransactions(sortedTxs);
      void saveDivisions(merged.divisions);
      void saveCategories(merged.categories);
      void saveArchives(sortedArcs);
      setSyncStatus('synced');
    } catch (err) {
      handleSyncFailure(err);
    }
  }, [syncConfig, cloudUser, handleSyncFailure]);

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
    isSyncModalOpen,
    openSyncModal,
    closeSyncModal,
    syncConfig,
    cloudUser,
    syncStatus,
    syncError,
    saveAndConnectCloudConfig,
    disconnectAndClearCloudConfig,
    signInWithGoogle,
    signOutGoogle,
    forceSyncNow,
    archives,
    storePeriodReport,
    startNewPeriod,
    deleteStoredReport,
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
