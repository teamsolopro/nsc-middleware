const mongoose = require('mongoose');

const venueSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: String,
    city: String,
    state: { type: String, enum: ['NC', 'SC'] },
    zip: String,
    county: String,
    region: {
      type: String,
      enum: [
        'Charlotte metro',
        'Triad',
        'Triangle',
        'Wilmington / Cape Fear',
        'Asheville / Western NC',
        'Lowcountry',
        'Upstate SC',
        'Other NC',
        'Other SC',
      ],
    },
    parkingNotes: String,
    accessibilityNotes: String,
    mapUrl: String,
    website: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Venue', venueSchema);
