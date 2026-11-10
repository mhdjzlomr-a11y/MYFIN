import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import { BarChart2, PieChart } from 'lucide-react';
import { useMemo } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, getLocalizedName, t } from '../i18n/translations';
import { computeTimeSeries } from '../services/analytics';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title);

export function ChartsSection() {
  const { filteredTransactions, categorySummary, filters, settings } = useFinance();
  const lang = settings.language;
  const isDark = settings.theme === 'dark';

  const textColor = isDark ? '#c5d6ee' : '#3c4f6b';
  const gridColor = isDark ? 'rgba(148, 184, 232, 0.14)' : 'rgba(19, 49, 92, 0.08)';

  const timeSeries = useMemo(
    () =>
      computeTimeSeries(
        filteredTransactions,
        filters.preset,
        filters.startDate,
        filters.endDate,
        lang,
      ),
    [filteredTransactions, filters.preset, filters.startDate, filters.endDate, lang],
  );

  const expenseCategories = useMemo(
    () => categorySummary.filter((row) => row.expense > 0),
    [categorySummary],
  );

  const barData = useMemo(
    () => ({
      labels: timeSeries.labels,
      datasets: [
        {
          label: t(lang, 'income'),
          data: timeSeries.income,
          backgroundColor: isDark ? '#3b91ff' : '#13315c',
          borderRadius: 10,
          borderSkipped: false as const,
          maxBarThickness: 32,
        },
        {
          label: t(lang, 'expense'),
          data: timeSeries.expense,
          backgroundColor: '#1c7eff',
          borderRadius: 10,
          borderSkipped: false as const,
          maxBarThickness: 32,
        },
      ],
    }),
    [timeSeries, lang, isDark],
  );

  const barOptions: ChartOptions<'bar'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: textColor, boxWidth: 10, usePointStyle: true, pointStyle: 'circle', padding: 14 },
        },
        tooltip: {
          backgroundColor: '#13315c',
          padding: 12,
          cornerRadius: 12,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(Number(ctx.raw ?? 0))}`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: textColor },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: textColor,
            callback: (val) => `₹${val}`,
          },
          grid: { color: gridColor },
        },
      },
    }),
    [textColor, gridColor],
  );

  const doughnutData = useMemo(
    () => ({
      labels: expenseCategories.map((r) => `${r.category.icon} ${getLocalizedName(r.category, lang)}`),
      datasets: [
        {
          data: expenseCategories.map((r) => r.expense),
          backgroundColor: expenseCategories.map((r, i) =>
            i === 0 ? '#13315c' : i === 1 ? '#1c7eff' : i === 2 ? '#5ba2ff' : r.category.color,
          ),
          borderColor: isDark ? '#122038' : '#ffffff',
          borderWidth: 3,
          hoverOffset: 8,
        },
      ],
    }),
    [expenseCategories, lang, isDark],
  );

  const doughnutOptions: ChartOptions<'doughnut'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: textColor,
            boxWidth: 12,
            padding: 12,
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const row = expenseCategories[ctx.dataIndex];
              const pct = row ? ` (${row.expenseSharePercent}%)` : '';
              return `${ctx.label}: ${formatCurrency(Number(ctx.raw ?? 0))}${pct}`;
            },
          },
        },
      },
    }),
    [textColor, expenseCategories],
  );

  const hasBarData =
    timeSeries.labels.length > 0 &&
    (timeSeries.income.some((v) => v > 0) || timeSeries.expense.some((v) => v > 0));

  return (
    <section className="charts-grid" aria-label="Charts">
      <div className="card">
        <div className="section-header">
          <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart2 size={18} color="var(--accent)" />
            <span>{t(lang, 'incomeVsExpenseChart')}</span>
          </h2>
        </div>
        {hasBarData ? (
          <div className="chart-canvas-wrap">
            <Bar data={barData} options={barOptions} />
          </div>
        ) : (
          <div className="empty-chart">
            <BarChart2 size={32} />
            <span>{t(lang, 'noChartData')}</span>
          </div>
        )}
      </div>

      <div className="card">
        <div className="section-header">
          <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PieChart size={18} color="var(--accent)" />
            <span>{t(lang, 'categoryExpenseChart')}</span>
          </h2>
        </div>
        {expenseCategories.length > 0 ? (
          <div className="chart-canvas-wrap">
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        ) : (
          <div className="empty-chart">
            <PieChart size={32} />
            <span>{t(lang, 'noChartData')}</span>
          </div>
        )}
      </div>
    </section>
  );
}
