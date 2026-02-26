const mongoose = require('mongoose');

/**
 * ExchangeRateSnapshot — one document per calendar day.
 *
 * Stores USD-based exchange rates fetched on that day.
 * Bottles and market-price entries reference a date (not the full map),
 * so the same rates are never duplicated across many documents.
 */
const exchangeRateSnapshotSchema = new mongoose.Schema({
  date: {
    type: String, // 'YYYY-MM-DD'
    required: true,
    unique: true,
    index: true
  },
  rates: {
    type: Map,
    of: Number,
    required: true
  },
  fetchedAt: {
    type: Date,
    default: Date.now
  }
}, { versionKey: false });

module.exports = mongoose.model('ExchangeRateSnapshot', exchangeRateSnapshotSchema);
