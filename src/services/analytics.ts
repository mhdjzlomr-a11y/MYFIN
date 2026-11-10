import { getLocalizedName } from '../i18n/translations';
import type {
  Category,
  CategorySummaryRow,
  DateFilterPreset,
  DivisionSummaryRow,
  FilterState,
  FinanceDivision,
  FinanceSummary,
  Language,
  TimeSeriesData,
  Transaction,
} from '../types/finance';

export function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function resolveDateRange(
  preset: DateFilterPreset,
  customStart = '',
  customEnd = '',
  referenceDate = new Date(),
): { startDate: string; endDate: string } {
  const today = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  );

  if (preset === 'daily') {
    const iso = toLocalIsoDate(today);
    return { startDate: iso, endDate: iso };
  }

  if (preset === 'weekly') {
    const dayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon, ...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      startDate: toLocalIsoDate(monday),
      endDate: toLocalIsoDate(sunday),
    };
  }

  if (preset === 'monthly') {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return {
      startDate: toLocalIsoDate(first),
      endDate: toLocalIsoDate(last),
    };
  }

  if (preset === 'custom') {
    return {
      startDate: customStart,
      endDate: customEnd,
    };
  }

  return { startDate: '', endDate: '' };
}

export function filterTransactions(
  transactions: Transaction[],
  filters: FilterState,
  categories: Category[] = [],
  divisions: FinanceDivision[] = [],
  referenceDate = new Date(),
): Transaction[] {
  const { startDate, endDate } = resolveDateRange(
    filters.preset,
    filters.startDate,
    filters.endDate,
    referenceDate,
  );
  const query = filters.searchQuery.trim().toLowerCase();
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const divisionMap = new Map(divisions.map((d) => [d.id, d]));

  return transactions
    .filter((tx) => {
      if (startDate && tx.date < startDate) return false;
      if (endDate && tx.date > endDate) return false;
      if (filters.divisionId !== 'all' && tx.divisionId !== filters.divisionId) return false;
      if (filters.categoryId !== 'all' && tx.categoryId !== filters.categoryId) return false;
      if (filters.type !== 'all' && tx.type !== filters.type) return false;

      if (query) {
        const cat = categoryMap.get(tx.categoryId);
        const div = divisionMap.get(tx.divisionId);
        const haystack = [
          tx.note,
          cat?.nameMl ?? '',
          cat?.nameEn ?? '',
          div?.nameMl ?? '',
          div?.nameEn ?? '',
          String(tx.amount),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.createdAt.localeCompare(a.createdAt);
    });
}

export function computeSummary(transactions: Transaction[]): FinanceSummary {
  let totalIncome = 0;
  let totalExpense = 0;

  for (const tx of transactions) {
    if (tx.type === 'income') {
      totalIncome += tx.amount;
    } else {
      totalExpense += tx.amount;
    }
  }

  const balance = totalIncome - totalExpense;
  const savingsRate =
    totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;

  return {
    totalIncome,
    totalExpense,
    balance,
    transactionCount: transactions.length,
    savingsRate,
  };
}

export function computeCategorySummary(
  transactions: Transaction[],
  categories: Category[],
): CategorySummaryRow[] {
  const totals = new Map<string, { income: number; expense: number; count: number }>();
  let grandExpense = 0;
  let grandIncome = 0;

  for (const cat of categories) {
    totals.set(cat.id, { income: 0, expense: 0, count: 0 });
  }

  for (const tx of transactions) {
    const bucket = totals.get(tx.categoryId) ?? { income: 0, expense: 0, count: 0 };
    if (tx.type === 'income') {
      bucket.income += tx.amount;
      grandIncome += tx.amount;
    } else {
      bucket.expense += tx.amount;
      grandExpense += tx.amount;
    }
    bucket.count += 1;
    totals.set(tx.categoryId, bucket);
  }

  return categories
    .map((category) => {
      const stats = totals.get(category.id) ?? { income: 0, expense: 0, count: 0 };
      const balance = stats.income - stats.expense;
      return {
        category,
        income: stats.income,
        expense: stats.expense,
        balance,
        count: stats.count,
        expenseSharePercent:
          grandExpense > 0 ? Math.round((stats.expense / grandExpense) * 1000) / 10 : 0,
        incomeSharePercent:
          grandIncome > 0 ? Math.round((stats.income / grandIncome) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => {
      const volA = a.income + a.expense;
      const volB = b.income + b.expense;
      if (volA !== volB) return volB - volA;
      return b.count - a.count;
    });
}

export function computeDivisionSummary(
  transactions: Transaction[],
  divisions: FinanceDivision[],
): DivisionSummaryRow[] {
  const totals = new Map<string, { income: number; expense: number; count: number }>();
  let grandExpense = 0;

  for (const div of divisions) {
    totals.set(div.id, { income: 0, expense: 0, count: 0 });
  }

  for (const tx of transactions) {
    const bucket = totals.get(tx.divisionId) ?? { income: 0, expense: 0, count: 0 };
    if (tx.type === 'income') {
      bucket.income += tx.amount;
    } else {
      bucket.expense += tx.amount;
      grandExpense += tx.amount;
    }
    bucket.count += 1;
    totals.set(tx.divisionId, bucket);
  }

  return divisions
    .map((division) => {
      const stats = totals.get(division.id) ?? { income: 0, expense: 0, count: 0 };
      return {
        division,
        income: stats.income,
        expense: stats.expense,
        balance: stats.income - stats.expense,
        count: stats.count,
        expenseSharePercent:
          grandExpense > 0 ? Math.round((stats.expense / grandExpense) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.income + b.expense - (a.income + a.expense));
}

function formatShortDayLabel(isoDate: string, lang: Language): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const dateObj = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat(lang === 'ml' ? 'ml-IN' : 'en-IN', {
    day: '2-digit',
    month: 'short',
  }).format(dateObj);
}

function formatMonthLabel(ym: string, lang: Language): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  const dateObj = new Date(y, m - 1, 1);
  return new Intl.DateTimeFormat(lang === 'ml' ? 'ml-IN' : 'en-IN', {
    month: 'short',
    year: '2-digit',
  }).format(dateObj);
}

export function computeTimeSeries(
  transactions: Transaction[],
  preset: DateFilterPreset,
  customStart: string,
  customEnd: string,
  lang: Language,
  referenceDate = new Date(),
): TimeSeriesData {
  if (preset === 'daily') {
    const summary = computeSummary(transactions);
    const { startDate } = resolveDateRange('daily', customStart, customEnd, referenceDate);
    return {
      labels: [formatShortDayLabel(startDate, lang)],
      income: [summary.totalIncome],
      expense: [summary.totalExpense],
    };
  }

  if (preset === 'weekly') {
    const { startDate } = resolveDateRange('weekly', customStart, customEnd, referenceDate);
    const [y, m, d] = startDate.split('-').map(Number);
    const monday = new Date(y, m - 1, d);
    const dayKeys: string[] = [];
    for (let i = 0; i < 7; i += 1) {
      const curr = new Date(monday);
      curr.setDate(monday.getDate() + i);
      dayKeys.push(toLocalIsoDate(curr));
    }

    const bucketMap = new Map(dayKeys.map((k) => [k, { income: 0, expense: 0 }]));
    for (const tx of transactions) {
      const b = bucketMap.get(tx.date);
      if (b) {
        if (tx.type === 'income') b.income += tx.amount;
        else b.expense += tx.amount;
      }
    }

    return {
      labels: dayKeys.map((k) => {
        const [yy, mm, dd] = k.split('-').map(Number);
        const dt = new Date(yy, mm - 1, dd);
        return new Intl.DateTimeFormat(lang === 'ml' ? 'ml-IN' : 'en-IN', {
          weekday: 'short',
          day: 'numeric',
        }).format(dt);
      }),
      income: dayKeys.map((k) => bucketMap.get(k)?.income ?? 0),
      expense: dayKeys.map((k) => bucketMap.get(k)?.expense ?? 0),
    };
  }

  if (preset === 'monthly') {
    // Group current month into weeks (W1..W5) for clean readability
    const { startDate, endDate } = resolveDateRange('monthly', customStart, customEnd, referenceDate);
    const weekLabels =
      lang === 'ml'
        ? ['ആഴ്ച 1 (1-7)', 'ആഴ്ച 2 (8-14)', 'ആഴ്ച 3 (15-21)', 'ആഴ്ച 4 (22-28)', 'ആഴ്ച 5 (29+)']
        : ['Week 1 (1-7)', 'Week 2 (8-14)', 'Week 3 (15-21)', 'Week 4 (22-28)', 'Week 5 (29+)'];

    const lastDay = Number(endDate.split('-')[2] || 30);
    const bucketCount = lastDay > 28 ? 5 : 4;
    const incomeBuckets = new Array(bucketCount).fill(0);
    const expenseBuckets = new Array(bucketCount).fill(0);

    for (const tx of transactions) {
      if (tx.date < startDate || tx.date > endDate) continue;
      const dayNum = Number(tx.date.split('-')[2] || 1);
      const idx = Math.min(Math.floor((dayNum - 1) / 7), bucketCount - 1);
      if (tx.type === 'income') incomeBuckets[idx] += tx.amount;
      else expenseBuckets[idx] += tx.amount;
    }

    return {
      labels: weekLabels.slice(0, bucketCount),
      income: incomeBuckets,
      expense: expenseBuckets,
    };
  }

  // 'all' or 'custom': group by day if <= 31 unique days/span, else by YYYY-MM
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) {
    return { labels: [], income: [], expense: [] };
  }

  const firstYm = sorted[0].date.slice(0, 7);
  const lastYm = sorted[sorted.length - 1].date.slice(0, 7);
  const groupByMonth = firstYm !== lastYm;

  const map = new Map<string, { income: number; expense: number }>();
  for (const tx of sorted) {
    const key = groupByMonth ? tx.date.slice(0, 7) : tx.date;
    const entry = map.get(key) ?? { income: 0, expense: 0 };
    if (tx.type === 'income') entry.income += tx.amount;
    else entry.expense += tx.amount;
    map.set(key, entry);
  }

  const keys = Array.from(map.keys()).sort();
  return {
    labels: keys.map((k) => (groupByMonth ? formatMonthLabel(k, lang) : formatShortDayLabel(k, lang))),
    income: keys.map((k) => map.get(k)?.income ?? 0),
    expense: keys.map((k) => map.get(k)?.expense ?? 0),
  };
}

export function getPeriodLabel(
  filters: FilterState,
  lang: Language,
  referenceDate = new Date(),
): string {
  const { startDate, endDate } = resolveDateRange(
    filters.preset,
    filters.startDate,
    filters.endDate,
    referenceDate,
  );
  if (filters.preset === 'all') {
    return lang === 'ml' ? 'മുഴുവൻ കാലയളവും' : 'All Time';
  }
  if (!startDate && !endDate) {
    return lang === 'ml' ? 'കസ്റ്റം തീയതി' : 'Custom Range';
  }
  if (startDate === endDate) return startDate;
  return `${startDate || '...'} → ${endDate || '...'}`;
}

export function resolveNamesForDisplay(
  tx: Transaction,
  categories: Category[],
  divisions: FinanceDivision[],
  lang: Language,
): { categoryName: string; divisionName: string } {
  const cat = categories.find((c) => c.id === tx.categoryId);
  const div = divisions.find((d) => d.id === tx.divisionId);
  return {
    categoryName: getLocalizedName(cat, lang, lang === 'ml' ? 'മറ്റുള്ളവ' : 'Other'),
    divisionName: getLocalizedName(div, lang, lang === 'ml' ? 'പൊതുവായത്' : 'General'),
  };
}
