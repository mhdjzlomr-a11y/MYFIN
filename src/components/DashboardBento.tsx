import {
  Archive,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowUpRight,
  Calendar,
  Edit3,
  FileText,
  FolderKanban,
  Info,
  ListOrdered,
  Maximize2,
  PieChart,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Wallet,
} from 'lucide-react';
import { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDisplayDate, getLocalizedName, t } from '../i18n/translations';
import type { DateFilterPreset, TransactionType } from '../types/finance';

const SPOKE_COUNT = 44;

function RadialSpokeGauge({
  percent,
  activeColor,
  isPrimary,
  icon,
}: {
  percent: number;
  activeColor: string;
  isPrimary?: boolean;
  icon: JSX.Element;
}) {
  const litSpokes = Math.round((Math.max(0, Math.min(100, percent)) / 100) * SPOKE_COUNT);

  return (
    <div className="ux-spoke-wrap">
      <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true">
        {Array.from({ length: SPOKE_COUNT }).map((_, i) => {
          const angle = (i * 360) / SPOKE_COUNT - 90;
          const rad = (angle * Math.PI) / 180;
          const r1 = 31;
          const r2 = 40;
          const x1 = 44 + Math.cos(rad) * r1;
          const y1 = 44 + Math.sin(rad) * r1;
          const x2 = 44 + Math.cos(rad) * r2;
          const y2 = 44 + Math.sin(rad) * r2;
          const isLit = i < litSpokes;
          return (
            <line
              key={i}
              x1={x1.toFixed(2)}
              y1={y1.toFixed(2)}
              x2={x2.toFixed(2)}
              y2={y2.toFixed(2)}
              stroke={isLit ? activeColor : 'var(--bg-track)'}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <span className={`ux-spoke-center ${isPrimary ? 'primary' : ''}`}>{icon}</span>
    </div>
  );
}

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
  const categoryActivityPct =
    categories.length > 0
      ? Math.round(
          (categorySummary.filter((r) => r.income + r.expense > 0).length / categories.length) * 100,
        )
      : 0;

  const presets: Array<{ id: DateFilterPreset; label: string }> = [
    { id: 'daily', label: t(lang, 'filterDaily') },
    { id: 'weekly', label: t(lang, 'filterWeekly') },
    { id: 'monthly', label: t(lang, 'filterMonthly') },
    { id: 'all', label: t(lang, 'filterAll') },
    { id: 'custom', label: t(lang, 'filterCustom') },
  ];

  const activeCapsules = useMemo(
    () => categorySummary.filter((r) => r.income + r.expense > 0).slice(0, 7),
    [categorySummary],
  );

  const recentRows = filteredTransactions.slice(0, 5);
  const activeDivision = divisions.find((d) => d.id === filters.divisionId);

  return (
    <div className="ux-bento-layout">
      {/* LEFT COLUMN: Overview Geometric Balance + Numbered Checklist | Bottom Emerald Torus CTA */}
      <div className="ux-left-col">
        <section className="card ux-overview-card" aria-label={t(lang, 'viewByCategory')}>
          <div className="ux-card-head">
            <h3 className="ux-card-title">{t(lang, 'viewByCategory')}</h3>
            <button
              type="button"
              className="ux-circle-icon-btn"
              onClick={() => setActiveTab('categories')}
              aria-label={t(lang, 'navCategories')}
              title={t(lang, 'navCategories')}
            >
              <SlidersHorizontal size={14} />
            </button>
          </div>

          {/* Clean Decorative Polygon Frame around Net Balance (No data chart/graph) */}
          <div className="ux-geo-frame">
            <svg
              className="ux-geo-svg"
              viewBox="0 0 180 156"
              fill="none"
              aria-hidden="true"
            >
              <polygon
                points="90,6 164,42 164,114 90,150 16,114 16,42"
                stroke="var(--border-color)"
                strokeWidth="1.2"
              />
              <polygon
                points="90,26 144,52 144,104 90,130 36,104 36,52"
                stroke="var(--border-color)"
                strokeWidth="1"
              />
              <line x1="90" y1="6" x2="90" y2="150" stroke="var(--border-color)" strokeWidth="0.9" />
              <line x1="16" y1="42" x2="164" y2="114" stroke="var(--border-color)" strokeWidth="0.9" />
              <line x1="164" y1="42" x2="16" y2="114" stroke="var(--border-color)" strokeWidth="0.9" />
            </svg>
            <div className="ux-geo-center">
              <span className="ux-muted-label">{t(lang, 'netBalance')}</span>
              <div className="ux-big-figure">{formatCurrency(summary.balance)}</div>
              <span className="ux-status-chip good">{gaugePct}%</span>
            </div>
          </div>

          <div className="ux-div-pills" aria-label={t(lang, 'division')}>
            <button
              type="button"
              className={`ux-div-pill ${filters.divisionId === 'all' ? 'active' : ''}`}
              onClick={() => setFilters((prev) => ({ ...prev, divisionId: 'all' }))}
            >
              ✨ {t(lang, 'allDivisions')}
            </button>
            {divisionSummary.map((row) => (
              <button
                key={row.division.id}
                type="button"
                className={`ux-div-pill ${filters.divisionId === row.division.id ? 'active' : ''}`}
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

          {activeCapsules.length > 0 ? (
            <div className="ux-score-list">
              {activeCapsules.map((row, idx) => {
                const vol = row.income + row.expense;
                const pct = totalFlow > 0 ? Math.round((vol / totalFlow) * 100) : 0;
                const badgeTier =
                  row.income > row.expense ? 'good' : pct >= 35 ? 'warn' : pct >= 18 ? 'mid' : 'good';
                return (
                  <button
                    key={row.category.id}
                    type="button"
                    className="ux-score-row"
                    onClick={() => setActiveTab('categories')}
                    title={`${getLocalizedName(row.category, lang)}: ${formatCurrency(vol)}`}
                  >
                    <span className="ux-score-num">{idx + 1}</span>
                    <span className="ux-score-name">
                      {row.category.icon} {getLocalizedName(row.category, lang)}
                    </span>
                    <span className="ux-score-dots" aria-hidden="true" />
                    <span className={`ux-score-badge ${badgeTier}`}>{pct}%</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="ux-empty-mini">
              <PieChart size={16} color="var(--text-muted)" />
              <span>{t(lang, 'noChartData')}</span>
            </div>
          )}
        </section>

        <section className="ux-emerald-promo" aria-label="Quick entry action">
          {/* Translucent 3D Mint Torus & Tilted Card SVG matching reference illustration */}
          <svg
            className="ux-promo-torus"
            width="124"
            height="124"
            viewBox="0 0 124 124"
            fill="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="uxTorusGrad" x1="18" y1="18" x2="108" y2="108" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.65" />
              </linearGradient>
            </defs>
            <circle
              cx="74"
              cy="76"
              r="34"
              stroke="url(#uxTorusGrad)"
              strokeWidth="22"
              opacity="0.92"
            />
            <circle
              cx="74"
              cy="76"
              r="23"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="1.5"
            />
            <g transform="translate(52, 24) rotate(14)">
              <rect
                x="0"
                y="0"
                width="34"
                height="34"
                rx="9"
                fill="rgba(255,255,255,0.88)"
              />
              <rect x="10" y="10" width="14" height="14" rx="4" fill="#f59e0b" />
            </g>
          </svg>

          <div className="ux-promo-content">
            <div className="ux-promo-eyebrow">
              {summary.transactionCount} {t(lang, 'entriesCount')}
            </div>
            <h3 className="ux-promo-title">{t(lang, 'appTagline')}</h3>
            <div className="ux-promo-actions">
              <button
                type="button"
                className="ux-promo-cta"
                onClick={() => openAddModal()}
              >
                <Plus size={14} />
                <span>{t(lang, 'addEntry')}</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* RIGHT WORKSPACE COLUMN */}
      <div className="ux-right-col">
        <section className="card ux-workspace-card" aria-label="Period filter and transactions">
          <div className="ux-workspace-head">
            <h3 className="ux-card-title">{t(lang, 'recentTransactions')}</h3>

            <div className="ux-subtab-pill-row" role="group" aria-label="Date range presets">
              {presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`ux-subtab-pill ${filters.preset === p.id ? 'active' : ''}`}
                  onClick={() => setFilters((prev) => ({ ...prev, preset: p.id }))}
                >
                  {p.label}
                </button>
              ))}

              <button
                type="button"
                className="ux-subtab-pill"
                onClick={() => setActiveTab('reports')}
                title={t(lang, 'periodArchiveTitle')}
              >
                <Archive size={12} />
                <span>{t(lang, 'periodArchiveQuickNav')}</span>
              </button>
            </div>

            <div className="ux-head-right-tools">
              <select
                aria-label={t(lang, 'typeLabel')}
                className="input-control ux-type-select"
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

              <button
                type="button"
                className="ux-circle-icon-btn"
                onClick={() => setActiveTab('transactions')}
                aria-label={t(lang, 'navTransactions')}
                title={t(lang, 'navTransactions')}
              >
                <ListOrdered size={14} />
              </button>
              <button
                type="button"
                className="ux-circle-icon-btn"
                onClick={() => setActiveTab('calendar')}
                aria-label={t(lang, 'navCalendar')}
                title={t(lang, 'navCalendar')}
              >
                <ArrowUpRight size={14} />
              </button>
            </div>
          </div>

          {filters.preset === 'custom' && (
            <div className="responsive-grid-2">
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

          {/* ARCHITECTURAL OUTER DOTTED STAGE wrapping elevated window card + flow stack */}
          <div className="ux-dotted-stage">
            <div className="ux-showcase-split">
              <section className="ux-preview-window" aria-label="Transactions list">
                <div className="ux-window-bar">
                  <div className="ux-window-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
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
                    <Wallet size={26} color="var(--ux-emerald)" />
                    <h3>{t(lang, 'noTransactionsTitle')}</h3>
                    <p>{t(lang, 'noTransactionsDesc')}</p>
                    <div className="actions-toolbar" style={{ justifyContent: 'center' }}>
                      <button type="button" className="btn-primary" onClick={() => openAddModal()}>
                        <Plus size={14} />
                        <span>{t(lang, 'addEntry')}</span>
                      </button>
                      <button type="button" className="btn-secondary" onClick={loadSampleData}>
                        <Sparkles size={14} />
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

                <div className="ux-window-corner">
                  <button
                    type="button"
                    className="ux-circle-icon-btn"
                    onClick={() => setActiveTab('transactions')}
                    aria-label={t(lang, 'navTransactions')}
                    title={t(lang, 'navTransactions')}
                  >
                    <Maximize2 size={12} />
                  </button>
                </div>
              </section>

              <div className="ux-flow-stack">
                <button
                  type="button"
                  className="ux-flow-card"
                  onClick={() => openAddModal({ type: 'income' })}
                >
                  <div className="ux-flow-left">
                    <span className="ux-flow-label">{t(lang, 'totalIncome')}</span>
                    <span className="ux-status-chip good">{t(lang, 'income')}</span>
                  </div>
                  <div className="ux-flow-right">
                    <strong className="ux-flow-pct">{incomeSharePct}%</strong>
                    <span className="ux-flow-amt">{formatCurrency(summary.totalIncome)}</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="ux-flow-card"
                  onClick={() => openAddModal({ type: 'expense' })}
                >
                  <div className="ux-flow-left">
                    <span className="ux-flow-label">{t(lang, 'totalExpense')}</span>
                    <span className="ux-status-chip warn">{t(lang, 'expense')}</span>
                  </div>
                  <div className="ux-flow-right">
                    <strong className="ux-flow-pct">{expenseSharePct}%</strong>
                    <span className="ux-flow-amt">{formatCurrency(summary.totalExpense)}</span>
                  </div>
                </button>

                <div className="ux-info-note">
                  <Info size={14} />
                  <span>
                    {archives.length} {t(lang, 'storedBadge')} • {t(lang, 'calendarTitle')}
                  </span>
                </div>

                <button
                  type="button"
                  className="ux-plus-bar"
                  onClick={() => openAddModal()}
                  aria-label={t(lang, 'addEntry')}
                  title={t(lang, 'addEntry')}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div className="ux-stage-tags">
              <div className="ux-joined-tag-pair">
                <span className="ux-joined-tag-left">
                  {activeDivision
                    ? `${activeDivision.icon} ${getLocalizedName(activeDivision, lang)}`
                    : `✨ ${t(lang, 'allDivisions')}`}
                </span>
                <span className="ux-joined-tag-right">
                  {summary.transactionCount} {t(lang, 'entriesCount')}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* BOTTOM SPLIT ROW: 44-Spoke Radial Gauges | 3-Column Ratio Blocks */}
        <div className="ux-bottom-split">
          <section className="card ux-gauges-card" aria-label={t(lang, 'calendarTitle')}>
            <div className="ux-card-head">
              <h3 className="ux-card-title">{t(lang, 'calendarTitle')}</h3>
              <button
                type="button"
                className="ux-circle-icon-btn"
                onClick={() => setActiveTab('calendar')}
                aria-label={t(lang, 'navCalendar')}
                title={t(lang, 'navCalendar')}
              >
                <Calendar size={14} />
              </button>
            </div>

            <div className="ux-gauge-trio">
              <button
                type="button"
                className="ux-gauge-item"
                onClick={() => setActiveTab('reports')}
              >
                <RadialSpokeGauge
                  percent={gaugePct}
                  activeColor="var(--ux-emerald)"
                  isPrimary
                  icon={<ArrowUpCircle size={20} />}
                />
                <span className="ux-gauge-label">{t(lang, 'savingsRate')}</span>
                <span className="ux-gauge-sub">{gaugePct}%</span>
              </button>

              <button
                type="button"
                className="ux-gauge-item"
                onClick={() => setActiveTab('transactions')}
              >
                <RadialSpokeGauge
                  percent={expenseSharePct}
                  activeColor="var(--text-secondary)"
                  icon={<ArrowDownCircle size={20} />}
                />
                <span className="ux-gauge-label">{t(lang, 'sharePercent')}</span>
                <span className="ux-gauge-sub">{expenseSharePct}%</span>
              </button>

              <button
                type="button"
                className="ux-gauge-item"
                onClick={() => setActiveTab('categories')}
              >
                <RadialSpokeGauge
                  percent={categoryActivityPct}
                  activeColor="var(--text-secondary)"
                  icon={<FolderKanban size={19} />}
                />
                <span className="ux-gauge-label">{t(lang, 'navCategories')}</span>
                <span className="ux-gauge-sub">{categoryActivityPct}%</span>
              </button>
            </div>
          </section>

          <section className="card ux-passing-card" aria-label={t(lang, 'netBalance')}>
            <div className="ux-card-head">
              <h3 className="ux-card-title">{t(lang, 'netBalance')}</h3>
              <button
                type="button"
                className="ux-circle-icon-btn"
                onClick={() => setActiveTab('reports')}
                aria-label={t(lang, 'navReports')}
                title={t(lang, 'navReports')}
              >
                <FileText size={14} />
              </button>
            </div>

            <div className="ux-ratio-cols">
              <div className="ux-ratio-col">
                <span className="ux-muted-label">{t(lang, 'income')}</span>
                <strong className="ux-ratio-pct">{incomeSharePct}%</strong>
                <span className="ux-ratio-sub">{formatCurrency(summary.totalIncome)}</span>
              </div>
              <div className="ux-ratio-col">
                <span className="ux-muted-label">{t(lang, 'expense')}</span>
                <strong className="ux-ratio-pct">{expenseSharePct}%</strong>
                <span className="ux-ratio-sub">{formatCurrency(summary.totalExpense)}</span>
              </div>
              <div className="ux-ratio-col">
                <span className="ux-muted-label">{t(lang, 'savingsRate')}</span>
                <strong className="ux-ratio-pct">{gaugePct}%</strong>
                <span className="ux-ratio-sub">{formatCurrency(summary.balance)}</span>
              </div>
            </div>

            <div className="ux-segmented-bar" aria-hidden="true">
              <div
                className="ux-seg-block emerald"
                style={{ flexGrow: Math.max(incomeSharePct, 14) }}
              />
              <div
                className="ux-seg-block amber"
                style={{ flexGrow: Math.max(expenseSharePct, 10) }}
              />
              <div className="ux-seg-block hatched" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
