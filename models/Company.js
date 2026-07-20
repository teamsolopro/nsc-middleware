const mongoose = require('mongoose');
const REGIONS = require('../lib/regions');

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    city: String,
    state: { type: String, enum: ['NC', 'SC'] },
    region: { type: String, enum: REGIONS },
    website: String,
    logoUrl: String,
    bio: String,
    socialLinks: {
      facebook: String,
      instagram: String,
      twitter: String,
      tiktok: String,
      youtube: String,
    },
    contactName: String,
    contactEmail: String,
    contactPhone: String,
    homeVenueIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Venue' }],
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Company', companySchema);
