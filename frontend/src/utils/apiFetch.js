/**
 * Creates a fetch wrapper that:
 * - Automatically injects the current access token as Authorization header
 * - On 401, attempts a token refresh via /api/auth/refresh (httpOnly cookie)
 * - Retries the original request once with the new token
 * - Calls onLogout() if the refresh also fails
 *
 * Usage (via AuthContext):
 *   const { apiFetch } = useAuth();
 *   const res = await apiFetch('/api/cellars', { method: 'GET' });
 */
export function createApiFetch(getToken, onRefresh, onLogout) {
  return async function apiFetch(url, options = {}) {
    const token = getToken();
    const headers = { ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // credentials: 'include' is required so the httpOnly refresh cookie is sent
    let res = await fetch(url, { ...options, headers, credentials: 'include' });

    if (res.status === 401) {
      const newToken = await onRefresh();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        res = await fetch(url, { ...options, headers, credentials: 'include' });
      } else {
        onLogout();
      }
    }

    return res;
  };
}
