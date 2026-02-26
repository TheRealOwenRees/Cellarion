import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { t } = useTranslation();
  const { login, register } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let result;
    if (isLogin) {
      result = await login(formData.username, formData.password);
    } else {
      result = await register(formData.username, formData.email, formData.password);
    }

    setLoading(false);

    if (!result.success) {
      setError(result.error);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setFormData({ username: '', email: '', password: '' });
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{isLogin ? t('auth.login') : t('auth.register')}</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('auth.username')}</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder={t('auth.usernamePlaceholder')}
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label>{t('auth.email')}</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder={t('auth.emailPlaceholder')}
              />
            </div>
          )}

          <div className="form-group">
            <label>{t('auth.password')}</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder={t('auth.passwordPlaceholder')}
              minLength="6"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? t('auth.pleaseWait') : (isLogin ? t('auth.login') : t('auth.register'))}
          </button>
        </form>

        <div className="toggle-mode">
          <p>
            {isLogin ? t('auth.noAccount') : t('auth.alreadyHaveAccount')}
            <button type="button" onClick={toggleMode} className="link-button">
              {isLogin ? t('auth.register') : t('auth.login')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
