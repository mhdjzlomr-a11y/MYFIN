import { Plus, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { getLocalizedName, t } from '../i18n/translations';

export function WorkspaceHero() {
  const {
    settings,
    filters,
    setFilters,
    categories,
    divisions,
    activeTab,
    setActiveTab,
    openAddModal,
  } = useFinance();
  const lang = settings.language;
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const trimmedQuery = filters.searchQuery.trim().toLowerCase();

  const matchingCategories = useMemo(() => {
    if (!trimmedQuery) return [];
    return categories.filter((c) =>
      `${c.nameMl} ${c.nameEn}`.toLowerCase().includes(trimmedQuery),
    );
  }, [categories, trimmedQuery]);

  const matchingDivisions = useMemo(() => {
    if (!trimmedQuery) return [];
    return divisions.filter((d) =>
      `${d.nameMl} ${d.nameEn}`.toLowerCase().includes(trimmedQuery),
    );
  }, [divisions, trimmedQuery]);

  const activeCategory = useMemo(
    () =>
      filters.categoryId !== 'all'
        ? categories.find((c) => c.id === filters.categoryId) ?? null
        : null,
    [categories, filters.categoryId],
  );

  const showDropdown =
    isSearchFocused &&
    trimmedQuery.length > 0 &&
    (matchingCategories.length > 0 || matchingDivisions.length > 0);

  return (
    <section className="crextio-hero no-print" aria-label="Workspace overview">
      <div className="crextio-greeting-row">
        <div>
          <h2 className="hero-title">{t(lang, 'appName')}</h2>
        </div>

        <div className="hero-toolbar">
          {activeCategory && (
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              onClick={() => setFilters((prev) => ({ ...prev, categoryId: 'all' }))}
              title={t(lang, 'clearFilters')}
            >
              <span>
                {activeCategory.icon} {getLocalizedName(activeCategory, lang)}
              </span>
              <X size={13} />
            </button>
          )}

          <div className="search-pill-wrap">
            <Search size={15} className="search-pill-icon" />
            <input
              type="search"
              className="search-pill-input"
              placeholder={t(lang, 'searchPlaceholder')}
              aria-label={t(lang, 'note')}
              value={filters.searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
            />

            {showDropdown && (
              <div className="search-dropdown" role="listbox" aria-label="Category search matches">
                {matchingCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className="search-dropdown-item"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setFilters((prev) => ({
                        ...prev,
                        categoryId: cat.id,
                        searchQuery: '',
                      }));
                      if (activeTab === 'dashboard') {
                        setActiveTab('categories');
                      }
                      setIsSearchFocused(false);
                    }}
                  >
                    <span>
                      {cat.icon} {getLocalizedName(cat, lang)}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {t(lang, 'category')}
                    </span>
                  </button>
                ))}

                {matchingDivisions.map((div) => (
                  <button
                    key={div.id}
                    type="button"
                    className="search-dropdown-item"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setFilters((prev) => ({
                        ...prev,
                        divisionId: div.id,
                        searchQuery: '',
                      }));
                      setIsSearchFocused(false);
                    }}
                  >
                    <span>
                      {div.icon} {getLocalizedName(div, lang)}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {t(lang, 'division')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button type="button" className="btn-primary" onClick={() => openAddModal()}>
            <Plus size={17} />
            <span>{t(lang, 'addEntry')}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
