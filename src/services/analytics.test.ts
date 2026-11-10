import { describe, expect, it } from 'vitest';
import { DEFAULT_CATEGORIES, DEFAULT_DIVISIONS } from '../data/defaults';
import {
  computeCategorySummary,
  computeDivisionSummary,
  computeSummary,
  computeTimeSeries,
  filterTransactions,
  resolveDateRange,
} from './analytics';
import type { FilterState, Transaction } from '../types/finance';

const REF_DATE = new Date(2026, 10, 10); // Tue, 2026-11-10

const SAMPLE_TXS: Transaction[] = [
  {
    id: '1',
    type: 'income',
    amount: 30000,
    date: '2026-11-10',
    divisionId: 'div-personal',
    categoryId: 'cat-salary',
    note: 'ശമ്പളം',
    createdAt: '2026-11-10T09:00:00Z',
    updatedAt: '2026-11-10T09:00:00Z',
  },
  {
    id: '2',
    type: 'expense',
    amount: 500,
    date: '2026-11-10',
    divisionId: 'div-personal',
    categoryId: 'cat-food',
    note: 'ഉച്ചഭക്ഷണം',
    createdAt: '2026-11-10T12:00:00Z',
    updatedAt: '2026-11-10T12:00:00Z',
  },
  {
    id: '3',
    type: 'expense',
    amount: 8000,
    date: '2026-11-09',
    divisionId: 'div-family',
    categoryId: 'cat-rent',
    note: 'വാടക',
    createdAt: '2026-11-09T10:00:00Z',
    updatedAt: '2026-11-09T10:00:00Z',
  },
  {
    id: '4',
    type: 'expense',
    amount: 1200,
    date: '2026-10-25',
    divisionId: 'div-business',
    categoryId: 'cat-travel',
    note: 'യാത്ര',
    createdAt: '2026-10-25T10:00:00Z',
    updatedAt: '2026-10-25T10:00:00Z',
  },
];

describe('analytics service', () => {
  it('resolves daily, weekly, and monthly date ranges accurately', () => {
    expect(resolveDateRange('daily', '', '', REF_DATE)).toEqual({
      startDate: '2026-11-10',
      endDate: '2026-11-10',
    });

    // 2026-11-10 is Tuesday -> Mon 2026-11-09 .. Sun 2026-11-15
    expect(resolveDateRange('weekly', '', '', REF_DATE)).toEqual({
      startDate: '2026-11-09',
      endDate: '2026-11-15',
    });

    expect(resolveDateRange('monthly', '', '', REF_DATE)).toEqual({
      startDate: '2026-11-01',
      endDate: '2026-11-30',
    });
  });

  it('filters by preset, division, category, type, and search query', () => {
    const baseFilter: FilterState = {
      preset: 'daily',
      startDate: '',
      endDate: '',
      divisionId: 'all',
      categoryId: 'all',
      type: 'all',
      searchQuery: '',
    };

    const daily = filterTransactions(
      SAMPLE_TXS,
      baseFilter,
      DEFAULT_CATEGORIES,
      DEFAULT_DIVISIONS,
      REF_DATE,
    );
    expect(daily.map((t) => t.id)).toEqual(['2', '1']);

    const monthlyFamily = filterTransactions(
      SAMPLE_TXS,
      { ...baseFilter, preset: 'monthly', divisionId: 'div-family' },
      DEFAULT_CATEGORIES,
      DEFAULT_DIVISIONS,
      REF_DATE,
    );
    expect(monthlyFamily.map((t) => t.id)).toEqual(['3']);

    const customOct = filterTransactions(
      SAMPLE_TXS,
      {
        ...baseFilter,
        preset: 'custom',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        searchQuery: 'യാത്ര',
      },
      DEFAULT_CATEGORIES,
      DEFAULT_DIVISIONS,
      REF_DATE,
    );
    expect(customOct.map((t) => t.id)).toEqual(['4']);
  });

  it('computes summary, category rollups, division rollups, and time series', () => {
    const summary = computeSummary(SAMPLE_TXS);
    expect(summary.totalIncome).toBe(30000);
    expect(summary.totalExpense).toBe(9700);
    expect(summary.balance).toBe(20300);
    expect(summary.transactionCount).toBe(4);
    expect(summary.savingsRate).toBe(68);

    const catSummary = computeCategorySummary(SAMPLE_TXS, DEFAULT_CATEGORIES);
    const rentRow = catSummary.find((r) => r.category.id === 'cat-rent');
    expect(rentRow?.expense).toBe(8000);
    expect(rentRow?.balance).toBe(-8000);

    const divSummary = computeDivisionSummary(SAMPLE_TXS, DEFAULT_DIVISIONS);
    const personalRow = divSummary.find((r) => r.division.id === 'div-personal');
    expect(personalRow?.income).toBe(30000);
    expect(personalRow?.expense).toBe(500);
    expect(personalRow?.balance).toBe(29500);

    const weeklySeries = computeTimeSeries(
      SAMPLE_TXS.slice(0, 3),
      'weekly',
      '',
      '',
      'en',
      REF_DATE,
    );
    expect(weeklySeries.labels).toHaveLength(7);
    expect(weeklySeries.income[1]).toBe(30000); // Tuesday
    expect(weeklySeries.expense[0]).toBe(8000); // Monday
    expect(weeklySeries.expense[1]).toBe(500); // Tuesday
  });
});
