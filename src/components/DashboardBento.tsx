import {
  Archive,
  ArrowUpRight,
  Calendar,
  CalendarDays,
  Check,
  Edit3,
  FolderKanban,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDisplayDate, getLocalizedName, t } from '../i18n/translations';
import type { DateFilterPreset, TransactionType } from '../types/finance';

// 180-degree semi-circle SVG arch helper (r = 82 => half circumference = pi * 82 ≈ 257.61)
const SEMI_RADIUS = 82;
const SEMI_ARC_LENGTH = Math.PI * SEMI_RADIUS;

export function DashboardBento() {
  const {
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
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const divisionMap = useMemo(() => new Map(divisions.map((d) => [d.id, d])), [divisions]);

  const gaugePct = useMemo(() => {
    if (summary.totalIncome <= 0) return summary.totalExpense > 0 ? 0 : 100;
    return Math.max(0, Math.min(100, Math.round((summary.balance / summary.totalIncome) * 100)));
  }, [summary]);

  const totalFlow = summary.totalIncome + summary.totalExpense;
  const incomeSharePct = totalFlow > 0 ? Math.round((summary.totalIncome / totalFlow) * 100) : 50;
  const expenseSharePct = totalFlow > 0 ? 100 - incomeSharePct : 50;

  // Semi-circle stroke lengths for blue (primary progress) and emerald (secondary cap)
  const totalFillLen = (gaugePct / 100) * SEMI_ARC_LENGTH;
  const blueLen = totalFillLen * 0.78;
  const emeraldLen = totalFillLen;

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

  const recentRows = filteredTransactions.slice(0, 5);
  const activeDivision = divisions.find((d) => d.id === filters.divisionId);

  return (
    <div className="onyx-bento-layout">
      {/* LEFT COLUMN: Editorial Title + Left Soft Tray (Semi-Circle Progress Arch + Today Checklist) */}
      <div className="onyx-left-col">
        <div className="onyx-title-block">
          <h2 className="onyx-hero-heading">
            {t(lang, 'appName')}{' '}
            <span className="onyx-heading-muted">
              {activeDivision ? getLocalizedName(activeDivision, lang) : t(lang, 'allDivisions')}
            </span>
          </h2>
          <p className="onyx-hero-sub">{t(lang, 'appTagline')}</p>
        </div>

        <div className="onyx-left-tray">
          {/* Top White Card: Semi-Circle Gauge Arch + 3 Dot-Labeled KPIs */}
          <section className="card onyx-arch-card" aria-label={t(lang, 'savingsRate')}>
            <div className="onyx-card-head">
              <h3 className="onyx-card-title">{t(lang, 'savingsRate')}</h3>
              <button
                type="button"
                className="onyx-dots-btn"
                onClick={() => setActiveTab('categories')}
                aria-label={t(lang, 'navCategories')}
                title={t(lang, 'navCategories')}
              >
                <MoreHorizontal size={16} />
              </button>
            </div>

            <div className="onyx-arch-wrap">
              <svg viewBox="0 0 210 116" className="onyx-arch-svg" aria-hidden="true">
                {/* Soft Gray Base Semi-Circle Track */}
                <path
                  d="M 23 102 A 82 82 0 0 1 187 102"
                  fill="none"
                  stroke="var(--bg-track)"
                  strokeWidth="22"
                  strokeLinecap="round"
                />
                {/* Mint Emerald Secondary Segment */}
                {gaugePct > 0 && (
                  <path
                    d="M 23 102 A 82 82 0 0 1 187 102"
                    fill="none"
                    stroke="var(--onyx-emerald)"
                    strokeWidth="22"
                    strokeLinecap="round"
                    strokeDasharray={`${emeraldLen.toFixed(1)} ${SEMI_ARC_LENGTH.toFixed(1)}`}
                  />
                )}
                {/* Electric Cobalt Blue Primary Segment */}
                {gaugePct > 0 && (
                  <path
                    d="M 23 102 A 82 82 0 0 1 187 102"
                    fill="none"
                    stroke="var(--onyx-blue)"
                    strokeWidth="22"
                    strokeLinecap="round"
                    strokeDasharray={`${blueLen.toFixed(1)} ${SEMI_ARC_LENGTH.toFixed(1)}`}
                  />
                )}
              </svg>

              <div className="onyx-arch-center">
                <strong className="onyx-arch-pct">{gaugePct}%</strong>
                <span className="onyx-arch-sub">{formatCurrency(summary.balance)}</span>
              </div>
            </div>

            <div className="onyx-arch-metrics">
              <div className="onyx-arch-metric">
                <strong>{formatCurrency(summary.totalIncome)}</strong>
                <span>
                  <i className="onyx-dot blue" aria-hidden="true" />
                  {t(lang, 'income')}
                </span>
              </div>
              <div className="onyx-arch-metric">
                <strong>{formatCurrency(summary.totalExpense)}</strong>
                <span>
                  <i className="onyx-dot emerald" aria-hidden="true" />
                  {t(lang, 'expense')}
                </span>
              </div>
              <div className="onyx-arch-metric">
                <strong>{summary.transactionCount}</strong>
                <span>
                  <i className="onyx-dot gray" aria-hidden="true" />
                  {t(lang, 'entriesCount')}
                </span>
              </div>
            </div>
          </section>

          {/* Bottom White Card: Checklist-Style Recent Transactions List */}
          <section className="card onyx-todo-card" aria-label="Transactions list">
            <div className="onyx-card-head">
              <h3 className="onyx-card-title">{t(lang, 'recentTransactions')}</h3>
              <button
                type="button"
                className="onyx-text-link"
                onClick={() => setActiveTab('transactions')}
              >
                {recentRows.length}/{filteredTransactions.length} ▾
              </button>
            </div>

            {recentRows.length === 0 ? (
              <div className="empty-state" style={{ padding: '16px 6px' }}>
                <Wallet size={24} color="var(--onyx-blue)" />
                <h3>{t(lang, 'noTransactionsTitle')}</h3>
                <p>{t(lang, 'noTransactionsDesc')}</p>
                <button type="button" className="btn-secondary" onClick={loadSampleData}>
                  <Sparkles size={14} />
                  <span>{t(lang, 'loadSampleData')}</span>
                </button>
              </div>
            ) : (
              <div className="onyx-todo-list">
                {recentRows.map((tx, idx) => {
                  const cat = categoryMap.get(tx.categoryId);
                  const div = divisionMap.get(tx.divisionId);
                  const isIncome = tx.type === 'income';
                  const isFeatured = idx === 0;
                  return (
                    <div key={tx.id} className="onyx-todo-row">
                      <span
                        className={`onyx-todo-icon ${isFeatured ? 'featured' : ''}`}
                        aria-hidden="true"
                      >
                        {cat?.icon ?? '🧾'}
                      </span>

                      <div className="onyx-todo-copy">
                        <div className="onyx-todo-title">
                          {tx.note || getLocalizedName(cat, lang)}
                        </div>
                        <div className="onyx-todo-sub">
                          {formatDisplayDate(tx.date, lang)} • {getLocalizedName(div, lang)}
                        </div>
                      </div>

                      <div className="onyx-todo-right">
                        <span
                          className="onyx-todo-amt"
                          style={{ color: isIncome ? 'var(--onyx-emerald)' : 'var(--text-primary)' }}
                        >
                          {formatCurrency(isIncome ? tx.amount : -tx.amount, true)}
                        </span>
                        <span
                          className={`onyx-todo-check ${isFeatured || isIncome ? 'checked' : ''}`}
                          aria-hidden="true"
                        >
                          {(isFeatured || isIncome) && <Check size={11} strokeWidth={3} />}
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
        </div>
      </div>

      {/* RIGHT WORKSPACE COLUMN */}
      <div className="onyx-right-col onyx-right-tray">
        {/* TOP UTILITY TOOLBAR: Divisions Bar + Search Anything Pill + Blue + Add Entry Pill */}
        <div className="onyx-right-topbar">
          <div className="onyx-div-cluster" aria-label={t(lang, 'division')}>
            <div className="onyx-avatar-stack">
              <button
                type="button"
                className={`onyx-div-avatar ${filters.divisionId === 'all' ? 'active' : ''}`}
                onClick={() => setFilters((prev) => ({ ...prev, divisionId: 'all' }))}
                title={t(lang, 'allDivisions')}
              >
                ✨
              </button>
              {divisionSummary.slice(0, 3).map((row) => (
                <button
                  key={row.division.id}
                  type="button"
                  className={`onyx-div-avatar ${filters.divisionId === row.division.id ? 'active' : ''}`}
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      divisionId: prev.divisionId === row.division.id ? 'all' : row.division.id,
                    }))
                  }
                  title={getLocalizedName(row.division, lang)}
                >
                  {row.division.icon}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="onyx-new-member-btn"
              onClick={() => setActiveTab('categories')}
            >
              <span className="onyx-plus-circle">
                <Plus size={12} />
              </span>
              <span>
                {activeDivision
                  ? getLocalizedName(activeDivision, lang)
                  : t(lang, 'allDivisions')}
              </span>
            </button>
          </div>

          <div className="onyx-right-controls">
            <div className="onyx-search-pill">
              <Search size={14} className="onyx-search-icon" aria-hidden="true" />
              <input
                type="search"
                className="onyx-search-input"
                placeholder={t(lang, 'searchPlaceholder')}
                aria-label={t(lang, 'note')}
                value={filters.searchQuery}
                onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
              />
              {filters.searchQuery && (
                <button
                  type="button"
                  className="onyx-search-clear"
                  onClick={() => setFilters((prev) => ({ ...prev, searchQuery: '' }))}
                  aria-label={t(lang, 'clearFilters')}
                >
                  <X size={11} />
                </button>
              )}
            </div>

            <button
              type="button"
              className="onyx-blue-cta"
              onClick={() => openAddModal()}
            >
              <span className="onyx-cta-plus">
                <Plus size={13} />
              </span>
              <span>{t(lang, 'addEntry')}</span>
            </button>
          </div>
        </div>

        {/* CONNECTED FOLDER-TAB WORKSPACE SHEET */}
        <section className="onyx-folder-shell" aria-label="Period filter and flow timeline">
          <div className="onyx-folder-tabs" role="group" aria-label="Date range presets">
            {presets.map((p) => {
              const isActive = filters.preset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`onyx-folder-tab ${isActive ? 'active' : ''}`}
                  onClick={() => setFilters((prev) => ({ ...prev, preset: p.id }))}
                >
                  <span className={`onyx-tab-ico ${isActive ? 'blue' : ''}`}>
                    <Calendar size={12} />
                  </span>
                  <span>{p.label}</span>
                </button>
              );
            })}

            <button
              type="button"
              className="onyx-folder-tab"
              onClick={() => setActiveTab('reports')}
              title={t(lang, 'periodArchiveTitle')}
            >
              <span className="onyx-tab-ico">
                <Archive size={12} />
              </span>
              <span>{t(lang, 'periodArchiveQuickNav')}</span>
            </button>

            <button
              type="button"
              className="onyx-folder-tab"
              onClick={() => setActiveTab('calendar')}
              title={t(lang, 'calendarTitle')}
            >
              <span className="onyx-tab-ico">
                <CalendarDays size={12} />
              </span>
              <span>{t(lang, 'navCalendar')}</span>
            </button>

            <select
              aria-label={t(lang, 'typeLabel')}
              className="onyx-folder-select"
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

          <div className="onyx-folder-body">
            {filters.preset === 'custom' && (
              <div className="responsive-grid-2" style={{ marginBottom: 14 }}>
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

            {/* HORIZONTAL CAPSULE PILL ROWS OVER DOTTED TIMELINE AXIS */}
            <div className="onyx-timeline-stage">
              <div className="onyx-timeline-axis" aria-hidden="true" />

              {/* Row 1: Cobalt Blue Full Pill with Soft Blue Track Halo */}
              <div className="onyx-capsule-track align-left">
                <div className="onyx-capsule-backer blue-pale">
                  <button
                    type="button"
                    className="onyx-capsule-pill blue"
                    onClick={() => openAddModal({ type: 'income' })}
                  >
                    <span className="onyx-capsule-badges" aria-hidden="true">
                      <span>💰</span>
                    </span>
                    <span className="onyx-capsule-copy">
                      <strong>{t(lang, 'totalIncome')}</strong>
                      <span>
                        {formatCurrency(summary.totalIncome)} • {incomeSharePct}%
                      </span>
                    </span>
                    <span className="onyx-capsule-chip white">{t(lang, 'income')} +</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Mint Emerald Full Pill */}
              <div className="onyx-capsule-track align-center">
                <button
                  type="button"
                  className="onyx-capsule-pill emerald"
                  onClick={() => openAddModal({ type: 'expense' })}
                >
                  <span className="onyx-capsule-badges" aria-hidden="true">
                    <span>🧾</span>
                  </span>
                  <span className="onyx-capsule-copy">
                    <strong>{t(lang, 'totalExpense')}</strong>
                    <span>
                      {formatCurrency(summary.totalExpense)} • {expenseSharePct}%
                    </span>
                  </span>
                  <span className="onyx-capsule-chip white">{t(lang, 'expense')} +</span>
                </button>
              </div>

              {/* Row 3: Elevated White Full Pill over Soft Gray Track */}
              <div className="onyx-capsule-track align-right">
                <div className="onyx-capsule-backer gray-pale">
                  <button
                    type="button"
                    className="onyx-capsule-pill white"
                    onClick={() => setActiveTab('calendar')}
                  >
                    <span className="onyx-capsule-badges dark-tint" aria-hidden="true">
                      <span>⚖️</span>
                    </span>
                    <span className="onyx-capsule-copy">
                      <strong>{t(lang, 'netBalance')}</strong>
                      <span>
                        {formatCurrency(summary.balance)} • {gaugePct}%
                      </span>
                    </span>
                    <span className="onyx-capsule-chip black">{t(lang, 'navCalendar')}</span>
                  </button>
                </div>
              </div>

              {/* Division Filter Ruler Strip */}
              <div className="onyx-timeline-ruler">
                <button
                  type="button"
                  className={`onyx-ruler-chip ${filters.divisionId === 'all' ? 'active' : ''}`}
                  onClick={() => setFilters((prev) => ({ ...prev, divisionId: 'all' }))}
                >
                  {t(lang, 'allDivisions')}
                </button>
                {divisionSummary.map((row) => (
                  <button
                    key={row.division.id}
                    type="button"
                    className={`onyx-ruler-chip ${filters.divisionId === row.division.id ? 'active' : ''}`}
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        divisionId: prev.divisionId === row.division.id ? 'all' : row.division.id,
                      }))
                    }
                  >
                    {row.division.icon} {getLocalizedName(row.division, lang)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* BOTTOM SPLIT ROW: Jet-Black Spotlight Card w/ Canary Yellow CTA | White Activity Pill Card */}
        <div className="onyx-bottom-pair">
          <section className="onyx-black-card" aria-label={t(lang, 'periodArchiveTitle')}>
            <div className="onyx-black-deco" aria-hidden="true" />
            <div className="onyx-black-content">
              <h3 className="onyx-black-title">{t(lang, 'periodArchiveTitle')}</h3>
              <div className="onyx-black-meta">
                <span className="onyx-black-dot">📁</span>
                <span>
                  {archives.length} {t(lang, 'storedBadge')} • {formatCurrency(summary.balance)}
                </span>
              </div>
              <button
                type="button"
                className="onyx-yellow-cta"
                onClick={() => setActiveTab('reports')}
              >
                <span>{t(lang, 'navReports')}</span>
                <ArrowUpRight size={15} />
              </button>
            </div>
          </section>

          <section className="card onyx-activity-card" aria-label={t(lang, 'viewByCategory')}>
            <div className="onyx-card-head">
              <h3 className="onyx-card-title">{t(lang, 'viewByCategory')}</h3>
              <button
                type="button"
                className="onyx-text-link"
                onClick={() => setActiveTab('categories')}
              >
                {t(lang, 'navCategories')} →
              </button>
            </div>

            <div className="onyx-activity-body">
              <div className="onyx-activity-kpis">
                <div className="onyx-act-kpi">
                  <strong>{incomeSharePct}%</strong>
                  <span>
                    <i className="onyx-dot blue" aria-hidden="true" />
                    {t(lang, 'income')}
                  </span>
                </div>
                <div className="onyx-act-kpi">
                  <strong>{expenseSharePct}%</strong>
                  <span>
                    <i className="onyx-dot emerald" aria-hidden="true" />
                    {t(lang, 'expense')}
                  </span>
                </div>
              </div>

              <div className="onyx-activity-pills-col">
                <div className="onyx-black-callout">
                  <span className="onyx-callout-ring" aria-hidden="true" />
                  <div className="onyx-callout-box">
                    <strong>{formatCurrency(summary.balance)}</strong>
                    <span>
                      {t(lang, 'savingsRate')}: {gaugePct}% • {summary.transactionCount}{' '}
                      {t(lang, 'entriesCount')}
                    </span>
                  </div>
                </div>

                {activeCapsules.length > 0 ? (
                  <div className="onyx-pill-tracks">
                    {activeCapsules.map((row, idx) => {
                      const vol = row.income + row.expense;
                      const pct =
                        totalFlow > 0 ? Math.max(18, Math.round((vol / totalFlow) * 100)) : 20;
                      return (
                        <button
                          key={row.category.id}
                          type="button"
                          className="onyx-pill-track-row"
                          onClick={() => setActiveTab('categories')}
                        >
                          <span className="onyx-pill-track-lbl">
                            {row.category.icon} {getLocalizedName(row.category, lang)}
                          </span>
                          <div className="onyx-pill-track-bar">
                            <div
                              className={`onyx-pill-track-fill ${idx % 2 === 0 ? 'blue' : 'emerald'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="onyx-pill-track-val">{formatCurrency(vol)}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ alignSelf: 'flex-start', padding: '7px 14px', fontSize: '0.78rem' }}
                    onClick={() => setActiveTab('categories')}
                  >
                    <FolderKanban size={14} />
                    <span>{t(lang, 'viewByCategory')}</span>
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
