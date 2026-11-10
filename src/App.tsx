import { CategoryOverview } from './components/CategoryOverview';
import { ChartsSection } from './components/ChartsSection';
import { DashboardBento } from './components/DashboardBento';
import { FilterBar } from './components/FilterBar';
import { Header } from './components/Header';
import { PrintableReportSheet, ReportsExport } from './components/ReportsExport';
import { SummaryCards } from './components/SummaryCards';
import { TransactionList } from './components/TransactionList';
import { TransactionModal } from './components/TransactionModal';
import { WorkspaceHero } from './components/WorkspaceHero';
import { FinanceProvider, useFinance } from './context/FinanceContext';

function FinanceWorkspace() {
  const { activeTab, toast } = useFinance();

  return (
    <div className="app-shell">
      <Header />

      <main className="main-container no-print">
        <WorkspaceHero />

        {activeTab === 'dashboard' && <DashboardBento />}

        {activeTab === 'categories' && (
          <>
            <FilterBar />
            <CategoryOverview />
          </>
        )}

        {activeTab === 'transactions' && (
          <>
            <FilterBar />
            <SummaryCards />
            <TransactionList />
          </>
        )}

        {activeTab === 'reports' && (
          <>
            <FilterBar />
            <SummaryCards />
            <ChartsSection />
            <ReportsExport />
          </>
        )}
      </main>

      {/* Dedicated A4 Print Sheet shown only in @media print */}
      <PrintableReportSheet className="print-only-report" />

      <TransactionModal />

      {toast && (
        <div
          className={`toast-banner no-print ${toast.kind === 'error' ? 'error' : ''}`}
          role="status"
          aria-live="polite"
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}

export function App() {
  return (
    <FinanceProvider>
      <FinanceWorkspace />
    </FinanceProvider>
  );
}

export default App;
