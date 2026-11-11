import { DEFAULT_CATEGORIES, DEFAULT_DIVISIONS, DEFAULT_SETTINGS } from '../data/defaults';
import type {
  AppSettings,
  Category,
  FinanceBackupPayload,
  FinanceDivision,
  StoredPeriodReport,
  Transaction,
} from '../types/finance';

const DB_NAME = 'myfin_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'kv_store';

const KEY_TRANSACTIONS = 'myfin_transactions';
const KEY_DIVISIONS = 'myfin_divisions';
const KEY_CATEGORIES = 'myfin_categories';
const KEY_SETTINGS = 'myfin_settings';
const KEY_ARCHIVES = 'myfin_archives';
const THEME_LOCAL_KEY = 'myfin_theme';

export interface StoredFinanceState {
  transactions: Transaction[];
  divisions: FinanceDivision[];
  categories: Category[];
  settings: AppSettings;
  archives: StoredPeriodReport[];
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDatabase();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbSet<T>(key: string, value: T): Promise<void> {
  const db = await openDatabase();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

function lsGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function lsSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors in fallback mirror
  }
}

async function readKey<T>(key: string): Promise<T | null> {
  const fromIdb = await idbGet<T>(key);
  if (fromIdb !== null) return fromIdb;
  return lsGet<T>(key);
}

async function writeKey<T>(key: string, value: T): Promise<void> {
  lsSet(key, value);
  await idbSet(key, value);
}

export async function loadFinanceState(): Promise<StoredFinanceState> {
  const [transactions, divisions, categories, settings, archives] = await Promise.all([
    readKey<Transaction[]>(KEY_TRANSACTIONS),
    readKey<FinanceDivision[]>(KEY_DIVISIONS),
    readKey<Category[]>(KEY_CATEGORIES),
    readKey<AppSettings>(KEY_SETTINGS),
    readKey<StoredPeriodReport[]>(KEY_ARCHIVES),
  ]);

  let resolvedSettings: AppSettings = settings ?? {
    ...DEFAULT_SETTINGS,
    theme:
      (typeof localStorage !== 'undefined' &&
        (localStorage.getItem(THEME_LOCAL_KEY) as 'light' | 'dark' | null)) ||
      DEFAULT_SETTINGS.theme,
  };

  if (typeof localStorage !== 'undefined' && !localStorage.getItem('myfin_uxboost_theme_v1')) {
    resolvedSettings = { ...resolvedSettings, theme: 'light' };
    try {
      localStorage.setItem(THEME_LOCAL_KEY, 'light');
      localStorage.setItem('myfin_uxboost_theme_v1', '1');
    } catch {
      // Ignore
    }
  }

  return {
    transactions: Array.isArray(transactions) ? transactions : [],
    divisions: Array.isArray(divisions) && divisions.length > 0 ? divisions : DEFAULT_DIVISIONS,
    categories: Array.isArray(categories) && categories.length > 0 ? categories : DEFAULT_CATEGORIES,
    settings: resolvedSettings,
    archives: Array.isArray(archives) ? archives : [],
  };
}

export async function saveTransactions(transactions: Transaction[]): Promise<void> {
  await writeKey(KEY_TRANSACTIONS, transactions);
}

export async function saveDivisions(divisions: FinanceDivision[]): Promise<void> {
  await writeKey(KEY_DIVISIONS, divisions);
}

export async function saveCategories(categories: Category[]): Promise<void> {
  await writeKey(KEY_CATEGORIES, categories);
}

export async function saveArchives(archives: StoredPeriodReport[]): Promise<void> {
  await writeKey(KEY_ARCHIVES, archives);
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    localStorage.setItem(THEME_LOCAL_KEY, settings.theme);
  } catch {
    // Ignore
  }
  await writeKey(KEY_SETTINGS, settings);
}

export function buildBackupPayload(state: StoredFinanceState): FinanceBackupPayload {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions: state.transactions,
    divisions: state.divisions,
    categories: state.categories,
    settings: state.settings,
    archives: state.archives,
  };
}

export function parseBackupPayload(jsonText: string): FinanceBackupPayload | null {
  try {
    const parsed = JSON.parse(jsonText) as Partial<FinanceBackupPayload>;
    if (
      !parsed ||
      parsed.version !== 1 ||
      !Array.isArray(parsed.transactions) ||
      !Array.isArray(parsed.divisions) ||
      !Array.isArray(parsed.categories)
    ) {
      return null;
    }

    const validTransactions = parsed.transactions.filter(
      (tx): tx is Transaction =>
        Boolean(tx) &&
        typeof tx.id === 'string' &&
        (tx.type === 'income' || tx.type === 'expense') &&
        typeof tx.amount === 'number' &&
        Number.isFinite(tx.amount) &&
        typeof tx.date === 'string' &&
        typeof tx.divisionId === 'string' &&
        typeof tx.categoryId === 'string',
    );

    const validDivisions = parsed.divisions.filter(
      (div): div is FinanceDivision =>
        Boolean(div) &&
        typeof div.id === 'string' &&
        (typeof div.nameMl === 'string' || typeof div.nameEn === 'string'),
    );

    const validCategories = parsed.categories.filter(
      (cat): cat is Category =>
        Boolean(cat) &&
        typeof cat.id === 'string' &&
        (typeof cat.nameMl === 'string' || typeof cat.nameEn === 'string'),
    );

    const validArchives = Array.isArray(parsed.archives)
      ? parsed.archives.filter(
          (rep): rep is StoredPeriodReport =>
            Boolean(rep) &&
            typeof rep.id === 'string' &&
            (rep.periodType === 'weekly' || rep.periodType === 'monthly') &&
            Array.isArray(rep.transactions),
        )
      : [];

    return {
      version: 1,
      exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
      transactions: validTransactions,
      divisions: validDivisions.length > 0 ? validDivisions : DEFAULT_DIVISIONS,
      categories: validCategories.length > 0 ? validCategories : DEFAULT_CATEGORIES,
      settings: parsed.settings,
      archives: validArchives,
    };
  } catch {
    return null;
  }
}
