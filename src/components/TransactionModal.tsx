import { Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { COLOR_PALETTE, EMOJI_CHOICES } from '../data/defaults';
import { getLocalizedName, t } from '../i18n/translations';
import { toLocalIsoDate } from '../services/analytics';
import type { TransactionType } from '../types/finance';

export function TransactionModal() {
  const {
    isTxModalOpen,
    editingTransaction,
    modalDefaults,
    closeTxModal,
    divisions,
    categories,
    settings,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addCategory,
    addDivision,
    showToast,
  } = useFinance();

  const lang = settings.language;

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(toLocalIsoDate(new Date()));
  const [divisionId, setDivisionId] = useState(divisions[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [note, setNote] = useState('');

  // Quick inline creators for Division or Category inside modal
  const [inlineMode, setInlineMode] = useState<'category' | 'division' | null>(null);
  const [newNameMl, setNewNameMl] = useState('');
  const [newNameEn, setNewNameEn] = useState('');
  const [newIcon, setNewIcon] = useState(EMOJI_CHOICES[0]);
  const [newColor, setNewColor] = useState(COLOR_PALETTE[0]);

  useEffect(() => {
    if (!isTxModalOpen) return;

    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(String(editingTransaction.amount));
      setDate(editingTransaction.date);
      setDivisionId(editingTransaction.divisionId);
      setCategoryId(editingTransaction.categoryId);
      setNote(editingTransaction.note);
    } else {
      const initialType = modalDefaults?.type ?? 'expense';
      setType(initialType);
      setAmount('');
      setDate(toLocalIsoDate(new Date()));
      setDivisionId(modalDefaults?.divisionId ?? divisions[0]?.id ?? '');
      const matchingCat =
        categories.find((c) => c.id === modalDefaults?.categoryId) ??
        categories.find((c) => c.type === initialType || c.type === 'both') ??
        categories[0];
      setCategoryId(matchingCat?.id ?? '');
      setNote('');
    }
    setInlineMode(null);
    setNewNameMl('');
    setNewNameEn('');
  }, [isTxModalOpen, editingTransaction, modalDefaults, divisions, categories]);

  if (!isTxModalOpen) return null;

  const handleTypeSwitch = (nextType: TransactionType) => {
    setType(nextType);
    if (!editingTransaction) {
      const currentCat = categories.find((c) => c.id === categoryId);
      if (currentCat && currentCat.type !== 'both' && currentCat.type !== nextType) {
        const nextMatch = categories.find((c) => c.type === nextType || c.type === 'both');
        if (nextMatch) setCategoryId(nextMatch.id);
      }
    }
  };

  const handleQuickCreate = () => {
    if (!newNameMl.trim() && !newNameEn.trim()) {
      showToast('validationName', 'error');
      return;
    }
    const primary = newNameMl.trim() || newNameEn.trim();
    const secondary = newNameEn.trim() || primary;

    if (inlineMode === 'category') {
      const created = addCategory({
        nameMl: primary,
        nameEn: secondary,
        type,
        icon: newIcon,
        color: newColor,
      });
      setCategoryId(created.id);
    } else if (inlineMode === 'division') {
      const created = addDivision({
        nameMl: primary,
        nameEn: secondary,
        icon: newIcon,
        color: newColor,
      });
      setDivisionId(created.id);
    }

    setInlineMode(null);
    setNewNameMl('');
    setNewNameEn('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      showToast('validationAmount', 'error');
      return;
    }
    if (!date) {
      showToast('validationDate', 'error');
      return;
    }

    const payload = {
      type,
      amount: Math.round(parsedAmount * 100) / 100,
      date,
      divisionId: divisionId || divisions[0]?.id || '',
      categoryId: categoryId || categories[0]?.id || '',
      note: note.trim(),
    };

    if (editingTransaction) {
      updateTransaction(editingTransaction.id, payload);
    } else {
      addTransaction(payload);
    }
    closeTxModal();
  };

  const sortedCategories = [...categories].sort((a, b) => {
    const aMatch = a.type === type || a.type === 'both' ? 0 : 1;
    const bMatch = b.type === type || b.type === 'both' ? 0 : 1;
    return aMatch - bMatch;
  });

  return (
    <div className="modal-backdrop no-print" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <h2>{editingTransaction ? t(lang, 'editEntry') : t(lang, 'addEntry')}</h2>
          <button
            type="button"
            className="mini-icon-btn"
            onClick={closeTxModal}
            aria-label={t(lang, 'cancel')}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="type-switch">
            <button
              type="button"
              className={`type-switch-btn ${type === 'expense' ? 'active-expense' : ''}`}
              onClick={() => handleTypeSwitch('expense')}
            >
              {t(lang, 'expense')}
            </button>
            <button
              type="button"
              className={`type-switch-btn ${type === 'income' ? 'active-income' : ''}`}
              onClick={() => handleTypeSwitch('income')}
            >
              {t(lang, 'income')}
            </button>
          </div>

          <div className="responsive-grid-2">
            <div className="field-group">
              <label className="field-label" htmlFor="tx-amount">
                {t(lang, 'amount')}
              </label>
              <input
                id="tx-amount"
                type="number"
                step="0.01"
                min="0.01"
                className="input-control"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="tx-date">
                {t(lang, 'date')}
              </label>
              <input
                id="tx-date"
                type="date"
                className="input-control"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="field-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="field-label" htmlFor="tx-division">
                {t(lang, 'division')}
              </label>
              <button
                type="button"
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--accent)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                }}
                onClick={() => setInlineMode(inlineMode === 'division' ? null : 'division')}
              >
                {t(lang, 'addNewDivision')}
              </button>
            </div>
            <select
              id="tx-division"
              className="input-control"
              value={divisionId}
              onChange={(e) => setDivisionId(e.target.value)}
            >
              {divisions.map((div) => (
                <option key={div.id} value={div.id}>
                  {div.icon} {getLocalizedName(div, lang)}
                </option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="field-label" htmlFor="tx-category">
                {t(lang, 'category')}
              </label>
              <button
                type="button"
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--accent)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                }}
                onClick={() => setInlineMode(inlineMode === 'category' ? null : 'category')}
              >
                {t(lang, 'addNewCategory')}
              </button>
            </div>
            <select
              id="tx-category"
              className="input-control"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {sortedCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {getLocalizedName(cat, lang)}
                </option>
              ))}
            </select>
          </div>

          {inlineMode && (
            <div className="inline-add-box">
              <strong style={{ fontSize: '0.86rem' }}>
                {inlineMode === 'category' ? t(lang, 'newCategoryTitle') : t(lang, 'newDivisionTitle')}
              </strong>
              <input
                type="text"
                className="input-control"
                placeholder={
                  inlineMode === 'category'
                    ? t(lang, 'nameMlPlaceholder')
                    : t(lang, 'divisionMlPlaceholder')
                }
                value={newNameMl}
                onChange={(e) => setNewNameMl(e.target.value)}
              />
              <input
                type="text"
                className="input-control"
                placeholder={
                  inlineMode === 'category'
                    ? t(lang, 'nameEnPlaceholder')
                    : t(lang, 'divisionEnPlaceholder')
                }
                value={newNameEn}
                onChange={(e) => setNewNameEn(e.target.value)}
              />
              <div className="picker-row">
                {EMOJI_CHOICES.slice(0, 10).map((em) => (
                  <button
                    key={em}
                    type="button"
                    className={`emoji-chip ${newIcon === em ? 'active' : ''}`}
                    onClick={() => setNewIcon(em)}
                  >
                    {em}
                  </button>
                ))}
              </div>
              <div className="picker-row">
                {COLOR_PALETTE.slice(0, 8).map((col) => (
                  <button
                    key={col}
                    type="button"
                    className={`color-dot ${newColor === col ? 'active' : ''}`}
                    style={{ backgroundColor: col }}
                    onClick={() => setNewColor(col)}
                    aria-label={col}
                  />
                ))}
              </div>
              <div className="actions-toolbar">
                <button type="button" className="btn-primary" onClick={handleQuickCreate}>
                  <Plus size={15} />
                  <span>{t(lang, 'create')}</span>
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setInlineMode(null)}
                >
                  {t(lang, 'cancel')}
                </button>
              </div>
            </div>
          )}

          <div className="field-group">
            <label className="field-label" htmlFor="tx-note">
              {t(lang, 'note')}
            </label>
            <input
              id="tx-note"
              type="text"
              className="input-control"
              placeholder={t(lang, 'notePlaceholder')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="actions-toolbar" style={{ justifyContent: 'space-between', marginTop: 4 }}>
            {editingTransaction ? (
              <button
                type="button"
                className="btn-danger"
                onClick={() => {
                  if (window.confirm(t(lang, 'confirmDeleteTx'))) {
                    deleteTransaction(editingTransaction.id);
                    closeTxModal();
                  }
                }}
              >
                <Trash2 size={15} />
                <span>{t(lang, 'delete')}</span>
              </button>
            ) : (
              <span />
            )}

            <div className="actions-toolbar">
              <button type="button" className="btn-secondary" onClick={closeTxModal}>
                {t(lang, 'cancel')}
              </button>
              <button type="submit" className="btn-primary">
                {t(lang, 'save')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
