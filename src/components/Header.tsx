import {
  BarChart3,
  ChevronDown,
  Cloud,
  FolderKanban,
  Globe,
  LayoutDashboard,
  ListOrdered,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RotateCcw,
  Sun,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { t } from '../i18n/translations';
import type { ActiveTab } from '../types/finance';

interface SidebarProps {
  isExpanded: boolean;
  onToggleExpand: () => void;
  onCloseMobile: () => void;
}

export function Header({
  isSidebarExpanded,
  onToggleSidebar,
}: {
  isSidebarExpanded: boolean;
  onToggleSidebar: () => void;
}) {
  const {
    settings,
    summary,
    activeTab,
    cloudUser,
    syncStatus,
    setActiveTab,
    toggleTheme,
    toggleLanguage,
    resetFilters,
    openAddModal,
    openSyncModal,
  } = useFinance();
  const lang = settings.language;
  const isDark = settings.theme === 'dark';

  const navItems: Array<{ id: ActiveTab; label: string; icon: JSX.Element }> = [
    { id: 'dashboard', label: t(lang, 'navDashboard'), icon: <LayoutDashboard size={17} /> },
    { id: 'categories', label: t(lang, 'navCategories'), icon: <FolderKanban size={17} /> },
    { id: 'transactions', label: t(lang, 'navTransactions'), icon: <ListOrdered size={17} /> },
    { id: 'reports', label: t(lang, 'navReports'), icon: <BarChart3 size={17} /> },
  ];

  return (
    <>
      <header className="app-header no-print">
        <div className="header-inner">
          <div className="header-brand-left">
            <button
              type="button"
              className="sidebar-toggle-btn header-square-btn"
              onClick={onToggleSidebar}
              aria-label="Toggle navigation sidebar"
              aria-expanded={isSidebarExpanded}
              title="Menu"
            >
              <Menu size={18} />
            </button>

            <h1 className="brand-wordmark">
              <span>{t(lang, 'appName')}</span>
              <span className="brand-dot">.</span>
            </h1>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="header-lang-pill"
              onClick={toggleLanguage}
              title={t(lang, 'switchLang')}
              aria-label={t(lang, 'switchLang')}
            >
              <Globe size={15} />
              <span>{lang === 'ml' ? 'English' : 'മലയാളം'}</span>
              <ChevronDown size={14} className="header-lang-chevron" />
            </button>

            <button
              type="button"
              className="header-square-btn"
              onClick={toggleTheme}
              aria-label={isDark ? t(lang, 'lightMode') : t(lang, 'darkMode')}
              title={isDark ? t(lang, 'lightMode') : t(lang, 'darkMode')}
            >
              {isDark ? <Sun size={16} color="#facc15" /> : <Moon size={16} />}
            </button>

            <button
              type="button"
              className="header-square-btn"
              style={{ position: 'relative' }}
              onClick={openSyncModal}
              aria-label={t(lang, 'cloudSyncTitle')}
              title={
                cloudUser
                  ? `${t(lang, 'cloudSyncConnectedAs')}: ${cloudUser.email}`
                  : t(lang, 'cloudSyncTitle')
              }
            >
              <Cloud
                size={16}
                color={
                  cloudUser
                    ? 'var(--income)'
                    : syncStatus === 'error'
                      ? 'var(--expense)'
                      : 'currentColor'
                }
              />
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 7,
                  height: 7,
                  borderRadius: '999px',
                  background: cloudUser
                    ? '#10b981'
                    : syncStatus === 'error'
                      ? '#ef4444'
                      : '#f59e0b',
                  border: '1.5px solid var(--bg-surface)',
                }}
              />
            </button>

            <button
              type="button"
              className="header-square-btn"
              onClick={resetFilters}
              aria-label={t(lang, 'clearFilters')}
              title={t(lang, 'clearFilters')}
            >
              <RotateCcw size={15} />
            </button>

            <button
              type="button"
              className="header-square-btn header-desktop-only"
              onClick={() => setActiveTab('categories')}
              aria-label={t(lang, 'navCategories')}
              title={t(lang, 'navCategories')}
            >
              <FolderKanban size={16} />
            </button>

            <button
              type="button"
              className="header-count-circle"
              onClick={() => setActiveTab('transactions')}
              aria-label={t(lang, 'navTransactions')}
              title={t(lang, 'navTransactions')}
            >
              <span>{summary.transactionCount}</span>
              <span className="header-online-dot" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav no-print" aria-label="Mobile navigation">
        {navItems.slice(0, 2).map((item) => (
          <button
            key={item.id}
            type="button"
            className={`mobile-nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}

        <button
          type="button"
          className="mobile-fab"
          onClick={() => openAddModal()}
          aria-label={t(lang, 'addEntry')}
        >
          <Plus size={22} />
        </button>

        {navItems.slice(2).map((item) => (
          <button
            key={item.id}
            type="button"
            className={`mobile-nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}

export function LeftSidebar({ isExpanded, onToggleExpand, onCloseMobile }: SidebarProps) {
  const { settings, activeTab, setActiveTab, openAddModal } = useFinance();
  const lang = settings.language;

  const navItems: Array<{ id: ActiveTab; label: string; icon: JSX.Element }> = [
    { id: 'dashboard', label: t(lang, 'navDashboard'), icon: <LayoutDashboard size={19} /> },
    { id: 'categories', label: t(lang, 'navCategories'), icon: <FolderKanban size={19} /> },
    { id: 'transactions', label: t(lang, 'navTransactions'), icon: <ListOrdered size={19} /> },
    { id: 'reports', label: t(lang, 'navReports'), icon: <BarChart3 size={19} /> },
  ];

  const handleSelect = (id: ActiveTab) => {
    setActiveTab(id);
    onCloseMobile();
  };

  return (
    <>
      <div
        className={`sidebar-backdrop no-print ${isExpanded ? 'open' : ''}`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside
        className={`left-sidebar no-print ${isExpanded ? 'expanded' : ''}`}
        aria-label="Main navigation"
      >
        <div className="sidebar-nav-list">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`sidebar-nav-btn ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => handleSelect(item.id)}
              title={item.label}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              <span className="sidebar-nav-label">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-nav-list">
          <button
            type="button"
            className="sidebar-nav-btn"
            style={{ background: 'var(--accent)', color: '#ffffff' }}
            onClick={() => {
              openAddModal();
              onCloseMobile();
            }}
            title={t(lang, 'addEntry')}
          >
            <span className="sidebar-nav-icon">
              <Plus size={19} />
            </span>
            <span className="sidebar-nav-label">{t(lang, 'addEntry')}</span>
          </button>

          <button
            type="button"
            className="sidebar-nav-btn"
            onClick={onToggleExpand}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            <span className="sidebar-nav-icon">
              {isExpanded ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </span>
            <span className="sidebar-nav-label">
              {lang === 'ml' ? (isExpanded ? 'ചുരുക്കുക' : 'വികസിപ്പിക്കുക') : isExpanded ? 'Collapse' : 'Expand'}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
