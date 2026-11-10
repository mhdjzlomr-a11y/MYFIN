import { ArrowDownCircle, ArrowUpCircle, Receipt, Wallet } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, t } from '../i18n/translations';

export function SummaryCards() {
  const { summary, settings } = useFinance();
  const lang = settings.language;

  return (
    <section className="kpi-grid" aria-label="Summary totals">
      <article className="kpi-card">
        <div>
          <div className="kpi-label">{t(lang, 'totalIncome')}</div>
          <div className="kpi-value income">{formatCurrency(summary.totalIncome)}</div>
        </div>
        <div className="kpi-icon income" aria-hidden="true">
          <ArrowDownCircle size={22} />
        </div>
      </article>

      <article className="kpi-card">
        <div>
          <div className="kpi-label">{t(lang, 'totalExpense')}</div>
          <div className="kpi-value expense">{formatCurrency(summary.totalExpense)}</div>
        </div>
        <div className="kpi-icon expense" aria-hidden="true">
          <ArrowUpCircle size={22} />
        </div>
      </article>

      <article className="kpi-card">
        <div>
          <div className="kpi-label">{t(lang, 'netBalance')}</div>
          <div className={`kpi-value ${summary.balance < 0 ? 'expense' : 'balance'}`}>
            {formatCurrency(summary.balance)}
          </div>
        </div>
        <div className="kpi-icon balance" aria-hidden="true">
          <Wallet size={22} />
        </div>
      </article>

      <article className="kpi-card">
        <div>
          <div className="kpi-label">{t(lang, 'transactionsCount')}</div>
          <div className="kpi-value">
            {summary.transactionCount}
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                marginLeft: 8,
              }}
            >
              ({t(lang, 'savingsRate')}: {summary.savingsRate}%)
            </span>
          </div>
        </div>
        <div className="kpi-icon neutral" aria-hidden="true">
          <Receipt size={22} />
        </div>
      </article>
    </section>
  );
}
