const https = require('https');

/**
 * Fetches current USD-based exchange rates from open.er-api.com.
 * Returns a plain rates object like { USD: 1, EUR: 0.92, SEK: 10.5, ... }
 * Returns null on failure — callers should degrade gracefully (price still saves,
 * just without a rate snapshot).
 */
function fetchExchangeRates() {
  return new Promise((resolve) => {
    https.get('https://open.er-api.com/v6/latest/USD', (res) => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        try {
          const data = JSON.parse(raw);
          resolve(data.result === 'success' && data.rates ? data.rates : null);
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

module.exports = { fetchExchangeRates };
