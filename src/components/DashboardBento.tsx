import {
  Archive,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowUpRight,
  Calendar,
  CalendarDays,
  ChevronRight,
  Edit3,
  PieChart,
  Plus,
  Receipt,
  Sparkles,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDisplayDate, getLocalizedName, t } from '../i18n/translations';
import type { DateFilterPreset, TransactionType } from '../types/finance';

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
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const divisionMap = useMemo(() => new Map(divisions.map((d) => [d.id, d])), [divisions]);

  const gaugePct = useMemo(() => {
    if (summary.totalIncome <= 0) return summary.totalExpense > 0 ? 0 : 100;
    return Math.max(0, Math.min(100, Math.round((summary.balance / summary.totalIncome) * 100)));
  }, [summary]);

  const totalFlow = summary.totalIncome + summary.totalExpense;
  const incomeSharePct = totalFlow > 0 ? Math.round((summary.totalIncome / totalFlow) * 100) : 50;
  const expenseSharePct = totalFlow > 0 ? 100 - incomeSharePct : 50;

  const presets: Array<{ id: DateFilterPreset; label: string }> = [
    { id: 'daily', label: t(lang, 'filterDaily') },
    { id: 'weekly', label: t(lang, 'filterWeekly') },
    { id: 'monthly', label: t(lang, 'filterMonthly') },
    { id: 'all', label: t(lang, 'filterAll') },
    { id: 'custom', label: t(lang, 'filterCustom') },
  ];

  const activeCapsules = useMemo(
    () => categorySummary.filter((r) => r.income + r.expense > 0).slice(0, 3),
    [categorySummary],
  );

  const maxCapsuleVol = useMemo(
    () => Math.max(...activeCapsules.map((c) => c.income + c.expense), 1),
    [activeCapsules],
  );

  const recentRows = filteredTransactions.slice(0, 5);
  const activeDivision = divisions.find((d) => d.id === filters.divisionId);

  return (
    <div className="sage-bento-layout">
      {/* ROW 1: My Balance Card + 3 Quick Action Tiles | Profit & Savings Summary */}
      <div className="sage-row-1">
        <section className="card" aria-label="Balance spotlight">
          <div className="section-header" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h3 className="section-title" style={{ fontSize: '1.08rem' }}>
                {t(lang, 'netBalance')}
              </h3>
              <button
                type="button"
                className="sage-mini-link"
                onClick={() => openAddModal()}
              >
                + {t(lang, 'create')}
              </button>
            </div>
            <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
              {activeDivision ? `${activeDivision.icon} ${getLocalizedName(activeDivision, lang)}` : t(lang, 'allDivisions')}
            </span>
          </div>

          <div className="sage-card-and-actions">
            <div className="sage-card-showcase">
              <div className="ice-spotlight-card sage-debit-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, opacity: 0.92 }}>
                    {t(lang, 'appName')} CARD
                  </span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, opacity: 0.94 }}>
                    {summary.transactionCount} {t(lang, 'entriesCount')}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', letterSpacing: '0.08em', opacity: 0.88, fontWeight: 600 }}>
                  •••• •••• •••• MYFIN
                </div>
              </div>

              <div className="sage-balance-meta">
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  {t(lang, 'netBalance')}
                </span>
                <div
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: 900,
                    lineHeight: 1.15,
                    color: summary.balance < 0 ? 'var(--expense)' : 'var(--text-primary)',
                  }}
                >
                  {formatCurrency(summary.balance)}
                </div>
                <button
                  type="button"
                  className="sage-mini-link"
                  onClick={() => setActiveTab('categories')}
                >
                  <span>{t(lang, 'navCategories')}</span>
                  <ArrowUpRight size={13} />
                </button>
              </div>
            </div>

            <div className="sage-quick-tiles">
              <button
                type="button"
                className="sage-action-tile"
                onClick={() => openAddModal({ type: 'income' })}
              >
                <span className="sage-tile-icon">
                  <ArrowDownCircle size={18} />
                </span>
                <span>{t(lang, 'income')}</span>
              </button>

              <button
                type="button"
                className="sage-action-tile"
                onClick={() => openAddModal({ type: 'expense' })}
              >
                <span className="sage-tile-icon">
                  <ArrowUpCircle size={18} />
                </span>
                <span>{t(lang, 'expense')}</span>
              </button>

              <button
                type="button"
                className="sage-action-tile"
                onClick={() => setActiveTab('calendar')}
              >
                <span className="sage-tile-icon">
                  <CalendarDays size={18} />
                </span>
                <span>{t(lang, 'navCalendar')}</span>
              </button>
            </div>
          </div>
        </section>

        <section className="card" aria-label="Savings ring tracker">
          <div className="section-header" style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="sage-circle-badge">
                <TrendingUp size={16} />
              </span>
              <h3 className="section-title" style={{ fontSize: '1.02rem' }}>
                {t(lang, 'savingsRate')}
              </h3>
            </div>
            <button
              type="button"
              className="sage-mini-link"
              onClick={() => setActiveTab('reports')}
            >
              <span>{t(lang, 'navReports')}</span>
              <ArrowUpRight size={13} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)' }}>
              {gaugePct}%
            </span>
            <span className="badge" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              {summary.transactionCount} {t(lang, 'entriesCount')}
            </span>
          </div>

          <div className="sage-plan-track" style={{ marginBottom: 12, height: 10 }}>
            <div className="sage-plan-fill" style={{ width: `${gaugePct}%` }} />
          </div>

          <div className="sage-spark-footer">
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--income)' }}>
              +{formatCurrency(summary.totalIncome)}
            </span>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--expense)' }}>
              -{formatCurrency(summary.totalExpense)}
            </span>
          </div>
        </section>
      </div>

      {/* ROW 2: Income Card | Expense Card | Period Filters & Quick Summary (No Graphs) */}
      <div className="sage-row-2">
        <section className="card sage-spark-card" aria-label={t(lang, 'totalIncome')}>
          <div className="section-header" style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="sage-circle-badge income">
                <ArrowDownCircle size={16} />
              </span>
              <h3 className="section-title" style={{ fontSize: '0.98rem' }}>
                {t(lang, 'income')}
              </h3>
            </div>
            <button
              type="button"
              className="arrow-circle-btn"
              onClick={() => openAddModal({ type: 'income' })}
              title={t(lang, 'addEntry')}
            >
              <Plus size={15} />
            </button>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {t(lang, 'totalIncome')}
          </div>

          <div className="sage-spark-footer">
            <span style={{ fontSize: '1.42rem', fontWeight: 900, color: 'var(--income)' }}>
              +{formatCurrency(summary.totalIncome)}
            </span>
            <span className="badge badge-income">+{incomeSharePct}%</span>
          </div>
        </section>

        <section className="card sage-spark-card" aria-label={t(lang, 'totalExpense')}>
          <div className="section-header" style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="sage-circle-badge expense">
                <ArrowUpCircle size={16} />
              </span>
              <h3 className="section-title" style={{ fontSize: '0.98rem' }}>
                {t(lang, 'expense')}
              </h3>
            </div>
            <button
              type="button"
              className="arrow-circle-btn"
              onClick={() => openAddModal({ type: 'expense' })}
              title={t(lang, 'addEntry')}
            >
              <Plus size={15} />
            </button>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {t(lang, 'totalExpense')}
          </div>

          <div className="sage-spark-footer">
            <span style={{ fontSize: '1.42rem', fontWeight: 900, color: 'var(--expense)' }}>
              -{formatCurrency(summary.totalExpense)}
            </span>
            <span className="badge badge-expense">-{expenseSharePct}%</span>
          </div>
        </section>

        <section className="card" aria-label="Period filter and quick totals">
          <div className="folder-tabs-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="sage-circle-badge">
                <Receipt size={15} />
              </span>
              <h3 className="section-title" style={{ fontSize: '0.98rem' }}>
                {t(lang, 'reportsTitle')}
              </h3>
            </div>

            <select
              aria-label={t(lang, 'typeLabel')}
              className="input-control"
              style={{ width: 'auto', minWidth: 100, borderRadius: '999px', padding: '5px 12px', fontSize: '0.8rem' }}
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

          <div className="folder-tabs" style={{ marginBottom: 12 }} role="group" aria-label="Date range presets">
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

            <button
              type="button"
              className="folder-tab-btn"
              onClick={() => setActiveTab('calendar')}
              title={t(lang, 'calendarTitle')}
            >
              <CalendarDays size={13} />
              <span>{t(lang, 'navCalendar')}</span>
            </button>

            <button
              type="button"
              className="folder-tab-btn"
              onClick={() => setActiveTab('reports')}
              title={t(lang, 'periodArchiveTitle')}
            >
              <Archive size={13} />
              <span>{t(lang, 'periodArchiveQuickNav')}</span>
            </button>
          </div>

          {filters.preset === 'custom' && (
            <div className="responsive-grid-2" style={{ marginBottom: 12 }}>
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

          <div className="category-metrics" style={{ paddingTop: 10 }}>
            <div className="metric-cell">
              <span className="metric-label">{t(lang, 'totalIncome')}</span>
              <span className="metric-num" style={{ color: 'var(--income)' }}>
                {formatCurrency(summary.totalIncome)}
              </span>
            </div>
            <div className="metric-cell">
              <span className="metric-label">{t(lang, 'totalExpense')}</span>
              <span className="metric-num" style={{ color: 'var(--expense)' }}>
                {formatCurrency(summary.totalExpense)}
              </span>
            </div>
            <div className="metric-cell">
              <span className="metric-label">{t(lang, 'netBalance')}</span>
              <span
                className="metric-num"
                style={{ color: summary.balance < 0 ? 'var(--expense)' : 'var(--balance)' }}
              >
                {formatCurrency(summary.balance)}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* ROW 3: Planning Categories Progress | Crisp Latest Transactions | Divisions List */}
      <div className="sage-row-3">
        <section className="card" aria-label="Period and category analytics">
          <div className="section-header" style={{ marginBottom: 12 }}>
            <h3 className="section-title" style={{ fontSize: '1rem' }}>
              {t(lang, 'viewByCategory')}
            </h3>
            <button
              type="button"
              className="sage-mini-link"
              onClick={() => setActiveTab('categories')}
            >
              {t(lang, 'navCategories')} →
            </button>
          </div>

          {activeCapsules.length > 0 ? (
            <div className="sage-plan-list">
              {activeCapsules.map((row) => {
                const vol = row.income + row.expense;
                const widthPct = Math.max(18, Math.round((vol / maxCapsuleVol) * 100));
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
                      <div
                        className="sage-plan-fill"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="empty-chart" style={{ height: 140 }}>
              <PieChart size={24} />
              <span>{t(lang, 'noChartData')}</span>
            </div>
          )}
        </section>

        <section className="card" aria-label="Transactions list">
          <div className="section-header" style={{ marginBottom: 12 }}>
            <h3 className="section-title" style={{ fontSize: '1rem' }}>
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
            <div className="empty-state" style={{ padding: '16px 6px' }}>
              <Wallet size={28} color="var(--accent)" />
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

        <section className="card" aria-label={t(lang, 'division')}>
          <div className="section-header" style={{ marginBottom: 10 }}>
            <h3 className="section-title" style={{ fontSize: '1rem' }}>
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
    </div>
  );
}
