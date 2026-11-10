import { describe, expect, it } from 'vitest';
import { DEFAULT_CATEGORIES, DEFAULT_DIVISIONS } from '../data/defaults';
import { buildCsvContent } from './export';
import { parseBackupPayload } from './storage';
import type { Transaction } from '../types/finance';

describe('export and backup services', () => {
  it('generates UTF-8 BOM CSV with Malayalam headers, escaped notes, and totals', () => {
    const txs: Transaction[] = [
      {
        id: 't1',
        type: 'income',
        amount: 15000,
        date: '2026-11-10',
        divisionId: 'div-personal',
        categoryId: 'cat-salary',
        note: 'മാസ ശമ്പളം, ബോണസ്',
        createdAt: '2026-11-10T00:00:00Z',
        updatedAt: '2026-11-10T00:00:00Z',
      },
      {
        id: 't2',
        type: 'expense',
        amount: 250,
        date: '2026-11-10',
        divisionId: 'div-personal',
        categoryId: 'cat-food',
        note: 'ഭക്ഷണം "ഹോട്ടൽ"',
        createdAt: '2026-11-10T00:00:00Z',
        updatedAt: '2026-11-10T00:00:00Z',
      },
    ];

    const csv = buildCsvContent(txs, DEFAULT_CATEGORIES, DEFAULT_DIVISIONS, 'ml');
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('തീയതി,തരം,ഫിനാൻസ് ഡിവിഷൻ,വിഭാഗം (കാറ്റഗറി),തുക (₹),കുറിപ്പ്');
    expect(csv).toContain('"മാസ ശമ്പളം, ബോണസ്"');
    expect(csv).toContain('"ഭക്ഷണം ""ഹോട്ടൽ"""');
    expect(csv).toContain('ആകെ വരവ്,,,,15000,');
    expect(csv).toContain('ആകെ ചിലവ്,,,,250,');
    expect(csv).toContain('ബാലൻസ്,,,,14750,');
  });

  it('validates and parses JSON backup payloads safely', () => {
    const valid = JSON.stringify({
      version: 1,
      exportedAt: '2026-11-10T00:00:00Z',
      transactions: [
        {
          id: 'tx-1',
          type: 'expense',
          amount: 100,
          date: '2026-11-10',
          divisionId: 'div-personal',
          categoryId: 'cat-food',
          note: 'ചായ',
          createdAt: '2026-11-10T00:00:00Z',
          updatedAt: '2026-11-10T00:00:00Z',
        },
      ],
      divisions: DEFAULT_DIVISIONS,
      categories: DEFAULT_CATEGORIES,
    });

    const parsed = parseBackupPayload(valid);
    expect(parsed).not.toBeNull();
    expect(parsed?.transactions).toHaveLength(1);
    expect(parseBackupPayload('{invalid')).toBeNull();
    expect(parseBackupPayload('{"version":2}')).toBeNull();
  });
});
