import { Plus, Search } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { getLocalizedName, t } from '../i18n/translations';
import { getPeriodLabel } from '../services/analytics';

export function WorkspaceHero() {
  const { settings, divisions, filters, setFilters, openAddModal, setActiveTab } = useFinance();
  const lang = settings.language;
  const periodLabel = getPeriodLabel(filters, lang);

  return (
    <section className="hero-action-row no-print" aria-label="Workspace controls">
      <div className="hero-title-wrap">
        <h2 className="hero-title">{t(lang, 'appTagline')}</h2>
        <p className="hero-subtitle">
          {t(lang, 'reportPeriod')}: {periodLabel}
        </p>
      </div>

      <div className="hero-toolbar">
        {/* Division Filter Chips (Onyx Avatar/Team Strip Model) */}
        <div className="division-chips-bar" role="group" aria-label={t(lang, 'division')}>
          <button
            type="button"
            className={`div-chip ${filters.divisionId === 'all' ? 'active' : ''}`}
            onClick={() => setFilters((prev) => ({ ...prev, divisionId: 'all' }))}
          >
            {t(lang, 'all')}
          </button>

          {divisions.slice(0, 4).map((div) => (
            <button
              key={div.id}
              type="button"
              className={`div-chip ${filters.divisionId === div.id ? 'active' : ''}`}
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  divisionId: prev.divisionId === div.id ? 'all' : div.id,
                }))
              }
            >
              <span>{div.icon}</span>
              <span>{getLocalizedName(div, lang)}</span>
            </button>
          ))}

          <button
            type="button"
            className="div-chip"
            onClick={() => setActiveTab('categories')}
            title={t(lang, 'addNewDivision')}
          >
            <Plus size={14} />
            <span>{t(lang, 'division')}</span>
          </button>
        </div>

        {/* Pill Search */}
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

        {/* Primary Royal Blue Pill CTA */}
        <button type="button" className="btn-primary" onClick={() => openAddModal()}>
          <Plus size={17} />
          <span>{t(lang, 'addEntry')}</span>
        </button>
      </div>
    </section>
  );
}
