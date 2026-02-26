import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import './AdminSettings.css';

const LIMITERS = [
  { key: 'api',   labelKey: 'admin.settings.apiLimiter'   },
  { key: 'write', labelKey: 'admin.settings.writeLimiter' },
  { key: 'auth',  labelKey: 'admin.settings.authLimiter'  }
];

function AdminSettings() {
  const { t } = useTranslation();
  const { apiFetch } = useAuth();

  const [config,   setConfig]   = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [form,     setForm]     = useState({ api: '', write: '', auth: '' });
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await apiFetch('/api/admin/settings/rate-limits');
      const data = await res.json();
      if (res.ok) {
        setConfig(data.config);
        setDefaults(data.defaults);
        setForm({
          api:   String(data.config.api.max),
          write: String(data.config.write.max),
          auth:  String(data.config.auth.max)
        });
      } else {
        setError(data.error || t('admin.settings.errorLoad'));
      }
    } catch {
      setError(t('admin.settings.errorLoad'));
    } finally {
      setLoading(false);
    }
  }, [apiFetch, t]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const body = {
        api:   { max: Number(form.api)   },
        write: { max: Number(form.write) },
        auth:  { max: Number(form.auth)  }
      };
      const res  = await apiFetch('/api/admin/settings/rate-limits', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        setConfig(data.config);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(data.error || t('admin.settings.errorSave'));
      }
    } catch {
      setError(t('admin.settings.errorSave'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-settings-page">
      <div className="page-header">
        <h1>{t('admin.settings.title')}</h1>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading-spinner">{t('admin.settings.loading')}</div>
      ) : (
        <form className="settings-form" onSubmit={handleSave}>
          <section className="settings-section">
            <h2>{t('admin.settings.rateLimits')}</h2>
            <p className="settings-hint">{t('admin.settings.rateLimitsHint')}</p>

            <div className="settings-limiters">
              {LIMITERS.map(({ key, labelKey }) => (
                <div className="limiter-row" key={key}>
                  <div className="limiter-label">
                    <span className="limiter-name">{t(labelKey)}</span>
                    {defaults && (
                      <span className="limiter-default">
                        {t('admin.settings.default', { count: defaults[key].max })}
                      </span>
                    )}
                  </div>
                  <div className="limiter-input-wrap">
                    <input
                      type="number"
                      min="1"
                      max="10000"
                      value={form[key]}
                      onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                      required
                    />
                    <span className="limiter-unit">{t('admin.settings.perWindow')}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="settings-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? t('admin.settings.saving') : t('admin.settings.save')}
            </button>
            {saved && <span className="settings-saved">{t('admin.settings.saved')}</span>}
          </div>
        </form>
      )}
    </div>
  );
}

export default AdminSettings;
