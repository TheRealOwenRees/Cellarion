const mongoose = require('mongoose');

const siteConfigSchema = new mongoose.Schema({
  key:       { type: String, required: true, unique: true },
  value:     { type: mongoose.Schema.Types.Mixed, required: true },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { versionKey: false });

module.exports = mongoose.model('SiteConfig', siteConfigSchema);
