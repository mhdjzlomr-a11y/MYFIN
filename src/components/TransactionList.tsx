import { Edit3, Plus, Sparkles, Trash2, WalletCards } from 'lucide-react';
import { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDisplayDate, getLocalizedName, t } from '../i18n/translations';

export function TransactionList({ maxItems }: { maxItems?: number }) {
  const {
    filteredTransactions,
    categories,
    divisions,
    settings,
    openAddModal,
    openEditModal,
    deleteTransaction,
    loadSampleData,
  } = useFinance();

  const lang = settings.language;
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const divisionMap = useMemo(() => new Map(divisions.map((d) => [d.id, d])), [divisions]);

  const rows = maxItems ? filteredTransactions.slice(0, maxItems) : filteredTransactions;

  return (
    <section className="card" aria-label="Transactions list">
      <div className="section-header">
        <h2 className="section-title">
          {t(lang, 'recentTransactions')} ({filteredTransactions.length})
        </h2>

        <button type="button" className="btn-primary" onClick={() => openAddModal()}>
          <Plus size={16} />
          <span>{t(lang, 'addEntry')}</span>
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="empty-state">
          <WalletCards size={40} color="var(--accent)" />
          <h3>{t(lang, 'noTransactionsTitle')}</h3>
          <p>{t(lang, 'noTransactionsDesc')}</p>
          <div className="actions-toolbar" style={{ justifyContent: 'center' }}>
            <button type="button" className="btn-primary" onClick={() => openAddModal()}>
              <Plus size={16} />
              <span>{t(lang, 'addEntry')}</span>
            </button>
            <button type="button" className="btn-secondary" onClick={loadSampleData}>
              <Sparkles size={16} />
              <span>{t(lang, 'loadSampleData')}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="tx-table-wrap">
          <table className="tx-table">
            <thead>
              <tr>
                <th>{t(lang, 'date')}</th>
                <th>{t(lang, 'category')}</th>
                <th>{t(lang, 'division')}</th>
                <th>{t(lang, 'note')}</th>
                <th>{t(lang, 'typeLabel')}</th>
                <th>{t(lang, 'amount')}</th>
                <th>{t(lang, 'actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((tx) => {
                const cat = categoryMap.get(tx.categoryId);
                const div = divisionMap.get(tx.divisionId);
                return (
                  <tr key={tx.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDisplayDate(tx.date, lang)}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span>{cat?.icon ?? '🧾'}</span>
                        <span>{getLocalizedName(cat, lang)}</span>
                      </span>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span>{div?.icon ?? '💼'}</span>
                        <span>{getLocalizedName(div, lang)}</span>
                      </span>
                    </td>
                    <td>{tx.note || '—'}</td>
                    <td>
                      <span
                        className={`badge ${
                          tx.type === 'income' ? 'badge-income' : 'badge-expense'
                        }`}
                      >
                        {tx.type === 'income' ? t(lang, 'income') : t(lang, 'expense')}
                      </span>
                    </td>
                    <td
                      style={{
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
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
                          <Edit3 size={15} />
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
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
