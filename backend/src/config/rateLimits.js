/**
 * In-memory cache for rate limit configuration.
 * Loaded once from MongoDB on startup; updated instantly when admin saves new values.
 * Falls back to defaults if the DB is unavailable.
 */

const defaults = {
  api:   { max: 200 },
  write: { max: 60 },
  auth:  { max: 10 }
};

let cache = {
  api:   { max: defaults.api.max },
  write: { max: defaults.write.max },
  auth:  { max: defaults.auth.max }
};

async function load() {
  try {
    // Lazy require to avoid circular dependency at module load time
    const SiteConfig = require('../models/SiteConfig');
    const doc = await SiteConfig.findOne({ key: 'rateLimits' });
    if (doc && doc.value) {
      cache = {
        api:   { max: doc.value.api?.max   ?? defaults.api.max   },
        write: { max: doc.value.write?.max ?? defaults.write.max },
        auth:  { max: doc.value.auth?.max  ?? defaults.auth.max  }
      };
    }
  } catch (err) {
    console.warn('[rateLimits] Could not load config from DB, using defaults:', err.message);
  }
}

function get() {
  return cache;
}

function set(value) {
  cache = value;
}

module.exports = { load, get, set, defaults };
