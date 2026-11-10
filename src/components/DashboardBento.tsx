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
  ArrowDownLeft,
  ArrowRight,
  BarChart2,
  Calendar,
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

const CAPSULE_COLORS = ['#0b66ff', '#0ac775', '#111315', '#6366f1', '#f59e0b'];

export function DashboardBento() {
  const {
    summary,
    filteredTransactions,
    categorySummary,
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
  const textColor = isDark ? '#cbd5e1' : '#475467';
  const gridColor = isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(17, 19, 21, 0.06)';

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const divisionMap = useMemo(() => new Map(divisions.map((d) => [d.id, d])), [divisions]);

  // Semi-circular Gauge Calculations (Blue expense utilization + Mint savings)
  const gaugePct = useMemo(() => {
    if (summary.totalIncome <= 0) return summary.totalExpense > 0 ? 0 : 100;
    return Math.max(0, Math.min(100, Math.round((summary.balance / summary.totalIncome) * 100)));
  }, [summary]);

  const arcRadius = 86;
  const arcLength = Math.PI * arcRadius;
  const blueRatio =
    summary.totalIncome > 0
      ? Math.min(1, summary.totalExpense / summary.totalIncome)
      : summary.totalExpense > 0
        ? 1
        : 0;
  const greenRatio = summary.totalIncome > 0 ? Math.max(0, Math.min(1, gaugePct / 100)) : 0;

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
    () => categorySummary.filter((r) => r.income + r.expense > 0).slice(0, 4),
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
          backgroundColor: '#0ac775',
          borderRadius: 12,
          borderSkipped: false as const,
          maxBarThickness: 28,
        },
        {
          label: t(lang, 'expense'),
          data: timeSeries.expense,
          backgroundColor: '#0b66ff',
          borderRadius: 12,
          borderSkipped: false as const,
          maxBarThickness: 28,
        },
      ],
    }),
    [timeSeries, lang],
  );

  const barOptions: ChartOptions<'bar'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: { color: textColor, boxWidth: 10, usePointStyle: true, pointStyle: 'circle' },
        },
        tooltip: {
          backgroundColor: '#111315',
          titleColor: '#ffffff',
          bodyColor: '#e2e8f0',
          padding: 12,
          cornerRadius: 12,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(Number(ctx.raw ?? 0))}`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: textColor, font: { size: 11 } },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: textColor,
            font: { size: 11 },
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
            i === 0 ? '#0b66ff' : i === 1 ? '#0ac775' : r.category.color,
          ),
          borderColor: isDark ? '#161a23' : '#ffffff',
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
            boxWidth: 10,
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 10,
            font: { size: 11 },
          },
        },
        tooltip: {
          backgroundColor: '#111315',
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

  return (
    <div className="bento-grid">
      {/* LEFT BENTO PANEL (Gauge + Recent Todo-style Transactions with Edit & Delete) */}
      <div className="bento-left-panel">
        <div className="bento-shell-box">
          {/* Card 1: Semi-Circular Savings / Balance Progress Card */}
          <section className="card" aria-label="Balance progress">
            <div className="section-header" style={{ marginBottom: 6 }}>
              <h3 className="section-title">{t(lang, 'savingsRate')}</h3>
              <span
                style={{
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  color: 'var(--accent)',
                  background: 'var(--accent-soft)',
                  padding: '3px 10px',
                  borderRadius: '999px',
                }}
              >
                {summary.transactionCount} {t(lang, 'entriesCount')}
              </span>
            </div>

            <div className="gauge-wrap">
              <div className="gauge-svg-box">
                <svg viewBox="0 0 220 120" width="220" height="120" aria-hidden="true">
                  <path
                    d="M 24 106 A 86 86 0 0 1 196 106"
                    fill="none"
                    stroke="var(--bg-track)"
                    strokeWidth="22"
                    strokeLinecap="round"
                  />
                  {blueRatio > 0 && (
                    <path
                      d="M 24 106 A 86 86 0 0 1 196 106"
                      fill="none"
                      stroke="#0b66ff"
                      strokeWidth="22"
                      strokeLinecap="round"
                      strokeDasharray={`${arcLength * blueRatio} ${arcLength}`}
                    />
                  )}
                  {greenRatio > 0 && (
                    <path
                      d="M 24 106 A 86 86 0 0 1 196 106"
                      fill="none"
                      stroke="#0ac775"
                      strokeWidth="22"
                      strokeLinecap="round"
                      strokeDasharray={`${arcLength * greenRatio} ${arcLength}`}
                      strokeDashoffset={-arcLength * Math.min(blueRatio, 1 - greenRatio)}
                    />
                  )}
                </svg>

                <div className="gauge-center-text">
                  <span className="gauge-pct">{gaugePct}%</span>
                  <span className="gauge-caption">{t(lang, 'netBalance')}</span>
                </div>
              </div>

              <div className="gauge-metrics-row">
                <div className="gauge-metric-item">
                  <span className="gauge-metric-num" style={{ color: 'var(--income)' }}>
                    {formatCurrency(summary.totalIncome)}
                  </span>
                  <span className="gauge-metric-label">
                    <span className="dot-indicator" style={{ background: '#0ac775' }} />
                    {t(lang, 'income')}
                  </span>
                </div>

                <div className="gauge-metric-item">
                  <span className="gauge-metric-num" style={{ color: 'var(--accent)' }}>
                    {formatCurrency(summary.totalExpense)}
                  </span>
                  <span className="gauge-metric-label">
                    <span className="dot-indicator" style={{ background: '#0b66ff' }} />
                    {t(lang, 'expense')}
                  </span>
                </div>

                <div className="gauge-metric-item">
                  <span
                    className="gauge-metric-num"
                    style={{ color: summary.balance < 0 ? 'var(--expense)' : 'var(--text-primary)' }}
                  >
                    {formatCurrency(summary.balance)}
                  </span>
                  <span className="gauge-metric-label">
                    <span className="dot-indicator" style={{ background: '#facc15' }} />
                    {t(lang, 'netBalance')}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Card 2: Recent Transactions List with Direct Edit & Delete */}
          <section className="card" aria-label="Transactions list">
            <div className="section-header" style={{ marginBottom: 12 }}>
              <h3 className="section-title">{t(lang, 'recentTransactions')}</h3>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '5px 11px', fontSize: '0.76rem' }}
                onClick={() => setActiveTab('transactions')}
              >
                {t(lang, 'all')} <ArrowRight size={13} />
              </button>
            </div>

            {recentRows.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px 8px' }}>
                <Wallet size={30} color="var(--accent)" />
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
              <div className="todo-tx-list">
                {recentRows.map((tx) => {
                  const cat = categoryMap.get(tx.categoryId);
                  const div = divisionMap.get(tx.divisionId);
                  const isIncome = tx.type === 'income';
                  return (
                    <div key={tx.id} className="todo-tx-row">
                      <div className="todo-tx-left">
                        <span
                          className="todo-tx-icon"
                          style={{
                            backgroundColor: isIncome
                              ? 'var(--income-soft)'
                              : 'var(--accent-soft)',
                          }}
                        >
                          {cat?.icon ?? '🧾'}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div className="todo-tx-title">
                            {tx.note || getLocalizedName(cat, lang)}
                          </div>
                          <div className="todo-tx-sub">
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
                            <Edit3 size={13} />
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
                            <Trash2 size={13} />
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

      {/* RIGHT BENTO STACK */}
      <div className="bento-right-stack">
        {/* Top Tabbed Card: Period Presets + Category Capsule Timeline & Doughnut */}
        <section className="card" aria-label="Analytics timeline and category breakdown">
          <div className="folder-tabs-row">
            <div className="folder-tabs" role="group" aria-label="Date range presets">
              {presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`folder-tab-btn ${filters.preset === p.id ? 'active' : ''}`}
                  onClick={() => setFilters((prev) => ({ ...prev, preset: p.id }))}
                >
                  <Calendar size={14} />
                  <span>{p.label}</span>
                </button>
              ))}
            </div>

            <select
              aria-label={t(lang, 'typeLabel')}
              className="input-control"
              style={{ width: 'auto', minWidth: 120, borderRadius: '999px', padding: '6px 12px' }}
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
                marginBottom: 16,
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
                <h3 className="section-title" style={{ fontSize: '0.96rem' }}>
                  {t(lang, 'viewByCategory')}
                </h3>
                <button
                  type="button"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--accent)',
                    fontSize: '0.8rem',
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
                <div className="empty-chart" style={{ height: 180 }}>
                  <PieChart size={28} />
                  <span>{t(lang, 'noChartData')}</span>
                </div>
              )}
            </div>

            <div>
              {expenseCategories.length > 0 ? (
                <div className="chart-canvas-wrap" style={{ height: 220 }}>
                  <Doughnut data={doughnutData} options={doughnutOptions} />
                </div>
              ) : (
                <div className="empty-chart" style={{ height: 220 }}>
                  <PieChart size={28} />
                  <span>{t(lang, 'categoryExpenseChart')}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Bottom Split: Dark Featured Onyx Card + Rounded Activity Bar Chart */}
        <div className="bottom-bento-split">
          <section className="onyx-featured-card" aria-label="Balance spotlight">
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>
                  {t(lang, 'netBalance')}
                </span>
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '999px',
                    background: 'rgba(255,255,255,0.1)',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <ArrowDownLeft size={15} color="#facc15" />
                </span>
              </div>

              <h3 className="onyx-card-title">{t(lang, 'categoryUnifiedTitle').split('—')[0]}</h3>
              <div
                className="onyx-balance-big"
                style={{ color: summary.balance < 0 ? '#f87171' : '#ffffff' }}
              >
                {formatCurrency(summary.balance)}
              </div>

              <div className="onyx-meta-row" style={{ marginTop: 10 }}>
                <span>
                  {t(lang, 'income')}:{' '}
                  <strong style={{ color: '#14d484' }}>{formatCurrency(summary.totalIncome)}</strong>
                </span>
                <span>•</span>
                <span>
                  {t(lang, 'expense')}:{' '}
                  <strong style={{ color: '#60a5fa' }}>{formatCurrency(summary.totalExpense)}</strong>
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn-solar"
              onClick={() => setActiveTab('categories')}
            >
              <span>{t(lang, 'navCategories')}</span>
              <ArrowRight size={16} />
            </button>
          </section>

          <section className="card" aria-label="Income vs Expense activity">
            <div className="section-header" style={{ marginBottom: 8 }}>
              <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <BarChart2 size={17} color="var(--accent)" />
                <span>{t(lang, 'incomeVsExpenseChart')}</span>
              </h3>
            </div>

            <div className="activity-split">
              <div className="activity-numbers">
                <div>
                  <div className="activity-num-big" style={{ color: 'var(--income)' }}>
                    {formatCurrency(summary.totalIncome)}
                  </div>
                  <div className="gauge-metric-label">
                    <span className="dot-indicator" style={{ background: '#0ac775' }} />
                    {t(lang, 'income')}
                  </div>
                </div>

                <div>
                  <div className="activity-num-big" style={{ color: 'var(--accent)' }}>
                    {formatCurrency(summary.totalExpense)}
                  </div>
                  <div className="gauge-metric-label">
                    <span className="dot-indicator" style={{ background: '#0b66ff' }} />
                    {t(lang, 'expense')}
                  </div>
                </div>
              </div>

              {hasBarData ? (
                <div className="chart-canvas-wrap" style={{ height: 210 }}>
                  <Bar data={barData} options={barOptions} />
                </div>
              ) : (
                <div className="empty-chart" style={{ height: 210 }}>
                  <BarChart2 size={28} />
                  <span>{t(lang, 'noChartData')}</span>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
