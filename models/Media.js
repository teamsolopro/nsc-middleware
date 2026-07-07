const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema(
  {
    linkedProductionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Production', required: true },
    url: { type: String, required: true },
    caption: String,
    mediaType: {
      type: String,
      enum: ['poster', 'production_shot', 'headshot', 'other'],
      default: 'other',
    },
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Media', mediaSchema);
