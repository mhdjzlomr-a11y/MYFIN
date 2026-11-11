import {
  Archive,
  ArrowDownCircle,
  ArrowRight,
  ArrowUpCircle,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Edit3,
  HeartHandshake,
  PieChart,
  Plus,
  Sparkles,
  Trash2,
  Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDisplayDate, getLocalizedName, t } from '../i18n/translations';
import type { DateFilterPreset, TransactionType } from '../types/finance';

function formatIso(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function getTodayIso(): string {
  const now = new Date();
  return formatIso(now.getFullYear(), now.getMonth(), now.getDate());
}

const WEEKDAYS_SHORT = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const RING_RADIUS = 34;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function DashboardBento() {
  const {
    allMergedTransactions,
    summary,
    filteredTransactions,
    categorySummary,
    divisionSummary,
    categories,
    divisions,
    archives,
    filters,
    setFilters,
    settings,
    openAddModal,
    openEditModal,
    deleteTransaction,
    loadSampleData,
    setActiveTab,
  } = useFinance();

  const lang = settings.language;
  const todayIso = useMemo(() => getTodayIso(), []);

  const initialAnchor = useMemo(() => {
    const base = filters.preset === 'custom' && filters.startDate ? filters.startDate : todayIso;
    const [y, m] = base.split('-').map(Number);
    return { year: y || new Date().getFullYear(), month: (m || 1) - 1 };
  }, [filters.preset, filters.startDate, todayIso]);

  const [calCursor, setCalCursor] = useState(initialAnchor);

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const divisionMap = useMemo(() => new Map(divisions.map((d) => [d.id, d])), [divisions]);

  const gaugePct = useMemo(() => {
    if (summary.totalIncome <= 0) return summary.totalExpense > 0 ? 0 : 100;
    return Math.max(0, Math.min(100, Math.round((summary.balance / summary.totalIncome) * 100)));
  }, [summary]);

  const totalFlow = summary.totalIncome + summary.totalExpense;
  const incomeSharePct = totalFlow > 0 ? Math.round((summary.totalIncome / totalFlow) * 100) : 50;
  const expenseSharePct = totalFlow > 0 ? 100 - incomeSharePct : 50;

  const expenseRingOffset = RING_CIRCUMFERENCE * (1 - expenseSharePct / 100);
  const savingsRingOffset = RING_CIRCUMFERENCE * (1 - gaugePct / 100);

  const presets: Array<{ id: DateFilterPreset; label: string }> = [
    { id: 'daily', label: t(lang, 'filterDaily') },
    { id: 'weekly', label: t(lang, 'filterWeekly') },
    { id: 'monthly', label: t(lang, 'filterMonthly') },
    { id: 'all', label: t(lang, 'filterAll') },
    { id: 'custom', label: t(lang, 'filterCustom') },
  ];

  const activeCapsules = useMemo(
    () => categorySummary.filter((r) => r.income + r.expense > 0).slice(0, 4),
    [categorySummary],
  );

  const maxCapsuleVol = useMemo(
    () => Math.max(...activeCapsules.map((c) => c.income + c.expense), 1),
    [activeCapsules],
  );

  const recentRows = filteredTransactions.slice(0, 5);
  const activeDivision = divisions.find((d) => d.id === filters.divisionId);

  const selectedSingleDay =
    filters.preset === 'custom' && filters.startDate && filters.startDate === filters.endDate
      ? filters.startDate
      : todayIso;

  // Transaction presence map for mini calendar date dots
  const txDaysMap = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const tx of allMergedTransactions) {
      if (filters.divisionId !== 'all' && tx.divisionId !== filters.divisionId) continue;
      const cur = map.get(tx.date) ?? { income: 0, expense: 0 };
      if (tx.type === 'income') cur.income += tx.amount;
      else cur.expense += tx.amount;
      map.set(tx.date, cur);
    }
    return map;
  }, [allMergedTransactions, filters.divisionId]);

  const calendarCells = useMemo(() => {
    const { year, month } = calCursor;
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    const cells: Array<{
      iso: string;
      day: number;
      inMonth: boolean;
      isWeekend: boolean;
    }> = [];

    for (let i = 0; i < totalCells; i++) {
      const colIdx = i % 7;
      const isWeekend = colIdx >= 5;
      if (i < startOffset) {
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        const day = prevMonthLastDate - startOffset + i + 1;
        cells.push({
          iso: formatIso(prevYear, prevMonth, day),
          day,
          inMonth: false,
          isWeekend,
        });
      } else if (i >= startOffset + daysInMonth) {
        const nextMonth = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;
        const day = i - (startOffset + daysInMonth) + 1;
        cells.push({
          iso: formatIso(nextYear, nextMonth, day),
          day,
          inMonth: false,
          isWeekend,
        });
      } else {
        const day = i - startOffset + 1;
        cells.push({
          iso: formatIso(year, month, day),
          day,
          inMonth: true,
          isWeekend,
        });
      }
    }
    return cells;
  }, [calCursor]);

  const monthHeading = useMemo(() => {
    const dt = new Date(calCursor.year, calCursor.month, 1);
    return dt.toLocaleDateString(lang === 'ml' ? 'ml-IN' : 'en-US', {
      month: 'long',
      year: 'numeric',
    });
  }, [calCursor, lang]);

  const shiftMonth = (delta: number) => {
    setCalCursor((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  const handleMiniDayClick = (iso: string, inMonth: boolean) => {
    if (!inMonth) {
      const [y, m] = iso.split('-').map(Number);
      setCalCursor({ year: y, month: m - 1 });
    }
    if (filters.preset === 'custom' && filters.startDate === iso && filters.endDate === iso) {
      setFilters((prev) => ({ ...prev, preset: 'all' }));
      return;
    }
    setFilters((prev) => ({
      ...prev,
      preset: 'custom',
      startDate: iso,
      endDate: iso,
    }));
  };

  return (
    <div className="gh-bento-layout">
      {/* LEFT / CENTER WORKSPACE COLUMN */}
      <div className="gh-main-col">
        {/* TOP ROW: Balance 2x2 Snapshot Card + Dual Progress Rings & Division Selector Card */}
        <div className="gh-top-split">
          <section className="card gh-profile-card" aria-label="Balance spotlight">
            <div className="gh-profile-top">
              <div className="gh-profile-avatar" aria-hidden="true">
                <HeartHandshake size={28} />
              </div>
              <div className="gh-profile-meta">
                <span className="gh-profile-badge">
                  {activeDivision
                    ? `${activeDivision.icon} ${getLocalizedName(activeDivision, lang)}`
                    : `✨ ${t(lang, 'allDivisions')}`}
                </span>
                <div className="gh-profile-name">{formatCurrency(summary.balance)}</div>
                <span className="gh-profile-sub">{t(lang, 'netBalance')}</span>
              </div>
            </div>

            <div className="gh-stat-2x2">
              <div className="gh-stat-cell">
                <strong style={{ color: 'var(--gh-blue)' }}>
                  {formatCurrency(summary.totalIncome)}
                </strong>
                <span>{t(lang, 'totalIncome')}</span>
              </div>
              <div className="gh-stat-cell">
                <strong style={{ color: 'var(--gh-coral)' }}>
                  {formatCurrency(summary.totalExpense)}
                </strong>
                <span>{t(lang, 'totalExpense')}</span>
              </div>
              <div className="gh-stat-cell">
                <strong>{summary.transactionCount}</strong>
                <span>{t(lang, 'entriesCount')}</span>
              </div>
              <div className="gh-stat-cell">
                <strong style={{ color: gaugePct >= 20 ? '#059669' : 'var(--gh-coral)' }}>
                  {gaugePct}%
                </strong>
                <span>{t(lang, 'savingsRate')}</span>
              </div>
            </div>
          </section>

          <section className="card gh-rings-card" aria-label="Financial health ratios">
            <div className="gh-rings-pair">
              <div className="gh-ring-box">
                <div className="gh-ring-title">{t(lang, 'sharePercent')}</div>
                <div className="gh-ring-svg-wrap">
                  <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true">
                    <circle cx="44" cy="44" r={RING_RADIUS} className="gh-ring-track" />
                    <circle
                      cx="44"
                      cy="44"
                      r={RING_RADIUS}
                      className="gh-ring-fill coral"
                      strokeDasharray={RING_CIRCUMFERENCE}
                      strokeDashoffset={expenseRingOffset}
                    />
                  </svg>
                  <span className="gh-ring-pct">{expenseSharePct}%</span>
                </div>
              </div>

              <div className="gh-ring-box">
                <div className="gh-ring-title">{t(lang, 'savingsRate')}</div>
                <div className="gh-ring-svg-wrap">
                  <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true">
                    <circle cx="44" cy="44" r={RING_RADIUS} className="gh-ring-track" />
                    <circle
                      cx="44"
                      cy="44"
                      r={RING_RADIUS}
                      className="gh-ring-fill blue"
                      strokeDasharray={RING_CIRCUMFERENCE}
                      strokeDashoffset={savingsRingOffset}
                    />
                  </svg>
                  <span className="gh-ring-pct">{gaugePct}%</span>
                </div>
              </div>
            </div>

            <div className="gh-divisions-bar" aria-label={t(lang, 'division')}>
              <div className="gh-divisions-head">
                <span className="gh-div-heading">{t(lang, 'division')}</span>
                <button
                  type="button"
                  className="sage-mini-link"
                  onClick={() => setActiveTab('categories')}
                >
                  + {t(lang, 'create')}
                </button>
              </div>
              <div className="gh-div-pills">
                <button
                  type="button"
                  className={`gh-div-pill ${filters.divisionId === 'all' ? 'active' : ''}`}
                  onClick={() => setFilters((prev) => ({ ...prev, divisionId: 'all' }))}
                >
                  ✨ {t(lang, 'allDivisions')}
                </button>
                {divisionSummary.map((row) => (
                  <button
                    key={row.division.id}
                    type="button"
                    className={`gh-div-pill ${filters.divisionId === row.division.id ? 'active' : ''}`}
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        divisionId: prev.divisionId === row.division.id ? 'all' : row.division.id,
                      }))
                    }
                  >
                    <span>{row.division.icon}</span>
                    <span>{getLocalizedName(row.division, lang)}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* BOTTOM WIDE WORKSPACE CARD: Period Tabs + Custom Range + Recent Transactions List + Category Capsules */}
        <section className="card gh-bottom-card" aria-label="Period filter and transactions">
          <div className="gh-tabs-header">
            <div className="gh-underline-tabs" role="group" aria-label="Date range presets">
              {presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`gh-tab-btn ${filters.preset === p.id ? 'active' : ''}`}
                  onClick={() => setFilters((prev) => ({ ...prev, preset: p.id }))}
                >
                  <Calendar size={13} />
                  <span>{p.label}</span>
                </button>
              ))}

              <button
                type="button"
                className="gh-tab-btn"
                onClick={() => setActiveTab('calendar')}
                title={t(lang, 'calendarTitle')}
              >
                <CalendarDays size={13} />
                <span>{t(lang, 'navCalendar')}</span>
              </button>

              <button
                type="button"
                className="gh-tab-btn"
                onClick={() => setActiveTab('reports')}
                title={t(lang, 'periodArchiveTitle')}
              >
                <Archive size={13} />
                <span>{t(lang, 'periodArchiveQuickNav')}</span>
              </button>
            </div>

            <select
              aria-label={t(lang, 'typeLabel')}
              className="input-control gh-type-select"
              value={filters.type}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  type: e.target.value as 'all' | TransactionType,
                }))
              }
            >
              <option value="all">{t(lang, 'all')}</option>
              <option value="income">{t(lang, 'income')}</option>
              <option value="expense">{t(lang, 'expense')}</option>
            </select>
          </div>

          {filters.preset === 'custom' && (
            <div className="responsive-grid-2" style={{ marginTop: 12, marginBottom: 4 }}>
              <div className="field-group">
                <label className="field-label" htmlFor="bento-from-date">
                  {t(lang, 'fromDate')}
                </label>
                <input
                  id="bento-from-date"
                  type="date"
                  className="input-control"
                  value={filters.startDate}
                  onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="field-group">
                <label className="field-label" htmlFor="bento-to-date">
                  {t(lang, 'toDate')}
                </label>
                <input
                  id="bento-to-date"
                  type="date"
                  className="input-control"
                  value={filters.endDate}
                  onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
          )}

          <div className="gh-tx-split">
            <section className="gh-tx-section" aria-label="Transactions list">
              <div className="section-header" style={{ marginBottom: 10 }}>
                <h3 className="section-title" style={{ fontSize: '0.98rem' }}>
                  {t(lang, 'recentTransactions')}
                </h3>
                <button
                  type="button"
                  className="sage-mini-link"
                  onClick={() => setActiveTab('transactions')}
                >
                  {recentRows.length}/{filteredTransactions.length}
                </button>
              </div>

              {recentRows.length === 0 ? (
                <div className="empty-state" style={{ padding: '18px 8px' }}>
                  <Wallet size={28} color="var(--gh-blue)" />
                  <h3>{t(lang, 'noTransactionsTitle')}</h3>
                  <p>{t(lang, 'noTransactionsDesc')}</p>
                  <div className="actions-toolbar" style={{ justifyContent: 'center' }}>
                    <button type="button" className="btn-primary" onClick={() => openAddModal()}>
                      <Plus size={15} />
                      <span>{t(lang, 'addEntry')}</span>
                    </button>
                    <button type="button" className="btn-secondary" onClick={loadSampleData}>
                      <Sparkles size={15} />
                      <span>{t(lang, 'loadSampleData')}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="navy-tx-list">
                  {recentRows.map((tx) => {
                    const cat = categoryMap.get(tx.categoryId);
                    const div = divisionMap.get(tx.divisionId);
                    const isIncome = tx.type === 'income';
                    return (
                      <div key={tx.id} className="sage-tx-row">
                        <div className="todo-tx-left">
                          <span className="sage-tx-icon">{cat?.icon ?? '🧾'}</span>
                          <div style={{ minWidth: 0 }}>
                            <div className="todo-tx-title" style={{ color: 'var(--text-primary)' }}>
                              {tx.note || getLocalizedName(cat, lang)}
                            </div>
                            <div className="todo-tx-sub" style={{ color: 'var(--text-muted)' }}>
                              {formatDisplayDate(tx.date, lang)} • {getLocalizedName(div, lang)}
                            </div>
                          </div>
                        </div>

                        <div className="todo-tx-right">
                          <span
                            className="todo-tx-amount"
                            style={{ color: isIncome ? 'var(--income)' : 'var(--expense)' }}
                          >
                            {formatCurrency(isIncome ? tx.amount : -tx.amount, true)}
                          </span>

                          <div className="row-actions">
                            <button
                              type="button"
                              className="mini-icon-btn"
                              title={t(lang, 'edit')}
                              aria-label={t(lang, 'edit')}
                              onClick={() => openEditModal(tx)}
                            >
                              <Edit3 size={12} />
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
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Category Progress Strip (no graphs — pure progress capsules) */}
            {activeCapsules.length > 0 && (
              <div className="gh-cat-capsules">
                <div className="gh-divisions-head">
                  <span className="gh-div-heading">{t(lang, 'viewByCategory')}</span>
                  <button
                    type="button"
                    className="sage-mini-link"
                    onClick={() => setActiveTab('categories')}
                  >
                    {t(lang, 'navCategories')} →
                  </button>
                </div>
                <div className="gh-cat-grid">
                  {activeCapsules.map((row) => {
                    const vol = row.income + row.expense;
                    const widthPct = Math.max(16, Math.round((vol / maxCapsuleVol) * 100));
                    return (
                      <button
                        key={row.category.id}
                        type="button"
                        className="sage-plan-item"
                        onClick={() => setActiveTab('categories')}
                      >
                        <div className="sage-plan-head">
                          <span className="sage-plan-title">
                            {row.category.icon} {getLocalizedName(row.category, lang)}
                          </span>
                          <span className="sage-plan-amount">
                            {formatCurrency(row.expense > 0 ? row.expense : row.income)}
                          </span>
                        </div>
                        <div className="sage-plan-track">
                          <div className="sage-plan-fill" style={{ width: `${widthPct}%` }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* RIGHT TALL SIDEBAR PANEL: Mini Interactive Calendar + 4 Stacked Gradient Cards */}
      <aside className="card gh-right-col" aria-label={t(lang, 'calendarTitle')}>
        <div className="gh-right-head">
          <h3 className="section-title" style={{ fontSize: '0.98rem' }}>
            {t(lang, 'calendarTitle')}
          </h3>
          <button
            type="button"
            className="sage-mini-link"
            onClick={() => setActiveTab('calendar')}
          >
            {t(lang, 'navCalendar')} →
          </button>
        </div>

        <div className="gh-mini-cal">
          <div className="gh-mini-cal-nav">
            <span className="gh-mini-cal-month">{monthHeading}</span>
            <div className="gh-mini-cal-btns">
              <button
                type="button"
                className="gh-cal-arrow"
                aria-label={t(lang, 'prevMonth')}
                onClick={() => shiftMonth(-1)}
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                className="gh-cal-arrow"
                aria-label={t(lang, 'nextMonth')}
                onClick={() => shiftMonth(1)}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          <div className="gh-mini-cal-weekdays">
            {WEEKDAYS_SHORT.map((wd) => (
              <span key={wd}>{wd}</span>
            ))}
          </div>

          <div className="gh-mini-cal-grid">
            {calendarCells.map((cell) => {
              const isSelected = cell.iso === selectedSingleDay;
              const isToday = cell.iso === todayIso;
              const dayInfo = txDaysMap.get(cell.iso);
              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => handleMiniDayClick(cell.iso, cell.inMonth)}
                  className={[
                    'gh-mini-cal-day',
                    !cell.inMonth ? 'muted' : '',
                    cell.isWeekend ? 'weekend' : '',
                    isSelected ? 'selected' : '',
                    isToday && !isSelected ? 'today' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  title={formatDisplayDate(cell.iso, lang)}
                >
                  <span>{String(cell.day).padStart(2, '0')}</span>
                  {dayInfo && (
                    <i
                      className={`gh-day-dot ${dayInfo.expense > dayInfo.income ? 'exp' : 'inc'}`}
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="gh-color-stack">
          <button
            type="button"
            className="gh-color-card purple"
            onClick={() => openAddModal({ type: 'income' })}
          >
            <span className="gh-card-icon-badge" aria-hidden="true">
              <ArrowUpCircle size={20} color="#9333ea" />
            </span>
            <span className="gh-card-copy">
              <strong>{t(lang, 'income')}</strong>
              <span>+ {t(lang, 'addEntry')}</span>
            </span>
            <span className="gh-card-right-pill">
              <span>{formatCurrency(summary.totalIncome)}</span>
              <ArrowRight size={12} />
            </span>
          </button>

          <button
            type="button"
            className="gh-color-card blue"
            onClick={() => openAddModal({ type: 'expense' })}
          >
            <span className="gh-card-icon-badge" aria-hidden="true">
              <ArrowDownCircle size={20} color="#008cff" />
            </span>
            <span className="gh-card-copy">
              <strong>{t(lang, 'expense')}</strong>
              <span>+ {t(lang, 'addEntry')}</span>
            </span>
            <span className="gh-card-right-pill">
              <span>{formatCurrency(summary.totalExpense)}</span>
              <ArrowRight size={12} />
            </span>
          </button>

          <button
            type="button"
            className="gh-color-card amber"
            onClick={() => setActiveTab('categories')}
          >
            <span className="gh-card-icon-badge" aria-hidden="true">
              <PieChart size={20} color="#d97706" />
            </span>
            <span className="gh-card-copy">
              <strong>{t(lang, 'navCategories')}</strong>
              <span>
                {activeCapsules.length}/{categories.length}
              </span>
            </span>
            <span className="gh-card-right-pill">
              <span>{t(lang, 'viewByCategory')}</span>
              <ArrowRight size={12} />
            </span>
          </button>

          <button
            type="button"
            className="gh-color-card coral"
            onClick={() => setActiveTab('reports')}
          >
            <span className="gh-card-icon-badge" aria-hidden="true">
              <Archive size={20} color="#ff5a5f" />
            </span>
            <span className="gh-card-copy">
              <strong>{t(lang, 'navReports')}</strong>
              <span>
                {archives.length} {t(lang, 'storedBadge')}
              </span>
            </span>
            <span className="gh-card-right-pill">
              <span>{t(lang, 'viewDetails')}</span>
              <ArrowRight size={12} />
            </span>
          </button>
        </div>
      </aside>
    </div>
  );
}
