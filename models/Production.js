const mongoose = require('mongoose');

const productionSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['pending', 'published', 'closed', 'rejected'],
      default: 'pending',
    },
    submittedAt: { type: Date, default: Date.now },
    publishedAt: Date,
    expiresAt: Date,

    linkedCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    linkedVenueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue' },
    linkedAuditionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Audition' },

    show: {
      title: { type: String, required: true },
      author: String,
      composer: String,
      description: String,
      type: {
        type: String,
        enum: ['musical', 'play', 'improv', 'opera', 'dance', 'other'],
      },
      showType: [{
        type: String,
        enum: ['musical', 'play', 'drama', 'comedy', 'one_act', 'revue', 'opera', 'operetta', 'fringe', 'immersive', 'improv', 'childrens', 'other'],
      }],
      familyRating: { type: String, enum: ['G', 'PG', 'PG-13'] },
      posterImageUrl: String,
      runtime: String,
      contentWarnings: String,
    },

    mediaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Media' }],

    dates: {
      opens: Date,
      closes: Date,
    },

    performances: [
      {
        date: Date,
        time: String,
        specialNote: String,
      },
    ],

    tickets: {
      generalAdmission: Number,
      adult: Number,
      senior: Number,
      student: Number,
      child: Number,
      bookingUrl: String,
      boxOfficePhone: String,
      notes: String,
    },

    cast: [
      {
        role: String,
        actor: String,
      },
    ],

    contactName: String,
    contactEmail: String,
    contactPhone: String,
    submittedByEmail: String,
    adminNotes: String,
  },
  { timestamps: true }
);

// Auto-set expiresAt to closing date + 1 day when publishing
productionSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status === 'published') {
    if (!this.publishedAt) this.publishedAt = new Date();
    if (!this.expiresAt && this.dates && this.dates.closes) {
      const expires = new Date(this.dates.closes);
      expires.setDate(expires.getDate() + 1);
      this.expiresAt = expires;
    }
  }
  next();
});

module.exports = mongoose.model('Production', productionSchema);
