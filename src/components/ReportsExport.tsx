import {
  Cloud,
  Download,
  FileDown,
  FileSpreadsheet,
  Printer,
  Trash2,
  Upload,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDisplayDate, getLocalizedName, t } from '../i18n/translations';
import { getPeriodLabel } from '../services/analytics';
import {
  downloadTextFile,
  exportReportElementToPdf,
  exportTransactionsToCsv,
} from '../services/export';

export function PrintableReportSheet({
  forwardedRef,
  className,
}: {
  forwardedRef?: React.RefObject<HTMLDivElement>;
  className?: string;
}) {
  const {
    filteredTransactions,
    summary,
    categorySummary,
    categories,
    divisions,
    filters,
    settings,
  } = useFinance();
  const lang = settings.language;
  const periodLabel = getPeriodLabel(filters, lang);
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const divisionMap = useMemo(() => new Map(divisions.map((d) => [d.id, d])), [divisions]);
  const activeCategories = categorySummary.filter((r) => r.count > 0);

  return (
    <div ref={forwardedRef} className={className}>
      <div className="report-sheet-header">
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#13315c' }}>
            {t(lang, 'appName')} — {t(lang, 'reportsTitle')}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#475569' }}>
            {t(lang, 'reportPeriod')}: {periodLabel}
          </p>
        </div>
        <div style={{ textAlign: 'right', fontSize: '11px', color: '#475569' }}>
          <div>
            {t(lang, 'generatedOn')}: {new Date().toLocaleDateString(lang === 'ml' ? 'ml-IN' : 'en-IN')}
          </div>
          <div>
            {t(lang, 'transactionsCount')}: {summary.transactionCount}
          </div>
        </div>
      </div>

      <div className="report-sheet-kpis">
        <div className="report-sheet-kpi-box">
          <div style={{ fontSize: '11px', color: '#475569' }}>{t(lang, 'totalIncome')}</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#059669' }}>
            {formatCurrency(summary.totalIncome)}
          </div>
        </div>
        <div className="report-sheet-kpi-box">
          <div style={{ fontSize: '11px', color: '#475569' }}>{t(lang, 'totalExpense')}</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#dc2626' }}>
            {formatCurrency(summary.totalExpense)}
          </div>
        </div>
        <div className="report-sheet-kpi-box">
          <div style={{ fontSize: '11px', color: '#475569' }}>{t(lang, 'netBalance')}</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#2563eb' }}>
            {formatCurrency(summary.balance)}
          </div>
        </div>
      </div>

      {activeCategories.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '13px' }}>{t(lang, 'viewByCategory')}</h3>
          <table className="report-sheet-table">
            <thead>
              <tr>
                <th>{t(lang, 'category')}</th>
                <th>{t(lang, 'income')}</th>
                <th>{t(lang, 'expense')}</th>
                <th>{t(lang, 'netBalance')}</th>
              </tr>
            </thead>
            <tbody>
              {activeCategories.map((row) => (
                <tr key={row.category.id}>
                  <td>
                    {row.category.icon} {getLocalizedName(row.category, lang)}
                  </td>
                  <td style={{ color: '#059669' }}>{formatCurrency(row.income)}</td>
                  <td style={{ color: '#dc2626' }}>{formatCurrency(row.expense)}</td>
                  <td style={{ fontWeight: 700 }}>{formatCurrency(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div>
        <h3 style={{ margin: '0 0 8px', fontSize: '13px' }}>{t(lang, 'recentTransactions')}</h3>
        <table className="report-sheet-table">
          <thead>
            <tr>
              <th>{t(lang, 'date')}</th>
              <th>{t(lang, 'division')}</th>
              <th>{t(lang, 'category')}</th>
              <th>{t(lang, 'note')}</th>
              <th>{t(lang, 'typeLabel')}</th>
              <th>{t(lang, 'amount')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((tx) => {
              const cat = categoryMap.get(tx.categoryId);
              const div = divisionMap.get(tx.divisionId);
              return (
                <tr key={tx.id}>
                  <td>{formatDisplayDate(tx.date, lang)}</td>
                  <td>{getLocalizedName(div, lang)}</td>
                  <td>{getLocalizedName(cat, lang)}</td>
                  <td>{tx.note || '—'}</td>
                  <td>{tx.type === 'income' ? t(lang, 'income') : t(lang, 'expense')}</td>
                  <td style={{ fontWeight: 700, color: tx.type === 'income' ? '#059669' : '#dc2626' }}>
                    {formatCurrency(tx.type === 'expense' ? -tx.amount : tx.amount, true)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ReportsExport() {
  const {
    filteredTransactions,
    categories,
    divisions,
    categorySummary,
    settings,
    cloudUser,
    exportBackupJson,
    importBackupJson,
    clearAllData,
    openSyncModal,
    showToast,
  } = useFinance();

  const lang = settings.language;
  const pdfTargetRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleCsvDownload = () => {
    exportTransactionsToCsv(filteredTransactions, categories, divisions, lang);
    showToast('toastCsvReady');
  };

  const handlePdfDownload = async () => {
    if (!pdfTargetRef.current || isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      await exportReportElementToPdf(pdfTargetRef.current);
      showToast('toastPdfReady');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleBackupDownload = () => {
    const json = exportBackupJson();
    downloadTextFile(
      json,
      `myfin-backup-${new Date().toISOString().slice(0, 10)}.json`,
      'application/json;charset=utf-8',
    );
    showToast('toastBackupExported');
  };

  const handleBackupImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    importBackupJson(text);
    e.target.value = '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Export Actions Card */}
      <section className="card no-print">
        <div className="section-header">
          <div>
            <h2 className="section-title">{t(lang, 'reportsTitle')}</h2>
            <p className="section-subtitle">{t(lang, 'reportsSubtitle')}</p>
          </div>
        </div>

        <div className="actions-toolbar">
          <button type="button" className="btn-primary" onClick={handleCsvDownload}>
            <FileSpreadsheet size={17} />
            <span>{t(lang, 'downloadCsv')}</span>
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={handlePdfDownload}
            disabled={isExportingPdf}
          >
            <FileDown size={17} />
            <span>{isExportingPdf ? t(lang, 'generatingPdf') : t(lang, 'downloadPdf')}</span>
          </button>

          <button type="button" className="btn-secondary" onClick={handlePrint}>
            <Printer size={17} />
            <span>{t(lang, 'printReport')}</span>
          </button>
        </div>
      </section>

      {/* Category Summary Table */}
      <section className="card no-print">
        <div className="section-header">
          <h3 className="section-title">{t(lang, 'viewByCategory')}</h3>
        </div>
        <div className="tx-table-wrap">
          <table className="tx-table">
            <thead>
              <tr>
                <th>{t(lang, 'category')}</th>
                <th>{t(lang, 'entriesCount')}</th>
                <th>{t(lang, 'income')}</th>
                <th>{t(lang, 'expense')}</th>
                <th>{t(lang, 'netBalance')}</th>
              </tr>
            </thead>
            <tbody>
              {categorySummary
                .filter((row) => row.count > 0)
                .map((row) => (
                  <tr key={row.category.id}>
                    <td>
                      {row.category.icon} {getLocalizedName(row.category, lang)}
                    </td>
                    <td>{row.count}</td>
                    <td style={{ color: 'var(--income)', fontWeight: 600 }}>
                      {formatCurrency(row.income)}
                    </td>
                    <td style={{ color: 'var(--expense)', fontWeight: 600 }}>
                      {formatCurrency(row.expense)}
                    </td>
                    <td
                      style={{
                        fontWeight: 700,
                        color: row.balance < 0 ? 'var(--expense)' : 'var(--balance)',
                      }}
                    >
                      {formatCurrency(row.balance)}
                    </td>
                  </tr>
                ))}
              {categorySummary.every((row) => row.count === 0) && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    {t(lang, 'noChartData')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Offline Backup & Storage Management */}
      <section className="card no-print">
        <div className="section-header">
          <div>
            <h3 className="section-title">{t(lang, 'backupTitle')}</h3>
            <p className="section-subtitle">{t(lang, 'backupDesc')}</p>
          </div>
        </div>

        <div className="actions-toolbar">
          <button type="button" className="btn-secondary" onClick={handleBackupDownload}>
            <Download size={16} />
            <span>{t(lang, 'exportJson')}</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={16} />
            <span>{t(lang, 'importJson')}</span>
          </button>

          <button type="button" className="btn-secondary" onClick={openSyncModal}>
            <Cloud size={16} />
            <span>{cloudUser ? t(lang, 'cloudSyncActive') : t(lang, 'cloudSyncTitle')}</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleBackupImport}
          />

          <button
            type="button"
            className="btn-danger"
            onClick={() => {
              if (window.confirm(t(lang, 'confirmClearAll'))) {
                clearAllData();
              }
            }}
          >
            <Trash2 size={16} />
            <span>{t(lang, 'clearAllData')}</span>
          </button>
        </div>
      </section>

      {/* Hidden Offscreen Sheet used for crisp Malayalam PDF rendering without causing mobile scroll */}
      <div
        style={{
          position: 'fixed',
          width: 0,
          height: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          opacity: 0,
        }}
        aria-hidden="true"
      >
        <PrintableReportSheet forwardedRef={pdfTargetRef} className="pdf-render-host" />
      </div>
    </div>
  );
}
