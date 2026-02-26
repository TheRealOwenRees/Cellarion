import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import './WineRequests.css';

function WineRequests() {
  const { t } = useTranslation();
  const { apiFetch } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    wineName: '',
    sourceUrl: '',
    image: ''
  });

  useEffect(() => {
    fetchRequests();
  }, [apiFetch]);

  const fetchRequests = async () => {
    try {
      const res = await apiFetch('/api/wine-requests');
      const data = await res.json();
      if (res.ok) {
        setRequests(data.requests);
      }
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/wine-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setFormData({ wineName: '', sourceUrl: '', image: '' });
        setShowForm(false);
        fetchRequests();
      }
    } catch (err) {
      alert('Failed to submit request');
    }
  };

  return (
    <div className="wine-requests-page">
      <div className="page-header">
        <h1>{t('wineRequests.title')}</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? t('common.cancel') : t('wineRequests.newRequest')}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2>{t('wineRequests.requestTitle')}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>{t('wineRequests.wineNameLabel')}</label>
              <input
                type="text"
                value={formData.wineName}
                onChange={(e) => setFormData({ ...formData, wineName: e.target.value })}
                required
                placeholder={t('wineRequests.wineNamePlaceholder')}
              />
            </div>
            <div className="form-group">
              <label>{t('wineRequests.sourceUrlLabel')}</label>
              <input
                type="url"
                value={formData.sourceUrl}
                onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
                required
                placeholder="https://..."
              />
            </div>
            <div className="form-group">
              <label>{t('wineRequests.imageUrlLabel')}</label>
              <input
                type="url"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-success">{t('wineRequests.submitRequest')}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading">{t('wineRequests.loadingRequests')}</div>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <p>{t('wineRequests.noRequests')}</p>
        </div>
      ) : (
        <div className="requests-list">
          {requests.map(request => (
            <div key={request._id} className="request-card">
              <div className="request-header">
                <h3>{request.wineName}</h3>
                <span className={`status-badge status-${request.status}`}>
                  {request.status}
                </span>
              </div>
              <p><strong>{t('common.source')}:</strong> <a href={request.sourceUrl} target="_blank" rel="noopener noreferrer">
                {request.sourceUrl}
              </a></p>
              {request.status === 'resolved' && request.linkedWineDefinition && (
                <div className="resolution">
                  <strong>{t('wineRequests.linkedTo')}</strong> {request.linkedWineDefinition.name} by {request.linkedWineDefinition.producer}
                </div>
              )}
              {request.adminNotes && (
                <div className="admin-notes">
                  <strong>{t('wineRequests.adminNotes')}</strong> {request.adminNotes}
                </div>
              )}
              <div className="request-footer">
                <small>{t('wineRequests.submitted', { date: new Date(request.createdAt).toLocaleDateString() })}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default WineRequests;
