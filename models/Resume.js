const mongoose = require('mongoose');

const ResumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Get all resumes for a user
ResumeSchema.statics.getResumesByUserId = async function(userId) {
  const userIdObj = new mongoose.Types.ObjectId(userId.toString());
  return this.find({ userId: userIdObj }).sort({ uploadedAt: -1 });
};

// Get a single resume by ID and userId
ResumeSchema.statics.getResumeById = async function(resumeId, userId) {
  const userIdObj = new mongoose.Types.ObjectId(userId.toString());
  return this.findOne({ _id: resumeId, userId: userIdObj });
};

module.exports = mongoose.model('Resume', ResumeSchema);

