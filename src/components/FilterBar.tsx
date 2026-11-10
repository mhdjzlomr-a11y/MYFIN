import { RotateCcw, Search } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { getLocalizedName, t } from '../i18n/translations';
import type { DateFilterPreset, TransactionType } from '../types/finance';

export function FilterBar() {
  const { settings, filters, setFilters, resetFilters, divisions, categories } = useFinance();
  const lang = settings.language;

  const presets: Array<{ id: DateFilterPreset; label: string }> = [
    { id: 'daily', label: t(lang, 'filterDaily') },
    { id: 'weekly', label: t(lang, 'filterWeekly') },
    { id: 'monthly', label: t(lang, 'filterMonthly') },
    { id: 'all', label: t(lang, 'filterAll') },
    { id: 'custom', label: t(lang, 'filterCustom') },
  ];

  const hasCustomFilters =
    filters.preset !== 'monthly' ||
    filters.divisionId !== 'all' ||
    filters.categoryId !== 'all' ||
    filters.type !== 'all' ||
    filters.searchQuery.trim() !== '';

  return (
    <section className="card filter-bar no-print" aria-label="Filters">
      <div className="filter-top-row">
        <div className="preset-pills" role="group" aria-label="Date range presets">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`pill-btn ${filters.preset === p.id ? 'active' : ''}`}
              onClick={() => setFilters((prev) => ({ ...prev, preset: p.id }))}
            >
              {p.label}
            </button>
          ))}
        </div>

        {hasCustomFilters && (
          <button type="button" className="btn-secondary" onClick={resetFilters}>
            <RotateCcw size={15} />
            <span>{t(lang, 'clearFilters')}</span>
          </button>
        )}
      </div>

      <div className="filter-controls-row">
        {filters.preset === 'custom' && (
          <>
            <div className="field-group">
              <label className="field-label" htmlFor="filter-from-date">
                {t(lang, 'fromDate')}
              </label>
              <input
                id="filter-from-date"
                type="date"
                className="input-control"
                value={filters.startDate}
                onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="filter-to-date">
                {t(lang, 'toDate')}
              </label>
              <input
                id="filter-to-date"
                type="date"
                className="input-control"
                value={filters.endDate}
                onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </>
        )}

        <div className="field-group">
          <label className="field-label" htmlFor="filter-division">
            {t(lang, 'division')}
          </label>
          <select
            id="filter-division"
            className="input-control"
            value={filters.divisionId}
            onChange={(e) => setFilters((prev) => ({ ...prev, divisionId: e.target.value }))}
          >
            <option value="all">{t(lang, 'allDivisions')}</option>
            {divisions.map((div) => (
              <option key={div.id} value={div.id}>
                {div.icon} {getLocalizedName(div, lang)}
              </option>
            ))}
          </select>
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="filter-category">
            {t(lang, 'category')}
          </label>
          <select
            id="filter-category"
            className="input-control"
            value={filters.categoryId}
            onChange={(e) => setFilters((prev) => ({ ...prev, categoryId: e.target.value }))}
          >
            <option value="all">{t(lang, 'allCategories')}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {getLocalizedName(cat, lang)}
              </option>
            ))}
          </select>
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="filter-type">
            {t(lang, 'typeLabel')}
          </label>
          <select
            id="filter-type"
            className="input-control"
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

        <div className="field-group">
          <label className="field-label" htmlFor="filter-search">
            <Search size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            {t(lang, 'note')}
          </label>
          <input
            id="filter-search"
            type="search"
            className="input-control"
            placeholder={t(lang, 'searchPlaceholder')}
            value={filters.searchQuery}
            onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
          />
        </div>
      </div>
    </section>
  );
}
