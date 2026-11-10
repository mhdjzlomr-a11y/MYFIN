import { ArrowLeft, Edit3, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { COLOR_PALETTE, EMOJI_CHOICES } from '../data/defaults';
import { formatCurrency, formatDisplayDate, getLocalizedName, t } from '../i18n/translations';
import type { CategoryType } from '../types/finance';

export function CategoryOverview() {
  const {
    settings,
    summary,
    categorySummary,
    divisionSummary,
    filteredTransactions,
    categories,
    divisions,
    filters,
    setFilters,
    resetFilters,
    addCategory,
    deleteCategory,
    addDivision,
    deleteDivision,
    openAddModal,
    openEditModal,
    deleteTransaction,
    showToast,
  } = useFinance();

  const lang = settings.language;
  const [mode, setMode] = useState<'category' | 'division'>('category');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState<'category' | 'division' | null>(null);

  // New Category / Division form fields
  const [nameMl, setNameMl] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [catType, setCatType] = useState<CategoryType>('expense');
  const [icon, setIcon] = useState(EMOJI_CHOICES[0]);
  const [color, setColor] = useState(COLOR_PALETTE[0]);

  const resetCreateForm = () => {
    setNameMl('');
    setNameEn('');
    setCatType('expense');
    setIcon(EMOJI_CHOICES[0]);
    setColor(COLOR_PALETTE[0]);
    setShowCreateForm(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameMl.trim() && !nameEn.trim()) {
      showToast('validationName', 'error');
      return;
    }
    const primary = nameMl.trim() || nameEn.trim();
    const secondary = nameEn.trim() || primary;

    if (showCreateForm === 'category') {
      const created = addCategory({
        nameMl: primary,
        nameEn: secondary,
        type: catType,
        icon,
        color,
      });
      setMode('category');
      setSelectedId(created.id);
    } else if (showCreateForm === 'division') {
      const created = addDivision({
        nameMl: primary,
        nameEn: secondary,
        icon,
        color,
      });
      setMode('division');
      setSelectedId(created.id);
    }
    resetCreateForm();
  };

  const visibleCategorySummary = useMemo(() => {
    const query = filters.searchQuery.trim().toLowerCase();
    return categorySummary.filter((row) => {
      if (filters.categoryId !== 'all' && row.category.id !== filters.categoryId) {
        return false;
      }
      if (query) {
        const text = `${row.category.nameMl} ${row.category.nameEn}`.toLowerCase();
        if (!text.includes(query) && row.count === 0) return false;
      }
      return true;
    });
  }, [categorySummary, filters.categoryId, filters.searchQuery]);

  const visibleDivisionSummary = useMemo(() => {
    const query = filters.searchQuery.trim().toLowerCase();
    return divisionSummary.filter((row) => {
      if (filters.divisionId !== 'all' && row.division.id !== filters.divisionId) {
        return false;
      }
      if (query) {
        const text = `${row.division.nameMl} ${row.division.nameEn}`.toLowerCase();
        if (!text.includes(query) && row.count === 0) return false;
      }
      return true;
    });
  }, [divisionSummary, filters.divisionId, filters.searchQuery]);

  const activeSelectionId =
    selectedId ??
    (mode === 'category' && filters.categoryId !== 'all'
      ? filters.categoryId
      : mode === 'division' && filters.divisionId !== 'all'
        ? filters.divisionId
        : null);

  const selectedCategoryRow = useMemo(
    () =>
      mode === 'category' && activeSelectionId
        ? categorySummary.find((r) => r.category.id === activeSelectionId)
        : null,
    [mode, activeSelectionId, categorySummary],
  );

  const selectedDivisionRow = useMemo(
    () =>
      mode === 'division' && activeSelectionId
        ? divisionSummary.find((r) => r.division.id === activeSelectionId)
        : null,
    [mode, activeSelectionId, divisionSummary],
  );

  const selectedTransactions = useMemo(() => {
    if (!activeSelectionId) return [];
    return filteredTransactions.filter((tx) =>
      mode === 'category' ? tx.categoryId === activeSelectionId : tx.divisionId === activeSelectionId,
    );
  }, [filteredTransactions, mode, activeSelectionId]);

  const toggleCardSelection = (id: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedId(null);
      setFilters((prev) => ({
        ...prev,
        ...(mode === 'category' ? { categoryId: 'all' } : { divisionId: 'all' }),
      }));
    } else {
      setSelectedId(id);
    }
  };

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const divisionMap = useMemo(() => new Map(divisions.map((d) => [d.id, d])), [divisions]);

  return (
    <section className="card" aria-label="Categories and Divisions unified summary">
      <div className="section-header">
        <div>
          <h2 className="section-title">{t(lang, 'categoryUnifiedTitle')}</h2>
          <p className="section-subtitle">{t(lang, 'categoryUnifiedSubtitle')}</p>
        </div>

        <div className="actions-toolbar">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowCreateForm(showCreateForm === 'category' ? null : 'category')}
          >
            <Plus size={16} />
            <span>{t(lang, 'addNewCategory')}</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowCreateForm(showCreateForm === 'division' ? null : 'division')}
          >
            <Plus size={16} />
            <span>{t(lang, 'addNewDivision')}</span>
          </button>
        </div>
      </div>

      {/* Unified Overall Summary Strip */}
      <div className="unified-banner" data-testid="unified-summary-banner">
        <div className="unified-stat">
          <span className="unified-stat-label">{t(lang, 'totalIncome')}</span>
          <span className="unified-stat-value" style={{ color: 'var(--income)' }}>
            {formatCurrency(summary.totalIncome)}
          </span>
        </div>
        <div className="unified-stat">
          <span className="unified-stat-label">{t(lang, 'totalExpense')}</span>
          <span className="unified-stat-value" style={{ color: 'var(--expense)' }}>
            {formatCurrency(summary.totalExpense)}
          </span>
        </div>
        <div className="unified-stat">
          <span className="unified-stat-label">{t(lang, 'netBalance')}</span>
          <span
            className="unified-stat-value"
            style={{ color: summary.balance < 0 ? 'var(--expense)' : 'var(--balance)' }}
          >
            {formatCurrency(summary.balance)}
          </span>
        </div>
      </div>

      {/* Inline Create Form */}
      {showCreateForm && (
        <form className="inline-add-box" onSubmit={handleCreateSubmit} style={{ marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: '0.98rem' }}>
            {showCreateForm === 'category' ? t(lang, 'newCategoryTitle') : t(lang, 'newDivisionTitle')}
          </h3>

          <div className="filter-controls-row">
            <div className="field-group">
              <label className="field-label" htmlFor="new-item-ml">
                {t(lang, 'nameMlLabel')}
              </label>
              <input
                id="new-item-ml"
                type="text"
                className="input-control"
                placeholder={
                  showCreateForm === 'category'
                    ? t(lang, 'nameMlPlaceholder')
                    : t(lang, 'divisionMlPlaceholder')
                }
                value={nameMl}
                onChange={(e) => setNameMl(e.target.value)}
                required
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="new-item-en">
                {t(lang, 'nameEnLabel')}
              </label>
              <input
                id="new-item-en"
                type="text"
                className="input-control"
                placeholder={
                  showCreateForm === 'category'
                    ? t(lang, 'nameEnPlaceholder')
                    : t(lang, 'divisionEnPlaceholder')
                }
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
              />
            </div>

            {showCreateForm === 'category' && (
              <div className="field-group">
                <label className="field-label" htmlFor="new-item-type">
                  {t(lang, 'typeLabel')}
                </label>
                <select
                  id="new-item-type"
                  className="input-control"
                  value={catType}
                  onChange={(e) => setCatType(e.target.value as CategoryType)}
                >
                  <option value="expense">{t(lang, 'expense')}</option>
                  <option value="income">{t(lang, 'income')}</option>
                  <option value="both">{t(lang, 'both')}</option>
                </select>
              </div>
            )}
          </div>

          <div className="field-group">
            <span className="field-label">{t(lang, 'pickIcon')}</span>
            <div className="picker-row">
              {EMOJI_CHOICES.map((em) => (
                <button
                  key={em}
                  type="button"
                  className={`emoji-chip ${icon === em ? 'active' : ''}`}
                  onClick={() => setIcon(em)}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          <div className="field-group">
            <span className="field-label">{t(lang, 'pickColor')}</span>
            <div className="picker-row">
              {COLOR_PALETTE.map((col) => (
                <button
                  key={col}
                  type="button"
                  className={`color-dot ${color === col ? 'active' : ''}`}
                  style={{ backgroundColor: col }}
                  onClick={() => setColor(col)}
                  aria-label={col}
                />
              ))}
            </div>
          </div>

          <div className="actions-toolbar">
            <button type="submit" className="btn-primary">
              {t(lang, 'create')}
            </button>
            <button type="button" className="btn-secondary" onClick={resetCreateForm}>
              {t(lang, 'cancel')}
            </button>
          </div>
        </form>
      )}

      {/* Mode Switcher: By Category vs By Division */}
      <div className="section-header" style={{ marginBottom: 14 }}>
        <div className="preset-pills">
          <button
            type="button"
            className={`pill-btn ${mode === 'category' ? 'active' : ''}`}
            onClick={() => {
              setMode('category');
              setSelectedId(null);
            }}
          >
            {t(lang, 'viewByCategory')} ({categories.length})
          </button>
          <button
            type="button"
            className={`pill-btn ${mode === 'division' ? 'active' : ''}`}
            onClick={() => {
              setMode('division');
              setSelectedId(null);
            }}
          >
            {t(lang, 'viewByDivision')} ({divisions.length})
          </button>
        </div>
      </div>

      {/* Focused Drill-down when a specific Category or Division is clicked */}
      {(selectedCategoryRow || selectedDivisionRow) && (
        <div
          className="inline-add-box"
          style={{ marginBottom: 18, borderStyle: 'solid' }}
          data-testid="selected-breakdown-panel"
        >
          <div className="section-header" style={{ marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                className="emoji-badge"
                style={{
                  backgroundColor: `${(selectedCategoryRow?.category ?? selectedDivisionRow?.division)!.color}22`,
                }}
              >
                {(selectedCategoryRow?.category ?? selectedDivisionRow?.division)!.icon}
              </span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem' }}>
                  {getLocalizedName(
                    selectedCategoryRow?.category ?? selectedDivisionRow?.division,
                    lang,
                  )}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {t(lang, 'selectedItemDetails')} ({selectedTransactions.length})
                </span>
              </div>
            </div>

            <div className="actions-toolbar">
              <button
                type="button"
                className="btn-primary"
                onClick={() =>
                  openAddModal(
                    mode === 'category'
                      ? {
                          categoryId: selectedCategoryRow?.category.id,
                          type:
                            selectedCategoryRow?.category.type === 'income' ? 'income' : 'expense',
                        }
                      : { divisionId: selectedDivisionRow?.division.id },
                  )
                }
              >
                <Plus size={15} />
                <span>{t(lang, 'addInThisCategory')}</span>
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setSelectedId(null);
                  setFilters((prev) => ({
                    ...prev,
                    categoryId: 'all',
                    divisionId: 'all',
                  }));
                }}
              >
                <ArrowLeft size={15} />
                <span>{t(lang, 'showAllItems')}</span>
              </button>
            </div>
          </div>

          <div className="unified-banner" style={{ marginBottom: 4 }}>
            <div className="unified-stat">
              <span className="unified-stat-label">{t(lang, 'income')}</span>
              <span className="unified-stat-value" style={{ color: 'var(--income)' }}>
                {formatCurrency((selectedCategoryRow ?? selectedDivisionRow)!.income)}
              </span>
            </div>
            <div className="unified-stat">
              <span className="unified-stat-label">{t(lang, 'expense')}</span>
              <span className="unified-stat-value" style={{ color: 'var(--expense)' }}>
                {formatCurrency((selectedCategoryRow ?? selectedDivisionRow)!.expense)}
              </span>
            </div>
            <div className="unified-stat">
              <span className="unified-stat-label">{t(lang, 'netBalance')}</span>
              <span
                className="unified-stat-value"
                style={{
                  color:
                    (selectedCategoryRow ?? selectedDivisionRow)!.balance < 0
                      ? 'var(--expense)'
                      : 'var(--balance)',
                }}
              >
                {formatCurrency((selectedCategoryRow ?? selectedDivisionRow)!.balance)}
              </span>
            </div>
          </div>

          {selectedTransactions.length > 0 ? (
            <div className="tx-table-wrap">
              <table className="tx-table">
                <thead>
                  <tr>
                    <th>{t(lang, 'date')}</th>
                    <th>{mode === 'category' ? t(lang, 'division') : t(lang, 'category')}</th>
                    <th>{t(lang, 'note')}</th>
                    <th>{t(lang, 'amount')}</th>
                    <th>{t(lang, 'actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTransactions.map((tx) => {
                    const other =
                      mode === 'category'
                        ? divisionMap.get(tx.divisionId)
                        : categoryMap.get(tx.categoryId);
                    return (
                      <tr key={tx.id}>
                        <td>{formatDisplayDate(tx.date, lang)}</td>
                        <td>
                          {other?.icon} {getLocalizedName(other, lang)}
                        </td>
                        <td>{tx.note || '—'}</td>
                        <td
                          style={{
                            fontWeight: 700,
                            color: tx.type === 'income' ? 'var(--income)' : 'var(--expense)',
                          }}
                        >
                          {formatCurrency(tx.type === 'expense' ? -tx.amount : tx.amount, true)}
                        </td>
                        <td>
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
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ margin: '4px 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              {t(lang, 'noChartData')}
            </p>
          )}
        </div>
      )}

      {/* Unified Category or Division Cards Grid */}
      {mode === 'category' ? (
        visibleCategorySummary.length === 0 ? (
          <div className="empty-state">
            <p>{t(lang, 'noChartData')}</p>
            <button type="button" className="btn-secondary" onClick={resetFilters}>
              {t(lang, 'clearFilters')}
            </button>
          </div>
        ) : (
        <div className="category-grid">
          {visibleCategorySummary.map((row) => {
            const isSelected = activeSelectionId === row.category.id;
            return (
              <div
                key={row.category.id}
                role="button"
                tabIndex={0}
                className={`category-card ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleCardSelection(row.category.id, isSelected)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleCardSelection(row.category.id, isSelected);
                  }
                }}
              >
                <div className="category-card-head">
                  <div className="category-identity">
                    <span
                      className="emoji-badge"
                      style={{ backgroundColor: `${row.category.color}22` }}
                    >
                      {row.category.icon}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.96rem' }}>
                        {getLocalizedName(row.category, lang)}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        {row.count} {t(lang, 'entriesCount')}
                        {row.category.isCustom ? ` • ${t(lang, 'customBadge')}` : ''}
                      </div>
                    </div>
                  </div>

                  {row.category.isCustom && (
                    <button
                      type="button"
                      className="mini-icon-btn danger"
                      title={t(lang, 'delete')}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(t(lang, 'confirmDeleteCustom'))) {
                          if (selectedId === row.category.id) setSelectedId(null);
                          deleteCategory(row.category.id);
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <div className="category-metrics">
                  <div className="metric-cell">
                    <span className="metric-label">{t(lang, 'income')}</span>
                    <span className="metric-num" style={{ color: 'var(--income)' }}>
                      {formatCurrency(row.income)}
                    </span>
                  </div>
                  <div className="metric-cell">
                    <span className="metric-label">{t(lang, 'expense')}</span>
                    <span className="metric-num" style={{ color: 'var(--expense)' }}>
                      {formatCurrency(row.expense)}
                    </span>
                  </div>
                  <div className="metric-cell">
                    <span className="metric-label">{t(lang, 'netBalance')}</span>
                    <span
                      className="metric-num"
                      style={{ color: row.balance < 0 ? 'var(--expense)' : 'var(--balance)' }}
                    >
                      {formatCurrency(row.balance)}
                    </span>
                  </div>
                </div>

                {row.expenseSharePercent > 0 && (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.72rem',
                        color: 'var(--text-muted)',
                        marginBottom: 4,
                      }}
                    >
                      <span>{t(lang, 'sharePercent')}</span>
                      <span>{row.expenseSharePercent}%</span>
                    </div>
                    <div className="share-bar-track">
                      <div
                        className="share-bar-fill"
                        style={{
                          width: `${Math.min(row.expenseSharePercent, 100)}%`,
                          backgroundColor: row.category.color,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )
      ) : visibleDivisionSummary.length === 0 ? (
        <div className="empty-state">
          <p>{t(lang, 'noChartData')}</p>
          <button type="button" className="btn-secondary" onClick={resetFilters}>
            {t(lang, 'clearFilters')}
          </button>
        </div>
      ) : (
        <div className="category-grid">
          {visibleDivisionSummary.map((row) => {
            const isSelected = activeSelectionId === row.division.id;
            return (
              <div
                key={row.division.id}
                role="button"
                tabIndex={0}
                className={`category-card ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleCardSelection(row.division.id, isSelected)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleCardSelection(row.division.id, isSelected);
                  }
                }}
              >
                <div className="category-card-head">
                  <div className="category-identity">
                    <span
                      className="emoji-badge"
                      style={{ backgroundColor: `${row.division.color}22` }}
                    >
                      {row.division.icon}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.96rem' }}>
                        {getLocalizedName(row.division, lang)}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        {row.count} {t(lang, 'entriesCount')}
                        {row.division.isCustom ? ` • ${t(lang, 'customBadge')}` : ''}
                      </div>
                    </div>
                  </div>

                  {row.division.isCustom && (
                    <button
                      type="button"
                      className="mini-icon-btn danger"
                      title={t(lang, 'delete')}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(t(lang, 'confirmDeleteCustom'))) {
                          if (selectedId === row.division.id) setSelectedId(null);
                          deleteDivision(row.division.id);
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <div className="category-metrics">
                  <div className="metric-cell">
                    <span className="metric-label">{t(lang, 'income')}</span>
                    <span className="metric-num" style={{ color: 'var(--income)' }}>
                      {formatCurrency(row.income)}
                    </span>
                  </div>
                  <div className="metric-cell">
                    <span className="metric-label">{t(lang, 'expense')}</span>
                    <span className="metric-num" style={{ color: 'var(--expense)' }}>
                      {formatCurrency(row.expense)}
                    </span>
                  </div>
                  <div className="metric-cell">
                    <span className="metric-label">{t(lang, 'netBalance')}</span>
                    <span
                      className="metric-num"
                      style={{ color: row.balance < 0 ? 'var(--expense)' : 'var(--balance)' }}
                    >
                      {formatCurrency(row.balance)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
