import { formatCurrency, formatDisplayDate, getLocalizedName, t } from '../i18n/translations';
import { computeSummary } from './analytics';
import type { Category, FinanceDivision, Language, Transaction } from '../types/finance';

function escapeCsvCell(value: string | number): string {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsvContent(
  transactions: Transaction[],
  categories: Category[],
  divisions: FinanceDivision[],
  lang: Language,
): string {
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const divisionMap = new Map(divisions.map((d) => [d.id, d]));
  const summary = computeSummary(transactions);

  const headers = [
    t(lang, 'date'),
    t(lang, 'typeLabel'),
    t(lang, 'division'),
    t(lang, 'category'),
    t(lang, 'amount'),
    t(lang, 'note'),
  ];

  const rows = transactions.map((tx) => {
    const cat = categoryMap.get(tx.categoryId);
    const div = divisionMap.get(tx.divisionId);
    return [
      tx.date,
      tx.type === 'income' ? t(lang, 'income') : t(lang, 'expense'),
      getLocalizedName(div, lang),
      getLocalizedName(cat, lang),
      tx.amount,
      tx.note || '',
    ].map(escapeCsvCell);
  });

  const footerRows = [
    [],
    [t(lang, 'totalIncome'), '', '', '', summary.totalIncome, ''].map(escapeCsvCell),
    [t(lang, 'totalExpense'), '', '', '', summary.totalExpense, ''].map(escapeCsvCell),
    [t(lang, 'netBalance'), '', '', '', summary.balance, ''].map(escapeCsvCell),
  ];

  const lines = [headers.map(escapeCsvCell).join(','), ...rows.map((r) => r.join(',')), ...footerRows.map((r) => r.join(','))];
  // Prepend UTF-8 BOM so Excel renders Malayalam Unicode cleanly
  return `\uFEFF${lines.join('\r\n')}`;
}

export function downloadTextFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function exportTransactionsToCsv(
  transactions: Transaction[],
  categories: Category[],
  divisions: FinanceDivision[],
  lang: Language,
  filename = `myfin-report-${new Date().toISOString().slice(0, 10)}.csv`,
): void {
  const csv = buildCsvContent(transactions, categories, divisions, lang);
  downloadTextFile(csv, filename, 'text/csv;charset=utf-8;');
}

export async function exportReportElementToPdf(
  element: HTMLElement,
  filename = `myfin-report-${new Date().toISOString().slice(0, 10)}.pdf`,
): Promise<void> {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;

  const imgWidth = contentWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const imgData = canvas.toDataURL('image/png');

  let heightLeft = imgHeight;
  let position = margin;

  pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
  heightLeft -= contentHeight;

  while (heightLeft > 0.5) {
    position = margin - (imgHeight - heightLeft);
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
    heightLeft -= contentHeight;
  }

  pdf.save(filename);
}

export function formatPrintRowSummary(
  tx: Transaction,
  categories: Category[],
  divisions: FinanceDivision[],
  lang: Language,
) {
  const cat = categories.find((c) => c.id === tx.categoryId);
  const div = divisions.find((d) => d.id === tx.divisionId);
  return {
    date: formatDisplayDate(tx.date, lang),
    type: tx.type === 'income' ? t(lang, 'income') : t(lang, 'expense'),
    division: getLocalizedName(div, lang),
    category: getLocalizedName(cat, lang),
    amount: formatCurrency(tx.type === 'expense' ? -tx.amount : tx.amount),
    note: tx.note || '—',
  };
}
