import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import './AdminTaxonomy.css';

function AdminTaxonomy() {
  const { t } = useTranslation();
  const { apiFetch } = useAuth();
  const [activeTab, setActiveTab] = useState('countries');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);
  const [allCountries, setAllCountries] = useState([]);

  const endpoints = {
    countries: '/api/admin/taxonomy/countries',
    regions: '/api/admin/taxonomy/regions',
    grapes: '/api/admin/taxonomy/grapes'
  };

  useEffect(() => {
    fetchItems();
    setShowForm(false);
    setFormData({});
  }, [activeTab, apiFetch]);

  // Pre-load countries for the region form dropdown
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await apiFetch('/api/admin/taxonomy/countries');
        const data = await res.json();
        if (res.ok) setAllCountries(data.countries || []);
      } catch (err) {
        console.error('Failed to load countries for dropdown', err);
      }
    };
    fetchCountries();
  }, [apiFetch]);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(endpoints[activeTab]);
      const data = await res.json();
      if (res.ok) {
        setItems(data.countries || data.regions || data.grapes || []);
      }
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await apiFetch(endpoints[activeTab], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        setShowForm(false);
        setFormData({});
        fetchItems();
      } else {
        setError(data.error || 'Failed to create');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      const res = await apiFetch(`${endpoints[activeTab]}/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        fetchItems();
      } else {
        alert(data.error || 'Failed to delete');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const addBtnLabel = {
    countries: t('admin.taxonomy.addCountry'),
    regions: t('admin.taxonomy.addRegion'),
    grapes: t('admin.taxonomy.addGrape')
  }[activeTab] || '';

  const addFormTitle = {
    countries: t('admin.taxonomy.addCountry'),
    regions: t('admin.taxonomy.addRegion'),
    grapes: t('admin.taxonomy.addGrape')
  }[activeTab] || '';

  const renderForm = () => {
    if (activeTab === 'countries') {
      return (
        <>
          <div className="form-group">
            <label>{t('admin.taxonomy.countryNameLabel')}</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>{t('admin.taxonomy.isoCodeLabel')}</label>
            <input
              type="text"
              value={formData.code || ''}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              maxLength="2"
              placeholder="FR"
            />
          </div>
        </>
      );
    }

    if (activeTab === 'regions') {
      return (
        <>
          <div className="form-group">
            <label>{t('admin.taxonomy.regionNameLabel')}</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>{t('admin.requests.countryLabel')}</label>
            <select
              value={formData.country || ''}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              required
            >
              <option value="">{t('admin.taxonomy.selectCountry')}</option>
              {allCountries.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
        </>
      );
    }

    if (activeTab === 'grapes') {
      return (
        <>
          <div className="form-group">
            <label>{t('admin.taxonomy.grapeNameLabel')}</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>{t('admin.taxonomy.synonymsLabel')}</label>
            <input
              type="text"
              value={formData.synonymsText || ''}
              onChange={(e) => setFormData({
                ...formData,
                synonymsText: e.target.value,
                synonyms: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
              })}
              placeholder={t('admin.taxonomy.synonymsPlaceholder')}
            />
          </div>
        </>
      );
    }
  };

  const renderItem = (item) => {
    if (activeTab === 'countries') {
      return <span>{item.name} {item.code && `(${item.code})`}</span>;
    }
    if (activeTab === 'regions') {
      return <span>{item.name} — {item.country?.name || t('admin.taxonomy.unknownCountry')}</span>;
    }
    if (activeTab === 'grapes') {
      return <span>{item.name} {item.synonyms?.length > 0 && <em>({item.synonyms.join(', ')})</em>}</span>;
    }
  };

  return (
    <div className="admin-taxonomy-page">
      <div className="page-header">
        <h1>{t('admin.taxonomy.title')}</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? t('common.cancel') : addBtnLabel}
        </button>
      </div>

      <div className="tabs">
        {['countries', 'regions', 'grapes'].map(tab => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {t(`admin.taxonomy.${tab}`)}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="card create-form">
          <h2>{addFormTitle}</h2>
          <form onSubmit={handleCreate}>
            {renderForm()}
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">{t('admin.taxonomy.createBtn')}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">{t('common.cancel')}</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading">{t('common.loading')}</div>
      ) : (
        <div className="items-list">
          {items.length === 0 ? (
            <div className="empty-state"><p>{t('admin.taxonomy.noItems', { tab: activeTab })}</p></div>
          ) : (
            items.map(item => (
              <div key={item._id} className="taxonomy-item">
                <span>{renderItem(item)}</span>
                <button
                  onClick={() => handleDelete(item._id)}
                  className="btn btn-danger btn-small"
                >
                  {t('admin.taxonomy.deleteBtn')}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default AdminTaxonomy;
