import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import {
  ArrowUpRight,
  BarChart2,
  Calendar,
  ChevronRight,
  Edit3,
  PieChart,
  Plus,
  Sparkles,
  Trash2,
  Wallet,
} from 'lucide-react';
import { useMemo } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDisplayDate, getLocalizedName, t } from '../i18n/translations';
import { computeTimeSeries } from '../services/analytics';
import type { DateFilterPreset, TransactionType } from '../types/finance';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title);

const CAPSULE_COLORS = ['#13315c', '#1c7eff', '#2c5ca8', '#0fa968'];

export function DashboardBento() {
  const {
    summary,
    filteredTransactions,
    categorySummary,
    divisionSummary,
    categories,
    divisions,
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
  const isDark = settings.theme === 'dark';
  const textColor = isDark ? '#c5d6ee' : '#3c4f6b';
  const gridColor = isDark ? 'rgba(148, 184, 232, 0.12)' : 'rgba(19, 49, 92, 0.08)';

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const divisionMap = useMemo(() => new Map(divisions.map((d) => [d.id, d])), [divisions]);

  // Circular Ring Progress (Savings / Balance ratio)
  const gaugePct = useMemo(() => {
    if (summary.totalIncome <= 0) return summary.totalExpense > 0 ? 0 : 100;
    return Math.max(0, Math.min(100, Math.round((summary.balance / summary.totalIncome) * 100)));
  }, [summary]);

  const ringRadius = 58;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - gaugePct / 100);

  const presets: Array<{ id: DateFilterPreset; label: string }> = [
    { id: 'daily', label: t(lang, 'filterDaily') },
    { id: 'weekly', label: t(lang, 'filterWeekly') },
    { id: 'monthly', label: t(lang, 'filterMonthly') },
    { id: 'all', label: t(lang, 'filterAll') },
    { id: 'custom', label: t(lang, 'filterCustom') },
  ];

  const timeSeries = useMemo(
    () =>
      computeTimeSeries(
        filteredTransactions,
        filters.preset,
        filters.startDate,
        filters.endDate,
        lang,
      ),
    [filteredTransactions, filters.preset, filters.startDate, filters.endDate, lang],
  );

  const expenseCategories = useMemo(
    () => categorySummary.filter((row) => row.expense > 0),
    [categorySummary],
  );

  const activeCapsules = useMemo(
    () => categorySummary.filter((r) => r.income + r.expense > 0).slice(0, 3),
    [categorySummary],
  );

  const maxCapsuleVol = useMemo(
    () => Math.max(...activeCapsules.map((c) => c.income + c.expense), 1),
    [activeCapsules],
  );

  const barData = useMemo(
    () => ({
      labels: timeSeries.labels,
      datasets: [
        {
          label: t(lang, 'income'),
          data: timeSeries.income,
          backgroundColor: isDark ? '#3b91ff' : '#13315c',
          borderRadius: 10,
          borderSkipped: false as const,
          maxBarThickness: 18,
        },
        {
          label: t(lang, 'expense'),
          data: timeSeries.expense,
          backgroundColor: '#1c7eff',
          borderRadius: 10,
          borderSkipped: false as const,
          maxBarThickness: 18,
        },
      ],
    }),
    [timeSeries, lang, isDark],
  );

  const barOptions: ChartOptions<'bar'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: { color: textColor, boxWidth: 8, usePointStyle: true, pointStyle: 'circle' },
        },
        tooltip: {
          backgroundColor: '#13315c',
          titleColor: '#ffffff',
          bodyColor: '#e2e8f0',
          padding: 10,
          cornerRadius: 10,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(Number(ctx.raw ?? 0))}`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: textColor, font: { size: 10 } },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: textColor,
            font: { size: 10 },
            callback: (val) => `₹${val}`,
          },
          grid: { color: gridColor },
        },
      },
    }),
    [textColor, gridColor],
  );

  const doughnutData = useMemo(
    () => ({
      labels: expenseCategories.map((r) => `${r.category.icon} ${getLocalizedName(r.category, lang)}`),
      datasets: [
        {
          data: expenseCategories.map((r) => r.expense),
          backgroundColor: expenseCategories.map((r, i) =>
            i === 0 ? '#13315c' : i === 1 ? '#1c7eff' : i === 2 ? '#5ba2ff' : r.category.color,
          ),
          borderColor: isDark ? '#122038' : '#ffffff',
          borderWidth: 3,
          hoverOffset: 6,
        },
      ],
    }),
    [expenseCategories, lang, isDark],
  );

  const doughnutOptions: ChartOptions<'doughnut'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '66%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: textColor,
            boxWidth: 9,
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 8,
            font: { size: 10.5 },
          },
        },
        tooltip: {
          backgroundColor: '#13315c',
          padding: 10,
          cornerRadius: 10,
          callbacks: {
            label: (ctx) => {
              const row = expenseCategories[ctx.dataIndex];
              const pct = row ? ` (${row.expenseSharePercent}%)` : '';
              return `${ctx.label}: ${formatCurrency(Number(ctx.raw ?? 0))}${pct}`;
            },
          },
        },
      },
    }),
    [textColor, expenseCategories],
  );

  const hasBarData =
    timeSeries.labels.length > 0 &&
    (timeSeries.income.some((v) => v > 0) || timeSeries.expense.some((v) => v > 0));

  const recentRows = filteredTransactions.slice(0, 6);
  const activeDivision = divisions.find((d) => d.id === filters.divisionId);

  return (
    <div className="crextio-bento">
      {/* COLUMN 1: Ice-Blue Balance Spotlight + Finance Divisions List */}
      <div className="crextio-col">
        <section className="ice-spotlight-card" aria-label="Balance spotlight">
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, opacity: 0.9 }}>
              {activeDivision ? `${activeDivision.icon} ${getLocalizedName(activeDivision, lang)}` : t(lang, 'allDivisions')}
            </span>
            <h3 style={{ margin: '4px 0 0', fontSize: '1.2rem', fontWeight: 800 }}>
              {t(lang, 'netBalance')}
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', opacity: 0.88 }}>
              {t(lang, 'categoryUnifiedTitle').split('—')[0]}
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              marginTop: 18,
            }}
          >
            <div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800 }}>
                {formatCurrency(summary.balance)}
              </div>
              <div style={{ fontSize: '0.72rem', opacity: 0.9 }}>
                {summary.transactionCount} {t(lang, 'entriesCount')}
              </div>
            </div>

            <button
              type="button"
              className="ice-balance-pill"
              onClick={() => setActiveTab('categories')}
            >
              <span>{t(lang, 'navCategories')}</span>
              <ArrowUpRight size={15} />
            </button>
          </div>
        </section>

        <section className="card" style={{ flex: 1 }} aria-label={t(lang, 'division')}>
          <div className="section-header" style={{ marginBottom: 10 }}>
            <h3 className="section-title" style={{ fontSize: '0.96rem' }}>
              {t(lang, 'division')}
            </h3>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '4px 10px', fontSize: '0.74rem' }}
              onClick={() => setActiveTab('categories')}
            >
              <Plus size={13} />
              <span>{t(lang, 'create')}</span>
            </button>
          </div>

          <div className="accordion-list">
            <button
              type="button"
              className={`accordion-row ${filters.divisionId === 'all' ? 'active' : ''}`}
              onClick={() => setFilters((prev) => ({ ...prev, divisionId: 'all' }))}
            >
              <span>✨ {t(lang, 'allDivisions')}</span>
              <ChevronRight size={15} color="var(--text-muted)" />
            </button>

            {divisionSummary.map((row) => (
              <button
                key={row.division.id}
                type="button"
                className={`accordion-row ${filters.divisionId === row.division.id ? 'active' : ''}`}
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    divisionId: prev.divisionId === row.division.id ? 'all' : row.division.id,
                  }))
                }
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  <span>{row.division.icon}</span>
                  <span>{getLocalizedName(row.division, lang)}</span>
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent)' }}>
                  {formatCurrency(row.balance)}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* COLUMN 2: Center Top (Progress Bar + Ring Tracker) & Bottom (Period Tabs + Category Breakdown) */}
      <div className="crextio-col">
        <div className="crextio-center-top">
          {/* Top-Left Mini Card: Progress / Income vs Expense Bar Chart */}
          <section className="card" aria-label="Income vs Expense activity">
            <div className="section-header" style={{ marginBottom: 8 }}>
              <div>
                <h3 className="section-title" style={{ fontSize: '0.96rem' }}>
                  {t(lang, 'incomeVsExpenseChart')}
                </h3>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: 2 }}>
                  {formatCurrency(summary.totalIncome)}
                </div>
              </div>
              <button
                type="button"
                className="arrow-circle-btn"
                onClick={() => setActiveTab('reports')}
                title={t(lang, 'navReports')}
              >
                <ArrowUpRight size={16} />
              </button>
            </div>

            {hasBarData ? (
              <div className="chart-canvas-wrap" style={{ height: 170 }}>
                <Bar data={barData} options={barOptions} />
              </div>
            ) : (
              <div className="empty-chart" style={{ height: 170 }}>
                <BarChart2 size={26} />
                <span>{t(lang, 'noChartData')}</span>
              </div>
            )}
          </section>

          {/* Top-Right Mini Card: Circular Ring Gauge (Time tracker style) */}
          <section className="card" aria-label="Savings ring tracker">
            <div className="section-header" style={{ marginBottom: 4 }}>
              <h3 className="section-title" style={{ fontSize: '0.96rem' }}>
                {t(lang, 'savingsRate')}
              </h3>
              <button
                type="button"
                className="arrow-circle-btn"
                onClick={() => setActiveTab('categories')}
                title={t(lang, 'navCategories')}
              >
                <ArrowUpRight size={16} />
              </button>
            </div>

            <div className="ring-gauge-wrap">
              <div className="ring-svg-box">
                <svg viewBox="0 0 150 150" width="150" height="150" aria-hidden="true">
                  <circle
                    cx="75"
                    cy="75"
                    r={ringRadius}
                    fill="none"
                    stroke="var(--bg-track)"
                    strokeWidth="9"
                    strokeDasharray="3 5"
                  />
                  <circle
                    cx="75"
                    cy="75"
                    r={ringRadius}
                    fill="none"
                    stroke="#1c7eff"
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                    transform="rotate(-90 75 75)"
                  />
                </svg>

                <div className="ring-center-val">
                  <span style={{ fontSize: '1.55rem', fontWeight: 800, lineHeight: 1.1 }}>
                    {gaugePct}%
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {t(lang, 'netBalance')}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, fontSize: '0.76rem', fontWeight: 700 }}>
                <span style={{ color: 'var(--income)' }}>
                  +{formatCurrency(summary.totalIncome)}
                </span>
                <span style={{ color: 'var(--expense)' }}>
                  -{formatCurrency(summary.totalExpense)}
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Center Bottom Wide Card: Date Filter Tabs + Category Breakdown + Doughnut */}
        <section className="card" style={{ flex: 1 }} aria-label="Period and category analytics">
          <div className="folder-tabs-row">
            <div className="folder-tabs" role="group" aria-label="Date range presets">
              {presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`folder-tab-btn ${filters.preset === p.id ? 'active' : ''}`}
                  onClick={() => setFilters((prev) => ({ ...prev, preset: p.id }))}
                >
                  <Calendar size={13} />
                  <span>{p.label}</span>
                </button>
              ))}
            </div>

            <select
              aria-label={t(lang, 'typeLabel')}
              className="input-control"
              style={{ width: 'auto', minWidth: 110, borderRadius: '999px', padding: '5px 12px', fontSize: '0.82rem' }}
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
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                marginBottom: 14,
              }}
            >
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

          <div className="timeline-split">
            <div>
              <div className="section-header" style={{ marginBottom: 10 }}>
                <h3 className="section-title" style={{ fontSize: '0.94rem' }}>
                  {t(lang, 'viewByCategory')}
                </h3>
                <button
                  type="button"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--accent)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                  }}
                  onClick={() => setActiveTab('categories')}
                >
                  {t(lang, 'navCategories')} →
                </button>
              </div>

              {activeCapsules.length > 0 ? (
                <div className="capsule-list">
                  {activeCapsules.map((row, idx) => {
                    const vol = row.income + row.expense;
                    const widthPct = Math.max(48, Math.round((vol / maxCapsuleVol) * 100));
                    const barColor = CAPSULE_COLORS[idx % CAPSULE_COLORS.length];
                    return (
                      <button
                        key={row.category.id}
                        type="button"
                        className="capsule-track"
                        onClick={() => setActiveTab('categories')}
                      >
                        <div
                          className="capsule-fill"
                          style={{ width: `${widthPct}%`, backgroundColor: barColor }}
                        >
                          <span
                            style={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {row.category.icon} {getLocalizedName(row.category, lang)}
                          </span>
                          <span>{formatCurrency(row.expense > 0 ? row.expense : row.income)}</span>
                        </div>
                        <span className="capsule-meta-pill">
                          {row.expenseSharePercent > 0
                            ? `${row.expenseSharePercent}%`
                            : `${row.count}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-chart" style={{ height: 170 }}>
                  <PieChart size={26} />
                  <span>{t(lang, 'noChartData')}</span>
                </div>
              )}
            </div>

            <div>
              {expenseCategories.length > 0 ? (
                <div className="chart-canvas-wrap" style={{ height: 195 }}>
                  <Doughnut data={doughnutData} options={doughnutOptions} />
                </div>
              ) : (
                <div className="empty-chart" style={{ height: 195 }}>
                  <PieChart size={26} />
                  <span>{t(lang, 'categoryExpenseChart')}</span>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* COLUMN 3: Stacked White Header + Deep Midnight Navy Featured Transactions List */}
      <div className="navy-stack-wrap">
        <div className="navy-stack-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{t(lang, 'navCategories')}</span>
            <span style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--navy-deep)' }}>
              {gaugePct}%
            </span>
          </div>
          <div className="segmented-progress-bar" style={{ marginTop: 10 }}>
            <div className="seg-pill cobalt" style={{ height: 18, flex: 1, fontSize: '0.68rem' }}>
              {categories.length}
            </div>
            <div className="seg-pill navy" style={{ height: 18, width: '34%', fontSize: '0.68rem' }}>
              {divisions.length}
            </div>
          </div>
        </div>

        <section className="navy-featured-card" aria-label="Transactions list">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
              {t(lang, 'recentTransactions')}
            </h3>
            <button
              type="button"
              onClick={() => setActiveTab('transactions')}
              style={{
                border: '1px solid rgba(255,255,255,0.25)',
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                borderRadius: '999px',
                padding: '3px 10px',
                fontSize: '0.78rem',
                fontWeight: 700,
              }}
            >
              {recentRows.length}/{filteredTransactions.length}
            </button>
          </div>

          {recentRows.length === 0 ? (
            <div className="empty-state" style={{ color: '#dbeafe', padding: '18px 4px' }}>
              <Wallet size={30} color="#60a5fa" />
              <h3 style={{ color: '#ffffff' }}>{t(lang, 'noTransactionsTitle')}</h3>
              <p style={{ color: '#bfdbfe' }}>{t(lang, 'noTransactionsDesc')}</p>
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
                  <div key={tx.id} className="navy-tx-row">
                    <div className="todo-tx-left">
                      <span className="navy-tx-icon">{cat?.icon ?? '🧾'}</span>
                      <div style={{ minWidth: 0 }}>
                        <div className="todo-tx-title" style={{ color: '#ffffff' }}>
                          {tx.note || getLocalizedName(cat, lang)}
                        </div>
                        <div className="todo-tx-sub" style={{ color: '#93c5fd' }}>
                          {formatDisplayDate(tx.date, lang)} • {getLocalizedName(div, lang)}
                        </div>
                      </div>
                    </div>

                    <div className="todo-tx-right">
                      <span
                        className="todo-tx-amount"
                        style={{ color: isIncome ? '#4ade80' : '#fca5a5' }}
                      >
                        {formatCurrency(isIncome ? tx.amount : -tx.amount, true)}
                      </span>

                      <div className="row-actions">
                        <button
                          type="button"
                          className="navy-mini-btn"
                          title={t(lang, 'edit')}
                          aria-label={t(lang, 'edit')}
                          onClick={() => openEditModal(tx)}
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          type="button"
                          className="navy-mini-btn danger"
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
  );
}
