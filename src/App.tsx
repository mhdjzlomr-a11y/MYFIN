import { useState } from 'react';
import { CalendarReports } from './components/CalendarReports';
import { CategoryOverview } from './components/CategoryOverview';
import { CloudSyncModal } from './components/CloudSyncModal';
import { DashboardBento } from './components/DashboardBento';
import { FilterBar } from './components/FilterBar';
import { Header, LeftSidebar } from './components/Header';
import { PrintableReportSheet, ReportsExport } from './components/ReportsExport';
import { SummaryCards } from './components/SummaryCards';
import { TransactionList } from './components/TransactionList';
import { TransactionModal } from './components/TransactionModal';
import { FinanceProvider, useFinance } from './context/FinanceContext';

function FinanceWorkspace() {
  const { activeTab, toast } = useFinance();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  return (
    <div className="app-shell">
      <Header
        isSidebarExpanded={isSidebarExpanded}
        onToggleSidebar={() => setIsSidebarExpanded((prev) => !prev)}
      />

      <div className="app-body-layout no-print">
        <LeftSidebar
          isExpanded={isSidebarExpanded}
          onToggleExpand={() => setIsSidebarExpanded((prev) => !prev)}
          onCloseMobile={() => setIsSidebarExpanded(false)}
        />

        <main className="main-container">
          <div key={activeTab} className="tab-panel-animate">
            {activeTab === 'dashboard' && <DashboardBento />}

            {activeTab === 'calendar' && <CalendarReports />}

            {activeTab === 'categories' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <FilterBar />
                <CategoryOverview />
              </div>
            )}

            {activeTab === 'transactions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <FilterBar />
                <SummaryCards />
                <TransactionList />
              </div>
            )}

            {activeTab === 'reports' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <FilterBar />
                <SummaryCards />
                <ReportsExport />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Dedicated A4 Print Sheet shown only in @media print */}
      {activeTab !== 'calendar' && <PrintableReportSheet className="print-only-report" />}

      <TransactionModal />
      <CloudSyncModal />

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
