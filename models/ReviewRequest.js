const mongoose = require('mongoose');

const reviewRequestSchema = new mongoose.Schema(
  {
    linkedCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    linkedVenueId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Venue' },

    show: {
      title:    { type: String, required: true },
      author:   String,
      showType: [{ type: String, enum: ['musical','play','drama','comedy','one_act','revue','opera','operetta','fringe','immersive','improv','childrens','other'] }],
      runDates: { opens: Date, closes: Date },
      showtimes: String,
    },

    compTickets:     { type: Boolean, default: false },
    compTicketCount: { type: Number, min: 1, max: 4 },

    contactName:  String,
    contactEmail: String,
    contactPhone: String,
    notes:        String,

    status: {
      type: String,
      enum: ['pending', 'reviewer_assigned', 'review_pending', 'review_completed', 'not_reviewed'],
      default: 'pending',
    },
    reviewerName: String,
    adminNotes:   String,
    submittedAt:  { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReviewRequest', reviewRequestSchema);
