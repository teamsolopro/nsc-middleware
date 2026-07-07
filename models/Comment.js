const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    linkedReviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Review', required: true },
    authorName: { type: String, required: true },
    authorEmail: String,
    body: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    submittedAt: { type: Date, default: Date.now },
    adminNotes: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Comment', commentSchema);
