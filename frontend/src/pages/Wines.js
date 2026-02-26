import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import ImageGallery from '../components/ImageGallery';
import './Wines.css';

function WineCardImage({ wine }) {
  const [hasGallery, setHasGallery] = useState(null);

  if (hasGallery === false) {
    // No uploaded images — show default image or placeholder
    if (wine.image) {
      return (
        <img
          src={wine.image}
          alt={wine.name}
          className="wine-image"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      );
    }
    return (
      <div className={`wine-image-placeholder ${wine.type}`}>
        <span>{wine.type}</span>
      </div>
    );
  }

  return (
    <div className="wine-card-gallery">
      <ImageGallery
        wineDefinitionId={wine._id}
        size="medium"
        onEmpty={() => setHasGallery(false)}
      />
      {hasGallery === null && (
        <div className={`wine-image-placeholder ${wine.type}`}>
          <span>{wine.type}</span>
        </div>
      )}
    </div>
  );
}

function Wines() {
  const { t } = useTranslation();
  const { apiFetch, user } = useAuth();
  const isPrivileged = user?.roles?.includes('admin') || user?.roles?.includes('somm');

  const [wines, setWines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    sort: 'name'
  });

  useEffect(() => {
    if (search.length > 0 || isPrivileged) {
      fetchWines();
    } else {
      setWines([]);
    }
  }, [search, filters]);

  const fetchWines = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filters.type) params.append('type', filters.type);
      params.append('sort', filters.sort);
      params.append('limit', '50');

      const res = await apiFetch(`/api/wines?${params}`);
      const data = await res.json();
      if (res.ok) {
        setWines(data.wines);
      }
    } catch (err) {
      console.error('Failed to fetch wines:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wines-page">
      <div className="page-header">
        <h1>{t('wines.title')}</h1>
        <p>{t('wines.subtitle')}</p>
      </div>

      <div className="filters-bar">
        <input
          type="text"
          placeholder={t('wines.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
        >
          <option value="">{t('wines.allTypes')}</option>
          <option value="red">{t('wines.typeRed')}</option>
          <option value="white">{t('wines.typeWhite')}</option>
          <option value="rosé">{t('wines.typeRose')}</option>
          <option value="sparkling">{t('wines.typeSparkling')}</option>
          <option value="dessert">{t('wines.typeDessert')}</option>
          <option value="fortified">{t('wines.typeFortified')}</option>
        </select>
        <select
          value={filters.sort}
          onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
        >
          <option value="name">{t('wines.sortNameAZ')}</option>
          <option value="-name">{t('wines.sortNameZA')}</option>
          <option value="producer">{t('wines.sortProducerAZ')}</option>
          <option value="-createdAt">{t('wines.sortRecentlyAdded')}</option>
        </select>
      </div>

      {!loading && (
        <p className="results-count">
          {t('wines.found', { count: wines.length })}
        </p>
      )}

      {loading ? (
        <div className="loading">{t('wines.loadingWines')}</div>
      ) : wines.length === 0 ? (
        <div className="empty-state">
          <p>{search.length === 0 && !isPrivileged ? t('wines.enterSearchTerm') : t('wines.noWinesFound')}</p>
        </div>
      ) : (
        <div className="wines-grid">
          {wines.map(wine => (
            <div key={wine._id} className="wine-card">
              <WineCardImage wine={wine} />
              <div className="wine-card-body">
                <div className="wine-header">
                  <h3>{wine.name}</h3>
                  <span className={`wine-type ${wine.type}`}>{wine.type}</span>
                </div>
                <p className="producer">{wine.producer}</p>
                <div className="wine-details">
                  <div><strong>{t('wines.countryLabel')}</strong> {wine.country?.name || 'Unknown'}</div>
                  {wine.region && <div><strong>{t('wines.regionLabel')}</strong> {wine.region.name}</div>}
                  {wine.appellation && <div><strong>{t('wines.appellationLabel')}</strong> {wine.appellation}</div>}
                  {wine.grapes?.length > 0 && (
                    <div><strong>{t('wines.grapesLabel')}</strong> {wine.grapes.map(g => g.name).join(', ')}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Wines;
