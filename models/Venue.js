const mongoose = require('mongoose');
const REGIONS = require('../lib/regions');

const venueSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: String,
    city: String,
    state: { type: String, enum: ['NC', 'SC'] },
    zip: String,
    county: String,
    region: { type: String, enum: REGIONS },
    parkingNotes: String,
    accessibilityNotes: String,
    mapUrl: String,
    website: String,
    lat: Number,
    lng: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Venue', venueSchema);
