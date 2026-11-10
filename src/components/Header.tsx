import {
  BarChart3,
  FolderKanban,
  Languages,
  LayoutDashboard,
  ListOrdered,
  Moon,
  Plus,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { t } from '../i18n/translations';
import type { ActiveTab } from '../types/finance';

export function Header() {
  const { settings, activeTab, setActiveTab, toggleTheme, toggleLanguage, openAddModal } =
    useFinance();
  const lang = settings.language;

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
          <div className="brand-group">
            <div className="brand-logo" aria-hidden="true">
              ₹
            </div>
            <div>
              <h1 className="brand-title">
                <span>{t(lang, 'appName')}</span>
                <span className="offline-pill">
                  <ShieldCheck size={12} />
                  {t(lang, 'offlineReady')}
                </span>
              </h1>
              <p className="brand-subtitle">{t(lang, 'appTagline')}</p>
            </div>
          </div>

          <nav className="desktop-nav" aria-label="Main navigation">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`nav-btn ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="header-actions">
            <button
              type="button"
              className="icon-btn"
              onClick={toggleLanguage}
              title="Switch Language"
            >
              <Languages size={17} />
              <span>{t(lang, 'switchLang')}</span>
            </button>

            <button
              type="button"
              className="icon-btn"
              onClick={toggleTheme}
              aria-label={settings.theme === 'dark' ? t(lang, 'lightMode') : t(lang, 'darkMode')}
              title={settings.theme === 'dark' ? t(lang, 'lightMode') : t(lang, 'darkMode')}
            >
              {settings.theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            <button
              type="button"
              className="btn-primary header-add-btn"
              onClick={() => openAddModal()}
            >
              <Plus size={18} />
              <span>{t(lang, 'addEntry')}</span>
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
