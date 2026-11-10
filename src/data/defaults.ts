import type { AppSettings, Category, FinanceDivision, Transaction } from '../types/finance';

const BASE_TIMESTAMP = '2026-01-01T00:00:00.000Z';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  language: 'ml',
  currency: 'INR',
};

export const DEFAULT_DIVISIONS: FinanceDivision[] = [
  {
    id: 'div-personal',
    nameMl: 'വ്യക്തിഗതം',
    nameEn: 'Personal',
    color: '#0f766e',
    icon: '👤',
    isCustom: false,
    createdAt: BASE_TIMESTAMP,
  },
  {
    id: 'div-family',
    nameMl: 'കുടുംബം',
    nameEn: 'Family',
    color: '#2563eb',
    icon: '🏠',
    isCustom: false,
    createdAt: BASE_TIMESTAMP,
  },
  {
    id: 'div-business',
    nameMl: 'ബിസിനസ്സ്',
    nameEn: 'Business',
    color: '#7c3aed',
    icon: '💼',
    isCustom: false,
    createdAt: BASE_TIMESTAMP,
  },
  {
    id: 'div-savings',
    nameMl: 'സമ്പാദ്യം',
    nameEn: 'Savings',
    color: '#d97706',
    icon: '🏦',
    isCustom: false,
    createdAt: BASE_TIMESTAMP,
  },
];

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'cat-food',
    nameMl: 'ഭക്ഷണം',
    nameEn: 'Food',
    type: 'expense',
    color: '#ea580c',
    icon: '🍽️',
    isCustom: false,
    createdAt: BASE_TIMESTAMP,
  },
  {
    id: 'cat-rent',
    nameMl: 'വാടക',
    nameEn: 'Rent',
    type: 'expense',
    color: '#dc2626',
    icon: '🏘️',
    isCustom: false,
    createdAt: BASE_TIMESTAMP,
  },
  {
    id: 'cat-travel',
    nameMl: 'യാത്ര',
    nameEn: 'Travel',
    type: 'expense',
    color: '#0284c7',
    icon: '🚌',
    isCustom: false,
    createdAt: BASE_TIMESTAMP,
  },
  {
    id: 'cat-bills',
    nameMl: 'ബില്ലുകളും റീചാർജും',
    nameEn: 'Bills & Utilities',
    type: 'expense',
    color: '#ca8a04',
    icon: '⚡',
    isCustom: false,
    createdAt: BASE_TIMESTAMP,
  },
  {
    id: 'cat-shopping',
    nameMl: 'ഷോപ്പിംഗ്',
    nameEn: 'Shopping',
    type: 'expense',
    color: '#db2777',
    icon: '🛍️',
    isCustom: false,
    createdAt: BASE_TIMESTAMP,
  },
  {
    id: 'cat-health',
    nameMl: 'ആരോഗ്യം',
    nameEn: 'Healthcare',
    type: 'expense',
    color: '#16a34a',
    icon: '🏥',
    isCustom: false,
    createdAt: BASE_TIMESTAMP,
  },
  {
    id: 'cat-education',
    nameMl: 'വിദ്യാഭ്യാസം',
    nameEn: 'Education',
    type: 'expense',
    color: '#4f46e5',
    icon: '📚',
    isCustom: false,
    createdAt: BASE_TIMESTAMP,
  },
  {
    id: 'cat-other-exp',
    nameMl: 'മറ്റുള്ളവ',
    nameEn: 'Others',
    type: 'both',
    color: '#64748b',
    icon: '🧾',
    isCustom: false,
    createdAt: BASE_TIMESTAMP,
  },
  {
    id: 'cat-salary',
    nameMl: 'ശമ്പളം',
    nameEn: 'Salary',
    type: 'income',
    color: '#059669',
    icon: '💰',
    isCustom: false,
    createdAt: BASE_TIMESTAMP,
  },
  {
    id: 'cat-business-inc',
    nameMl: 'ബിസിനസ്സ് വരുമാനം',
    nameEn: 'Business Income',
    type: 'income',
    color: '#0d9488',
    icon: '📈',
    isCustom: false,
    createdAt: BASE_TIMESTAMP,
  },
  {
    id: 'cat-freelance',
    nameMl: 'ഫ്രീലാൻസ്',
    nameEn: 'Freelance',
    type: 'income',
    color: '#0891b2',
    icon: '💻',
    isCustom: false,
    createdAt: BASE_TIMESTAMP,
  },
  {
    id: 'cat-gift',
    nameMl: 'സമ്മാനം / ബോണസ്',
    nameEn: 'Gift & Bonus',
    type: 'income',
    color: '#9333ea',
    icon: '🎁',
    isCustom: false,
    createdAt: BASE_TIMESTAMP,
  },
];

