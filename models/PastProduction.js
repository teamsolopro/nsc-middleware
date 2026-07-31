const mongoose = require('mongoose');

// Same shape as Production, stored in a separate collection so productions.json
// stays lean while company history pages can still query past shows.
const pastProductionSchema = new mongoose.Schema(
  {
    status: { type: String },
    submittedAt: Date,
    publishedAt: Date,
    expiresAt: Date,
    archivedAt: { type: Date, default: Date.now },

    linkedCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    linkedVenueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue' },
    linkedAuditionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Audition' },

    show: {
      title: String,
      author: String,
      composer: String,
      description: String,
      type: String,
      showType: [String],
      familyRating: String,
      posterImageUrl: String,
      runtime: String,
      contentWarnings: String,
    },

    mediaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Media' }],

    dates: {
      opens: Date,
      closes: Date,
    },

    performances: [{ date: Date, time: String, specialNote: String }],

    tickets: {
      generalAdmission: String,
      adult: String,
      senior: String,
      student: String,
      child: String,
      bookingUrl: String,
      boxOfficePhone: String,
      notes: String,
    },

    cast: [{ role: String, actor: String }],

    contactName: String,
    contactEmail: String,
    contactPhone: String,
    submittedByEmail: String,
    adminNotes: String,
  },
  { timestamps: true, collection: 'past_productions' }
);

module.exports = mongoose.model('PastProduction', pastProductionSchema);
