const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    reviewType: {
      type: String,
      enum: ['staff', 'guest'],
      required: true,
    },

    linkedProductionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Production', required: true },
    linkedCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },

    // Both staff and guest
    reviewerName: { type: String, required: true },
    reviewerEmail: String,
    rating: { type: Number, min: 1, max: 5 },
    body: { type: String, required: true },
    status: {
      type: String,
      enum: ['draft', 'pending', 'published', 'rejected'],
      default: 'pending',
    },

    // Staff only
    teaser: String,
    constructiveNotes: String,
    recommend: Boolean,
    isOfficial: { type: Boolean, default: false },
    publishedAt: Date,

    // Admin
    adminNotes: String,
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Review', reviewSchema);