export const COLOR_PALETTE = [
  '#0f766e',
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#ea580c',
  '#dc2626',
  '#ca8a04',
  '#16a34a',
  '#0284c7',
  '#4f46e5',
  '#059669',
  '#64748b',
];

export const EMOJI_CHOICES = [
  '🍽️',
  '🏘️',
  '🚌',
  '💰',
  '⚡',
  '🛍️',
  '🏥',
  '📚',
  '💼',
  '🏠',
  '👤',
  '🏦',
  '📈',
  '💻',
  '🎁',
  '☕',
  '⛽',
  '🎬',
  '📱',
  '🧾',
];

function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftDays(base: Date, delta: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + delta);
  return formatIsoDate(d);
}

export function createSampleTransactions(referenceDate = new Date()): Transaction[] {
  const nowIso = new Date().toISOString();
  const entries: Array<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>> = [
    {
      type: 'income',
      amount: 45000,
      date: shiftDays(referenceDate, -12),
      divisionId: 'div-personal',
      categoryId: 'cat-salary',
      note: 'പ്രതിമാസ ശമ്പളം / Monthly Salary',
    },
    {
      type: 'expense',
      amount: 9500,
      date: shiftDays(referenceDate, -10),
      divisionId: 'div-family',
      categoryId: 'cat-rent',
      note: 'വീട്ടുവാടക / House Rent',
    },
    {
      type: 'expense',
      amount: 1450,
      date: shiftDays(referenceDate, -5),
      divisionId: 'div-family',
      categoryId: 'cat-bills',
      note: 'വൈദ്യുതി & ഇന്റർനെറ്റ് ബിൽ',
    },
    {
      type: 'income',
      amount: 8500,
      date: shiftDays(referenceDate, -3),
      divisionId: 'div-business',
      categoryId: 'cat-freelance',
      note: 'വെബ് ഡിസൈൻ പ്രൊജക്റ്റ്',
    },
    {
      type: 'expense',
      amount: 1850,
      date: shiftDays(referenceDate, -2),
      divisionId: 'div-family',
      categoryId: 'cat-food',
      note: 'പലചരക്കും പച്ചക്കറികളും',
    },
    {
      type: 'expense',
      amount: 650,
      date: shiftDays(referenceDate, -1),
      divisionId: 'div-personal',
      categoryId: 'cat-travel',
      note: 'പെട്രോൾ & ബസ് യാത്ര',
    },
    {
      type: 'expense',
      amount: 320,
      date: shiftDays(referenceDate, 0),
      divisionId: 'div-personal',
      categoryId: 'cat-food',
      note: 'ഉച്ചഭക്ഷണവും ചായയും',
    },
    {
      type: 'income',
      amount: 2500,
      date: shiftDays(referenceDate, 0),
      divisionId: 'div-savings',
      categoryId: 'cat-gift',
      note: 'കമ്മീഷൻ / ബോണസ്',
    },
  ];

  return entries.map((item, idx) => ({
    ...item,
    id: `sample-tx-${idx + 1}-${Date.now()}`,
    createdAt: nowIso,
    updatedAt: nowIso,
  }));
}
