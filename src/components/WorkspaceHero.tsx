import { Layers, Plus, Receipt, Search, Wallet } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, t } from '../i18n/translations';

export function WorkspaceHero() {
  const { settings, summary, filters, setFilters, openAddModal } = useFinance();
  const lang = settings.language;

  const totalFlow = summary.totalIncome + summary.totalExpense;
  const incomePct = totalFlow > 0 ? Math.round((summary.totalIncome / totalFlow) * 100) : 50;
  const expensePct = totalFlow > 0 ? 100 - incomePct : 50;

  return (
    <section className="crextio-hero no-print" aria-label="Workspace overview">
      <div className="crextio-greeting-row">
        <div>
          <h2 className="hero-title">{t(lang, 'appName')}</h2>
          <p className="hero-subtitle">{t(lang, 'appTagline')}</p>
        </div>

        <div className="hero-toolbar">
          <div className="search-pill-wrap">
            <Search size={15} className="search-pill-icon" />
            <input
              type="search"
              className="search-pill-input"
              placeholder={t(lang, 'searchPlaceholder')}
              aria-label={t(lang, 'note')}
              value={filters.searchQuery}
              onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
            />
          </div>

          <button type="button" className="btn-primary" onClick={() => openAddModal()}>
            <Plus size={17} />
            <span>{t(lang, 'addEntry')}</span>
          </button>
        </div>
      </div>

      {/* Crextio Segmented Progress Bar + Hero Numerals */}
      <div className="crextio-strip-row">
        <div className="segmented-progress-bar" aria-hidden="true">
          <div
            className="seg-pill navy"
            style={{ width: `${Math.max(22, Math.min(62, incomePct))}%` }}
          >
            {t(lang, 'income')} {incomePct}%
          </div>
          <div
            className="seg-pill cobalt"
            style={{ width: `${Math.max(20, Math.min(54, expensePct))}%` }}
          >
            {t(lang, 'expense')} {expensePct}%
          </div>
          <div className="seg-pill hatched" style={{ flex: 1 }}>
            {t(lang, 'savingsRate')} {summary.savingsRate}%
          </div>
        </div>

        <div className="hero-big-stats">
          <div className="hero-stat-item">
            <span className="hero-stat-num" style={{ color: 'var(--income)' }}>
              {formatCurrency(summary.totalIncome)}
            </span>
            <span className="hero-stat-label">
              <Wallet size={13} /> {t(lang, 'totalIncome')}
            </span>
          </div>

          <div className="hero-stat-item">
            <span className="hero-stat-num" style={{ color: 'var(--accent)' }}>
              {formatCurrency(summary.totalExpense)}
            </span>
            <span className="hero-stat-label">
              <Layers size={13} /> {t(lang, 'totalExpense')}
            </span>
          </div>

          <div className="hero-stat-item">
            <span className="hero-stat-num">{summary.transactionCount}</span>
            <span className="hero-stat-label">
              <Receipt size={13} /> {t(lang, 'transactionsCount')}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
