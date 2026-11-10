import {
  CheckCircle2,
  Cloud,
  Copy,
  Link2,
  LogIn,
  LogOut,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { t } from '../i18n/translations';
import {
  FIRESTORE_SECURITY_RULES,
  buildShareableSyncUrl,
  parseFirebaseConfigInput,
} from '../services/cloudSync';

export function CloudSyncModal() {
  const {
    settings,
    isSyncModalOpen,
    closeSyncModal,
    syncConfig,
    cloudUser,
    syncStatus,
    syncError,
    saveAndConnectCloudConfig,
    disconnectAndClearCloudConfig,
    signInWithGoogle,
    signOutGoogle,
    forceSyncNow,
    showToast,
  } = useFinance();

  const lang = settings.language;
  const [configInput, setConfigInput] = useState('');

  if (!isSyncModalOpen) return null;

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFirebaseConfigInput(configInput);
    if (!parsed) {
      showToast('cloudSyncInvalidConfig', 'error');
      return;
    }
    saveAndConnectCloudConfig(parsed);
    setConfigInput('');
  };

  const handleCopyRules = async () => {
    try {
      await navigator.clipboard.writeText(FIRESTORE_SECURITY_RULES);
      showToast('cloudSyncRulesCopied');
    } catch {
      showToast(FIRESTORE_SECURITY_RULES, 'success', true);
    }
  };

  const handleCopySetupLink = async () => {
    if (!syncConfig) return;
    const url = buildShareableSyncUrl(syncConfig);
    try {
      await navigator.clipboard.writeText(url);
      showToast('cloudSyncLinkCopied');
    } catch {
      showToast(url, 'success', true);
    }
  };

  return (
    <div className="modal-backdrop no-print" role="dialog" aria-modal="true" aria-label={t(lang, 'cloudSyncTitle')}>
      <div className="modal-card" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Cloud size={20} color="var(--accent)" />
            <span>{t(lang, 'cloudSyncTitle')}</span>
          </h2>
          <button
            type="button"
            className="mini-icon-btn"
            onClick={closeSyncModal}
            aria-label={t(lang, 'cancel')}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
          {t(lang, 'cloudSyncDesc')}
        </p>

        {syncError && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--expense-soft)',
              color: 'var(--expense)',
              fontSize: '0.82rem',
              fontWeight: 600,
            }}
          >
            {syncError}
          </div>
        )}

        {/* Case 1: Signed in with Gmail */}
        {syncConfig && cloudUser && (
          <div className="inline-add-box" style={{ borderStyle: 'solid', borderColor: 'var(--income)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {cloudUser.photoURL ? (
                  <img
                    src={cloudUser.photoURL}
                    alt={cloudUser.displayName}
                    style={{ width: 40, height: 40, borderRadius: '999px', objectFit: 'cover' }}
                  />
                ) : (
                  <span className="emoji-badge" style={{ background: 'var(--income-soft)' }}>
                    ✉️
                  </span>
                )}
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.94rem' }}>{cloudUser.displayName}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {t(lang, 'cloudSyncConnectedAs')}: <strong>{cloudUser.email}</strong>
                  </div>
                </div>
              </div>

              <span className="badge badge-income">
                <CheckCircle2 size={13} />
                {syncStatus === 'syncing' ? t(lang, 'cloudSyncSyncing') : t(lang, 'cloudSyncActive')}
              </span>
            </div>

            <div className="actions-toolbar" style={{ marginTop: 6 }}>
              <button
                type="button"
                className="btn-primary"
                onClick={forceSyncNow}
                disabled={syncStatus === 'syncing'}
              >
                <RefreshCw size={15} />
                <span>{t(lang, 'cloudSyncNow')}</span>
              </button>

              <button type="button" className="btn-secondary" onClick={handleCopySetupLink}>
                <Link2 size={15} />
                <span>{t(lang, 'cloudSyncCopySetupLink')}</span>
              </button>

              <button type="button" className="btn-danger" onClick={signOutGoogle}>
                <LogOut size={15} />
                <span>{t(lang, 'cloudSyncSignOut')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Case 2: Configured, waiting for Gmail Sign-In */}
        {syncConfig && !cloudUser && (
          <div className="inline-add-box" style={{ borderStyle: 'solid' }}>
            <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Firebase Project: <strong>{syncConfig.projectId}</strong>
            </div>

            <div className="actions-toolbar">
              <button
                type="button"
                className="btn-primary"
                onClick={signInWithGoogle}
                disabled={syncStatus === 'connecting'}
              >
                <LogIn size={16} />
                <span>{t(lang, 'cloudSyncSignInGoogle')}</span>
              </button>

              <button type="button" className="btn-secondary" onClick={handleCopySetupLink}>
                <Link2 size={15} />
                <span>{t(lang, 'cloudSyncCopySetupLink')}</span>
              </button>

              <button
                type="button"
                className="btn-danger"
                onClick={disconnectAndClearCloudConfig}
              >
                <Trash2 size={15} />
                <span>{t(lang, 'cloudSyncClearConfig')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Case 3: Not yet configured -> Guided Firebase Config Form */}
        {!syncConfig && (
          <>
            <div
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: 12,
                fontSize: '0.8rem',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <strong>{t(lang, 'cloudSyncGuideTitle')}</strong>
              <span>{t(lang, 'cloudSyncGuideStep1')}</span>
              <span>{t(lang, 'cloudSyncGuideStep2')}</span>
              <span>{t(lang, 'cloudSyncGuideStep3')}</span>
              <span>{t(lang, 'cloudSyncGuideStep4')}</span>

              <pre
                style={{
                  margin: '6px 0 4px',
                  padding: 8,
                  borderRadius: 8,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.72rem',
                  overflowX: 'auto',
                }}
              >
                {FIRESTORE_SECURITY_RULES}
              </pre>

              <div>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '5px 11px', fontSize: '0.76rem' }}
                  onClick={handleCopyRules}
                >
                  <Copy size={13} />
                  <span>{t(lang, 'cloudSyncCopyRules')}</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label className="field-label" htmlFor="firebase-config-textarea">
                {t(lang, 'cloudSyncPasteConfig')}
              </label>
              <textarea
                id="firebase-config-textarea"
                className="input-control"
                rows={5}
                placeholder={`const firebaseConfig = {\n  apiKey: "...",\n  authDomain: "...",\n  projectId: "...",\n  appId: "..."\n};`}
                value={configInput}
                onChange={(e) => setConfigInput(e.target.value)}
                required
              />
              <div className="actions-toolbar" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={closeSyncModal}>
                  {t(lang, 'cancel')}
                </button>
                <button type="submit" className="btn-primary">
                  <Cloud size={15} />
                  <span>{t(lang, 'cloudSyncSaveConfig')}</span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
