const mongoose = require('mongoose');

const auditionSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['pending', 'published', 'expired', 'rejected'],
      default: 'pending',
    },
    submittedAt: { type: Date, default: Date.now },
    publishedAt: Date,
    expiresAt: Date,

    linkedCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    linkedVenueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue' },
    linkedProductionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Production' },

    show: {
      title: { type: String, required: true },
      description: String,
      type: {
        type: String,
        enum: ['musical', 'play', 'improv', 'opera', 'dance', 'other'],
      },
      showDates: {
        opens: Date,
        closes: Date,
      },
      isUnion: Boolean,
      unionType: { type: String, enum: ['AEA', 'non-union', 'both'] },
    },

    auditionDates: [
      {
        date: Date,
        startTime: String,
        endTime: String,
        format: {
          type: String,
          enum: ['open call', 'by appointment', 'virtual'],
        },
      },
    ],

    roles: [
      {
        name: String,
        voiceType: String,
        ageRange: String,
        gender: String,
        notes: String,
      },
    ],

    requirements: {
      preparedSong: Boolean,
      songLength: String,
      coldReading: Boolean,
      headshot: Boolean,
      resume: Boolean,
      callbacks: String,
      conflictDates: String,
      additionalNotes: String,
    },

    contactName: String,
    contactEmail: String,
    contactPhone: String,
    submittedByEmail: String,
    adminNotes: String,
  },
  { timestamps: true }
);

// Auto-set expiresAt to last audition date + 1 day when publishing
auditionSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status === 'published') {
    if (!this.publishedAt) this.publishedAt = new Date();
    if (!this.expiresAt && this.auditionDates && this.auditionDates.length > 0) {
      const lastDate = this.auditionDates
        .map((d) => d.date)
        .filter(Boolean)
        .sort((a, b) => b - a)[0];
      if (lastDate) {
        const expires = new Date(lastDate);
        expires.setDate(expires.getDate() + 1);
        this.expiresAt = expires;
      }
    }
  }
  next();
});

module.exports = mongoose.model('Audition', auditionSchema);
