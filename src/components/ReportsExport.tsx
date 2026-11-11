import {
  Archive,
  ChevronDown,
  ChevronUp,
  Cloud,
  Download,
  FileDown,
  FileSpreadsheet,
  Printer,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDisplayDate, getLocalizedName, t } from '../i18n/translations';
import { computeSummary, getPeriodLabel, getPeriodTransactions } from '../services/analytics';
import {
  downloadTextFile,
  exportReportElementToPdf,
  exportTransactionsToCsv,
} from '../services/export';
import type {
  ArchivePeriodType,
  CategorySummaryRow,
  FinanceSummary,
  StoredPeriodReport,
  Transaction,
} from '../types/finance';

export function PrintableReportSheet({
  forwardedRef,
  className,
  overrideTransactions,
  overrideSummary,
  overrideCategorySummary,
  overridePeriodLabel,
}: {
  forwardedRef?: React.RefObject<HTMLDivElement>;
  className?: string;
  overrideTransactions?: Transaction[];
  overrideSummary?: FinanceSummary;
  overrideCategorySummary?: CategorySummaryRow[];
  overridePeriodLabel?: string;
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
  const activeTransactions = overrideTransactions ?? filteredTransactions;
  const activeSummary = overrideSummary ?? summary;
  const activeCategoryRows = overrideCategorySummary ?? categorySummary;
  const periodLabel = overridePeriodLabel ?? getPeriodLabel(filters, lang);
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const divisionMap = useMemo(() => new Map(divisions.map((d) => [d.id, d])), [divisions]);
  const activeCategories = activeCategoryRows.filter((r) => r.count > 0);

  return (
    <div ref={forwardedRef} className={className}>
      <div className="report-sheet-header">
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#2b274b' }}>
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
            {t(lang, 'transactionsCount')}: {activeSummary.transactionCount}
          </div>
        </div>
      </div>

      <div className="report-sheet-kpis">
        <div className="report-sheet-kpi-box">
          <div style={{ fontSize: '11px', color: '#475569' }}>{t(lang, 'totalIncome')}</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#059669' }}>
            {formatCurrency(activeSummary.totalIncome)}
          </div>
        </div>
        <div className="report-sheet-kpi-box">
          <div style={{ fontSize: '11px', color: '#475569' }}>{t(lang, 'totalExpense')}</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#dc2626' }}>
            {formatCurrency(activeSummary.totalExpense)}
          </div>
        </div>
        <div className="report-sheet-kpi-box">
          <div style={{ fontSize: '11px', color: '#475569' }}>{t(lang, 'netBalance')}</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#2563eb' }}>
            {formatCurrency(activeSummary.balance)}
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
            {activeTransactions.map((tx) => {
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
    transactions,
    filteredTransactions,
    categories,
    divisions,
    categorySummary,
    archives,
    settings,
    cloudUser,
    exportBackupJson,
    importBackupJson,
    clearAllData,
    storePeriodReport,
    startNewPeriod,
    deleteStoredReport,
    openSyncModal,
    showToast,
  } = useFinance();

  const lang = settings.language;
  const pdfTargetRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [expandedArchiveId, setExpandedArchiveId] = useState<string | null>(null);

  const periodPreviews = useMemo(
    () =>
      (['weekly', 'monthly'] as ArchivePeriodType[]).map((periodType) => {
        const { startDate, endDate, entries } = getPeriodTransactions(transactions, periodType);
        return {
          periodType,
          startDate,
          endDate,
          entries,
          summary: computeSummary(entries),
        };
      }),
    [transactions],
  );

  const handleArchivedCsvDownload = (report: StoredPeriodReport) => {
    const mergedCats = [
      ...categories,
      ...report.categoryBreakdown
        .filter((b) => !categories.some((c) => c.id === b.id))
        .map((b) => ({
          id: b.id,
          nameMl: b.nameMl,
          nameEn: b.nameEn,
          type: 'both' as const,
          icon: b.icon,
          color: b.color,
          isCustom: true,
          createdAt: report.createdAt,
        })),
    ];
    const mergedDivs = [
      ...divisions,
      ...report.divisionBreakdown
        .filter((b) => !divisions.some((d) => d.id === b.id))
        .map((b) => ({
          id: b.id,
          nameMl: b.nameMl,
          nameEn: b.nameEn,
          icon: b.icon,
          color: b.color,
          isCustom: true,
          createdAt: report.createdAt,
        })),
    ];
    exportTransactionsToCsv(
      report.transactions,
      mergedCats,
      mergedDivs,
      lang,
      `myfin-${report.periodType}-${report.startDate}-to-${report.endDate}.csv`,
    );
    showToast('toastCsvReady');
  };

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

      {/* Weekly & Monthly Stored Reports + Start Fresh Week / Month */}
      <section className="card no-print" aria-label={t(lang, 'periodArchiveTitle')}>
        <div className="section-header">
          <div>
            <h3 className="section-title">{t(lang, 'periodArchiveTitle')}</h3>
            <p className="section-subtitle">{t(lang, 'periodArchiveDesc')}</p>
          </div>
        </div>

        <div className="responsive-grid-2" style={{ marginBottom: 18 }}>
          {periodPreviews.map(({ periodType, startDate, endDate, entries, summary: periodSummary }) => {
            const isWeekly = periodType === 'weekly';
            const cardTitle = isWeekly ? t(lang, 'thisWeekCardTitle') : t(lang, 'thisMonthCardTitle');
            const freshBtnLabel = isWeekly
              ? t(lang, 'startFreshOnlyWeek')
              : t(lang, 'startFreshOnlyMonth');
            const confirmMsg = isWeekly
              ? t(lang, 'confirmStartNewWeek')
              : t(lang, 'confirmStartNewMonth');

            return (
              <div
                key={periodType}
                className="inline-add-box"
                style={{ borderStyle: 'solid', borderColor: 'var(--border-color)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.96rem' }}>{cardTitle}</div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      {formatDisplayDate(startDate, lang)} → {formatDisplayDate(endDate, lang)}
                    </div>
                  </div>
                  <span className="badge" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                    {entries.length} {t(lang, 'entriesCount')}
                  </span>
                </div>

                <div className="category-metrics" style={{ paddingTop: 10 }}>
                  <div className="metric-cell">
                    <span className="metric-label">{t(lang, 'income')}</span>
                    <span className="metric-num" style={{ color: 'var(--income)' }}>
                      {formatCurrency(periodSummary.totalIncome)}
                    </span>
                  </div>
                  <div className="metric-cell">
                    <span className="metric-label">{t(lang, 'expense')}</span>
                    <span className="metric-num" style={{ color: 'var(--expense)' }}>
                      {formatCurrency(periodSummary.totalExpense)}
                    </span>
                  </div>
                  <div className="metric-cell">
                    <span className="metric-label">{t(lang, 'netBalance')}</span>
                    <span
                      className="metric-num"
                      style={{ color: periodSummary.balance < 0 ? 'var(--expense)' : 'var(--balance)' }}
                    >
                      {formatCurrency(periodSummary.balance)}
                    </span>
                  </div>
                </div>

                <div className="actions-toolbar">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => storePeriodReport(periodType)}
                  >
                    <Archive size={15} />
                    <span>{t(lang, 'storeReportBtn')}</span>
                  </button>

                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      if (entries.length === 0 || window.confirm(confirmMsg)) {
                        startNewPeriod(periodType);
                      }
                    }}
                  >
                    <RotateCcw size={15} />
                    <span>{freshBtnLabel}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="section-header" style={{ marginBottom: 10 }}>
          <h4 className="section-title" style={{ fontSize: '0.95rem' }}>
            {t(lang, 'storedReportsHeading')} ({archives.length})
          </h4>
        </div>

        {archives.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            {t(lang, 'noStoredReports')}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {archives.map((report) => {
              const isExpanded = expandedArchiveId === report.id;
              return (
                <div
                  key={report.id}
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div className="section-header" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span
                          className="badge"
                          style={{
                            background: report.periodType === 'weekly' ? 'var(--accent-soft)' : 'var(--balance-soft)',
                            color: report.periodType === 'weekly' ? 'var(--accent)' : 'var(--navy-deep)',
                          }}
                        >
                          {report.periodType === 'weekly' ? t(lang, 'weeklyLabel') : t(lang, 'monthlyLabel')}
                        </span>
                        <strong style={{ fontSize: '0.9rem' }}>
                          {formatDisplayDate(report.startDate, lang)} → {formatDisplayDate(report.endDate, lang)}
                        </strong>
                      </div>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        {report.transactionCount} {t(lang, 'entriesCount')} • {t(lang, 'income')}:{' '}
                        <strong style={{ color: 'var(--income)' }}>{formatCurrency(report.totalIncome)}</strong> •{' '}
                        {t(lang, 'expense')}:{' '}
                        <strong style={{ color: 'var(--expense)' }}>{formatCurrency(report.totalExpense)}</strong> •{' '}
                        {t(lang, 'netBalance')}:{' '}
                        <strong>{formatCurrency(report.balance)}</strong>
                      </span>
                    </div>

                    <div className="actions-toolbar">
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                        onClick={() => setExpandedArchiveId(isExpanded ? null : report.id)}
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        <span>{isExpanded ? t(lang, 'hideDetails') : t(lang, 'viewDetails')}</span>
                      </button>

                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                        onClick={() => handleArchivedCsvDownload(report)}
                      >
                        <FileSpreadsheet size={14} />
                        <span>CSV</span>
                      </button>

                      <button
                        type="button"
                        className="mini-icon-btn danger"
                        aria-label={t(lang, 'delete')}
                        title={t(lang, 'delete')}
                        onClick={() => {
                          if (window.confirm(t(lang, 'confirmDeleteArchive'))) {
                            if (expandedArchiveId === report.id) setExpandedArchiveId(null);
                            deleteStoredReport(report.id);
                          }
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 6, borderTop: '1px dashed var(--border-color)' }}>
                      {report.categoryBreakdown.length > 0 && (
                        <div className="picker-row">
                          {report.categoryBreakdown.map((cat) => (
                            <span
                              key={cat.id}
                              className="badge"
                              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                            >
                              {cat.icon} {getLocalizedName(cat, lang)}: {formatCurrency(cat.expense > 0 ? cat.expense : cat.income)} ({cat.count})
                            </span>
                          ))}
                        </div>
                      )}

                      {report.transactions.length > 0 && (
                        <div className="tx-table-wrap">
                          <table className="tx-table">
                            <thead>
                              <tr>
                                <th>{t(lang, 'date')}</th>
                                <th>{t(lang, 'note')}</th>
                                <th>{t(lang, 'typeLabel')}</th>
                                <th>{t(lang, 'amount')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {report.transactions.map((tx) => (
                                <tr key={tx.id}>
                                  <td style={{ whiteSpace: 'nowrap' }}>{formatDisplayDate(tx.date, lang)}</td>
                                  <td>{tx.note || '—'}</td>
                                  <td>
                                    <span className={`badge ${tx.type === 'income' ? 'badge-income' : 'badge-expense'}`}>
                                      {tx.type === 'income' ? t(lang, 'income') : t(lang, 'expense')}
                                    </span>
                                  </td>
                                  <td style={{ fontWeight: 700, whiteSpace: 'nowrap', color: tx.type === 'income' ? 'var(--income)' : 'var(--expense)' }}>
                                    {formatCurrency(tx.type === 'expense' ? -tx.amount : tx.amount, true)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
