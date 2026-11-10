import {
  Archive,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Edit3,
  FileDown,
  FileSpreadsheet,
  Plus,
  Printer,
  Trash2,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDisplayDate, getLocalizedName, t } from '../i18n/translations';
import {
  computeCategorySummary,
  computeSummary,
  resolveDateRange,
  toLocalIsoDate,
} from '../services/analytics';
import { exportReportElementToPdf, exportTransactionsToCsv } from '../services/export';
import type { Category, FinanceDivision } from '../types/finance';
import { PrintableReportSheet } from './ReportsExport';

type CalendarScope = 'day' | 'week' | 'month' | 'overall';

interface CalendarDayCell {
  iso: string;
  dayNum: number;
  inCurrentMonth: boolean;
}

interface CalendarWeekRow {
  weekIndex: number;
  startDate: string;
  endDate: string;
  days: CalendarDayCell[];
}

function parseIsoLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y || 2026, (m || 1) - 1, d || 1);
}

function shiftYearMonth(ym: string, deltaMonths: number): string {
  const [y, m] = ym.split('-').map(Number);
  const dt = new Date(y || 2026, (m || 1) - 1 + deltaMonths, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

function buildMonthWeeks(ym: string): CalendarWeekRow[] {
  const [y, m] = ym.split('-').map(Number);
  const firstOfMonth = new Date(y, m - 1, 1);
  const lastOfMonth = new Date(y, m, 0);

  // Align Monday = 0 .. Sunday = 6
  const startOffset = firstOfMonth.getDay() === 0 ? 6 : firstOfMonth.getDay() - 1;
  const gridStart = new Date(y, m - 1, 1 - startOffset);

  const weeks: CalendarWeekRow[] = [];
  const cursor = new Date(gridStart);
  let weekIndex = 1;

  while (cursor <= lastOfMonth || weeks.length < 4) {
    const days: CalendarDayCell[] = [];
    for (let i = 0; i < 7; i += 1) {
      days.push({
        iso: toLocalIsoDate(cursor),
        dayNum: cursor.getDate(),
        inCurrentMonth: cursor.getMonth() === m - 1 && cursor.getFullYear() === y,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push({
      weekIndex,
      startDate: days[0].iso,
      endDate: days[6].iso,
      days,
    });
    weekIndex += 1;
    if (cursor > lastOfMonth) break;
  }

  return weeks;
}

const WEEKDAY_LABELS_ML = ['തി', 'ചൊ', 'ബു', 'വ്യാ', 'വെ', 'ശ', 'ഞാ'];
const WEEKDAY_LABELS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function CalendarReports() {
  const {
    transactions,
    allMergedTransactions,
    archives,
    categories,
    divisions,
    settings,
    openAddModal,
    openEditModal,
    deleteTransaction,
    storePeriodReport,
    showToast,
  } = useFinance();

  const lang = settings.language;
  const todayIso = toLocalIsoDate(new Date());
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [viewMonth, setViewMonth] = useState(todayIso.slice(0, 7));
  const [scope, setScope] = useState<CalendarScope>('day');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const pdfTargetRef = useRef<HTMLDivElement>(null);

  const activeIdSet = useMemo(() => new Set(transactions.map((tx) => tx.id)), [transactions]);

  const mergedCategories = useMemo<Category[]>(() => {
    const map = new Map(categories.map((c) => [c.id, c]));
    for (const arc of archives) {
      for (const b of arc.categoryBreakdown) {
        if (!map.has(b.id)) {
          map.set(b.id, {
            id: b.id,
            nameMl: b.nameMl,
            nameEn: b.nameEn,
            icon: b.icon,
            color: b.color,
            type: 'both',
            isCustom: true,
            createdAt: arc.createdAt,
          });
        }
      }
    }
    return Array.from(map.values());
  }, [categories, archives]);

  const mergedDivisions = useMemo<FinanceDivision[]>(() => {
    const map = new Map(divisions.map((d) => [d.id, d]));
    for (const arc of archives) {
      for (const b of arc.divisionBreakdown) {
        if (!map.has(b.id)) {
          map.set(b.id, {
            id: b.id,
            nameMl: b.nameMl,
            nameEn: b.nameEn,
            icon: b.icon,
            color: b.color,
            isCustom: true,
            createdAt: arc.createdAt,
          });
        }
      }
    }
    return Array.from(map.values());
  }, [divisions, archives]);

  const categoryMap = useMemo(
    () => new Map(mergedCategories.map((c) => [c.id, c])),
    [mergedCategories],
  );
  const divisionMap = useMemo(
    () => new Map(mergedDivisions.map((d) => [d.id, d])),
    [mergedDivisions],
  );

  const weeks = useMemo(() => buildMonthWeeks(viewMonth), [viewMonth]);

  const dayTotalsMap = useMemo(() => {
    const map = new Map<string, { income: number; expense: number; count: number }>();
    for (const tx of allMergedTransactions) {
      const bucket = map.get(tx.date) ?? { income: 0, expense: 0, count: 0 };
      if (tx.type === 'income') bucket.income += tx.amount;
      else bucket.expense += tx.amount;
      bucket.count += 1;
      map.set(tx.date, bucket);
    }
    return map;
  }, [allMergedTransactions]);

  const activeRange = useMemo(() => {
    if (scope === 'day') {
      return { startDate: selectedDate, endDate: selectedDate };
    }
    if (scope === 'week') {
      return resolveDateRange('weekly', '', '', parseIsoLocal(selectedDate));
    }
    if (scope === 'month') {
      const [y, m] = viewMonth.split('-').map(Number);
      const last = new Date(y, m, 0);
      return {
        startDate: `${viewMonth}-01`,
        endDate: toLocalIsoDate(last),
      };
    }
    return { startDate: '', endDate: '' };
  }, [scope, selectedDate, viewMonth]);

  const scopedTransactions = useMemo(
    () =>
      allMergedTransactions.filter((tx) => {
        if (activeRange.startDate && tx.date < activeRange.startDate) return false;
        if (activeRange.endDate && tx.date > activeRange.endDate) return false;
        return true;
      }),
    [allMergedTransactions, activeRange],
  );

  const scopedSummary = useMemo(() => computeSummary(scopedTransactions), [scopedTransactions]);
  const scopedCategorySummary = useMemo(
    () => computeCategorySummary(scopedTransactions, mergedCategories),
    [scopedTransactions, mergedCategories],
  );

  const monthHeading = useMemo(() => {
    const [y, m] = viewMonth.split('-').map(Number);
    return new Date(y, (m || 1) - 1, 1).toLocaleDateString(lang === 'ml' ? 'ml-IN' : 'en-IN', {
      month: 'long',
      year: 'numeric',
    });
  }, [viewMonth, lang]);

  const scopeLabel = useMemo(() => {
    if (scope === 'overall') return t(lang, 'scopeOverall');
    if (scope === 'day') return formatDisplayDate(activeRange.startDate, lang);
    if (scope === 'month') return monthHeading;
    return `${formatDisplayDate(activeRange.startDate, lang)} → ${formatDisplayDate(activeRange.endDate, lang)}`;
  }, [scope, activeRange, monthHeading, lang]);

  const isDateInActiveScope = (iso: string): boolean => {
    if (scope === 'overall') return true;
    if (scope === 'day') return iso === selectedDate;
    return (
      (!activeRange.startDate || iso >= activeRange.startDate) &&
      (!activeRange.endDate || iso <= activeRange.endDate)
    );
  };

  const handleSelectDay = (iso: string) => {
    setSelectedDate(iso);
    const ym = iso.slice(0, 7);
    if (ym !== viewMonth) setViewMonth(ym);
    if (scope !== 'week') setScope('day');
  };

  const handleSelectWeek = (week: CalendarWeekRow) => {
    setSelectedDate(week.startDate);
    setScope('week');
  };

  const handleChangeMonth = (nextYm: string) => {
    if (!nextYm) return;
    setViewMonth(nextYm);
    if (!selectedDate.startsWith(nextYm)) {
      setSelectedDate(`${nextYm}-01`);
    }
  };

  const handleCsvDownload = () => {
    const slug =
      scope === 'overall'
        ? 'overall'
        : activeRange.startDate === activeRange.endDate
          ? activeRange.startDate
          : `${activeRange.startDate}-to-${activeRange.endDate}`;
    exportTransactionsToCsv(
      scopedTransactions,
      mergedCategories,
      mergedDivisions,
      lang,
      `myfin-calendar-${slug}.csv`,
    );
    showToast('toastCsvReady');
  };

  const handlePdfDownload = async () => {
    if (!pdfTargetRef.current || isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      await exportReportElementToPdf(pdfTargetRef.current, `myfin-${scope}-${activeRange.startDate || 'all'}.pdf`);
      showToast('toastPdfReady');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const weekdayLabels = lang === 'ml' ? WEEKDAY_LABELS_ML : WEEKDAY_LABELS_EN;
  const activeCategoryRows = scopedCategorySummary.filter((r) => r.count > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Interactive Month Calendar Card */}
      <section className="card no-print" aria-label={t(lang, 'calendarTitle')}>
        <div className="section-header">
          <div>
            <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CalendarDays size={19} color="var(--accent)" />
              <span>{t(lang, 'calendarTitle')}</span>
            </h2>
            <p className="section-subtitle">{t(lang, 'calendarSubtitle')}</p>
          </div>

          <div className="calendar-nav-controls">
            <button
              type="button"
              className="header-square-btn"
              onClick={() => handleChangeMonth(shiftYearMonth(viewMonth, -1))}
              aria-label={t(lang, 'prevMonth')}
              title={t(lang, 'prevMonth')}
            >
              <ChevronLeft size={17} />
            </button>

            <input
              type="month"
              className="input-control"
              style={{ width: 'auto', padding: '6px 10px', fontSize: '0.84rem', fontWeight: 700 }}
              aria-label={t(lang, 'monthPickerLabel')}
              value={viewMonth}
              onChange={(e) => {
                handleChangeMonth(e.target.value);
                setScope('month');
              }}
            />

            <button
              type="button"
              className="header-square-btn"
              onClick={() => handleChangeMonth(shiftYearMonth(viewMonth, 1))}
              aria-label={t(lang, 'nextMonth')}
              title={t(lang, 'nextMonth')}
            >
              <ChevronRight size={17} />
            </button>

            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '7px 12px', fontSize: '0.8rem' }}
              onClick={() => {
                setViewMonth(todayIso.slice(0, 7));
                setSelectedDate(todayIso);
                setScope('day');
              }}
            >
              {t(lang, 'todayBtn')}
            </button>
          </div>
        </div>

        {/* Report Scope Selector Pills */}
        <div className="preset-pills" style={{ marginBottom: 14 }} role="group" aria-label="Calendar report scope">
          <button
            type="button"
            className={`pill-btn ${scope === 'day' ? 'active' : ''}`}
            onClick={() => setScope('day')}
          >
            {t(lang, 'scopeDay')}
          </button>
          <button
            type="button"
            className={`pill-btn ${scope === 'week' ? 'active' : ''}`}
            onClick={() => setScope('week')}
          >
            {t(lang, 'scopeWeek')}
          </button>
          <button
            type="button"
            className={`pill-btn ${scope === 'month' ? 'active' : ''}`}
            onClick={() => setScope('month')}
          >
            {t(lang, 'scopeMonth')} ({monthHeading})
          </button>
          <button
            type="button"
            className={`pill-btn ${scope === 'overall' ? 'active' : ''}`}
            onClick={() => setScope('overall')}
          >
            {t(lang, 'scopeOverall')}
          </button>
        </div>

        {/* Specific Week Selector Pills for the Viewed Month */}
        <div className="preset-pills" style={{ marginBottom: 14 }}>
          {weeks.map((w) => {
            const isActiveWeek =
              scope === 'week' &&
              activeRange.startDate === w.startDate &&
              activeRange.endDate === w.endDate;
            return (
              <button
                key={w.weekIndex}
                type="button"
                className={`folder-tab-btn ${isActiveWeek ? 'active' : ''}`}
                onClick={() => handleSelectWeek(w)}
              >
                {t(lang, 'weekOptionPrefix')} {w.weekIndex} ({w.startDate.slice(8)}–{w.endDate.slice(8)})
              </button>
            );
          })}
        </div>

        {/* 7-Column Calendar Matrix */}
        <div className="calendar-grid-head">
          {weekdayLabels.map((label) => (
            <div key={label} className="calendar-weekday">
              {label}
            </div>
          ))}
        </div>

        <div className="calendar-grid-body">
          {weeks.flatMap((w) =>
            w.days.map((day) => {
              const totals = dayTotalsMap.get(day.iso);
              const isSelected = day.iso === selectedDate && scope === 'day';
              const inScope = isDateInActiveScope(day.iso);
              const isToday = day.iso === todayIso;
              return (
                <button
                  key={day.iso}
                  type="button"
                  onClick={() => handleSelectDay(day.iso)}
                  aria-label={day.iso}
                  aria-pressed={isSelected}
                  className={[
                    'calendar-day-cell',
                    !day.inCurrentMonth ? 'outside' : '',
                    inScope ? 'in-scope' : '',
                    isSelected ? 'selected' : '',
                    isToday ? 'today' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className="calendar-day-num">{day.dayNum}</span>

                  {totals && totals.count > 0 && (
                    <div className="calendar-day-meta">
                      <span className="calendar-dots">
                        {totals.income > 0 && <span className="cal-dot income" />}
                        {totals.expense > 0 && <span className="cal-dot expense" />}
                      </span>
                      <span className="calendar-day-count">{totals.count}</span>
                    </div>
                  )}
                </button>
              );
            }),
          )}
        </div>
      </section>

      {/* Active Selected Calendar Report Details & Export */}
      <section className="card no-print" aria-label="Selected calendar report">
        <div className="section-header">
          <div>
            <h3 className="section-title">{scopeLabel}</h3>
            <p className="section-subtitle">
              {scopedSummary.transactionCount} {t(lang, 'entriesCount')} • {t(lang, 'savingsRate')}:{' '}
              {scopedSummary.savingsRate}%
            </p>
          </div>

          <div className="actions-toolbar">
            <button
              type="button"
              className="btn-primary"
              onClick={() => openAddModal({ date: selectedDate })}
            >
              <Plus size={15} />
              <span>{t(lang, 'addForDate')}</span>
            </button>

            {(scope === 'week' || scope === 'month') && scopedTransactions.length > 0 && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  storePeriodReport(
                    scope === 'week' ? 'weekly' : 'monthly',
                    scope === 'week' ? parseIsoLocal(selectedDate) : parseIsoLocal(`${viewMonth}-15`),
                    true,
                  )
                }
              >
                <Archive size={15} />
                <span>{t(lang, 'storeReportBtn')}</span>
              </button>
            )}

            <button type="button" className="btn-secondary" onClick={handleCsvDownload}>
              <FileSpreadsheet size={15} />
              <span>{t(lang, 'downloadCsv')}</span>
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={handlePdfDownload}
              disabled={isExportingPdf}
            >
              <FileDown size={15} />
              <span>{isExportingPdf ? t(lang, 'generatingPdf') : t(lang, 'downloadPdf')}</span>
            </button>

            <button type="button" className="btn-secondary" onClick={() => window.print()}>
              <Printer size={15} />
              <span>{t(lang, 'printReport')}</span>
            </button>
          </div>
        </div>

        <div className="unified-banner" style={{ marginBottom: 14 }}>
          <div className="unified-stat">
            <span className="unified-stat-label">{t(lang, 'totalIncome')}</span>
            <span className="unified-stat-value" style={{ color: 'var(--income)' }}>
              {formatCurrency(scopedSummary.totalIncome)}
            </span>
          </div>
          <div className="unified-stat">
            <span className="unified-stat-label">{t(lang, 'totalExpense')}</span>
            <span className="unified-stat-value" style={{ color: 'var(--expense)' }}>
              {formatCurrency(scopedSummary.totalExpense)}
            </span>
          </div>
          <div className="unified-stat">
            <span className="unified-stat-label">{t(lang, 'netBalance')}</span>
            <span
              className="unified-stat-value"
              style={{ color: scopedSummary.balance < 0 ? 'var(--expense)' : 'var(--balance)' }}
            >
              {formatCurrency(scopedSummary.balance)}
            </span>
          </div>
        </div>

        {activeCategoryRows.length > 0 && (
          <div className="picker-row" style={{ marginBottom: 14 }}>
            {activeCategoryRows.map((row) => (
              <span
                key={row.category.id}
                className="badge"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              >
                {row.category.icon} {getLocalizedName(row.category, lang)}:{' '}
                {formatCurrency(row.expense > 0 ? row.expense : row.income)} ({row.count})
              </span>
            ))}
          </div>
        )}

        {scopedTransactions.length === 0 ? (
          <div className="empty-state" style={{ padding: '18px 8px' }}>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>{t(lang, 'noEntriesForScope')}</p>
          </div>
        ) : (
          <div className="tx-table-wrap">
            <table className="tx-table">
              <thead>
                <tr>
                  <th>{t(lang, 'date')}</th>
                  <th>{t(lang, 'category')}</th>
                  <th>{t(lang, 'division')}</th>
                  <th>{t(lang, 'note')}</th>
                  <th>{t(lang, 'amount')}</th>
                  <th>{t(lang, 'actions')}</th>
                </tr>
              </thead>
              <tbody>
                {scopedTransactions.map((tx) => {
                  const cat = categoryMap.get(tx.categoryId);
                  const div = divisionMap.get(tx.divisionId);
                  const isActive = activeIdSet.has(tx.id);
                  return (
                    <tr key={tx.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDisplayDate(tx.date, lang)}</td>
                      <td>
                        {cat?.icon ?? '🧾'} {getLocalizedName(cat, lang)}
                      </td>
                      <td>
                        {div?.icon ?? '💼'} {getLocalizedName(div, lang)}
                      </td>
                      <td>{tx.note || '—'}</td>
                      <td
                        style={{
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          color: tx.type === 'income' ? 'var(--income)' : 'var(--expense)',
                        }}
                      >
                        {formatCurrency(tx.type === 'expense' ? -tx.amount : tx.amount, true)}
                      </td>
                      <td>
                        {isActive ? (
                          <div className="row-actions">
                            <button
                              type="button"
                              className="mini-icon-btn"
                              title={t(lang, 'edit')}
                              aria-label={t(lang, 'edit')}
                              onClick={() => openEditModal(tx)}
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              className="mini-icon-btn danger"
                              title={t(lang, 'delete')}
                              aria-label={t(lang, 'delete')}
                              onClick={() => {
                                if (window.confirm(t(lang, 'confirmDeleteTx'))) {
                                  deleteTransaction(tx.id);
                                }
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ) : (
                          <span
                            className="badge"
                            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                          >
                            {t(lang, 'storedBadge')}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Print + Offscreen PDF Host for Selected Calendar Report */}
      <PrintableReportSheet
        className="print-only-report"
        overrideTransactions={scopedTransactions}
        overrideSummary={scopedSummary}
        overrideCategorySummary={scopedCategorySummary}
        overridePeriodLabel={scopeLabel}
      />

      <div
        style={{
          position: 'fixed',
          width: 0,
          height: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          opacity: 0,
        }}
        aria-hidden="true"
      >
        <PrintableReportSheet
          forwardedRef={pdfTargetRef}
          className="pdf-render-host"
          overrideTransactions={scopedTransactions}
          overrideSummary={scopedSummary}
          overrideCategorySummary={scopedCategorySummary}
          overridePeriodLabel={scopeLabel}
        />
      </div>
    </div>
  );
}
