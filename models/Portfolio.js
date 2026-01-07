const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  technologies: {
    type: [String],
    default: []
  },
  image: {
    type: String,
    default: null
  },
  link: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

const SocialLinksSchema = new mongoose.Schema({
  linkedin: {
    type: String,
    default: ''
  },
  github: {
    type: String,
    default: ''
  },
  twitter: {
    type: String,
    default: ''
  },
  website: {
    type: String,
    default: ''
  }
}, {
  _id: false
});

const ExperienceSchema = new mongoose.Schema({
  company: {
    type: String,
    required: true
  },
  position: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  startDate: {
    type: String,
    default: ''
  },
  endDate: {
    type: String,
    default: ''
  },
  isCurrent: {
    type: Boolean,
    default: false
  },
  location: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

const EducationSchema = new mongoose.Schema({
  institution: {
    type: String,
    required: true
  },
  degree: {
    type: String,
    required: true
  },
  field: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  startDate: {
    type: String,
    default: ''
  },
  endDate: {
    type: String,
    default: ''
  },
  isCurrent: {
    type: Boolean,
    default: false
  },
  location: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

const AchievementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  issuer: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  date: {
    type: String,
    default: ''
  },
  url: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['certification', 'award', 'achievement', 'other'],
    default: 'achievement'
  }
}, {
  timestamps: true
});

const PortfolioSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // TODO: PRODUCTION - Change to required: true after migration
    // Currently optional for backward compatibility with old portfolios
    required: false,
    unique: true,
    sparse: true, // Allows multiple null values during migration
    index: true
  },
  name: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: ''
  },
  profileImage: {
    type: String,
    default: null
  },
  skills: {
    type: [String],
    default: []
  },
  projects: {
    type: [ProjectSchema],
    default: []
  },
  socialLinks: {
    type: SocialLinksSchema,
    default: () => ({})
  },
  experience: {
    type: [ExperienceSchema],
    default: []
  },
  education: {
    type: [EducationSchema],
    default: []
  },
  achievements: {
    type: [AchievementSchema],
    default: []
  }
}, {
  timestamps: true
});

// Get or create portfolio for a specific user
// 
// TEMPORARY IMPLEMENTATION - NOT FOR PRODUCTION
// 
// PRODUCTION TODO:
// 1. Remove userEmail parameter after all old portfolios are migrated
// 2. Remove email-based lookup logic (lines with migration comment)
// 3. Change userId to required: true in schema
// 4. Run a one-time migration script to:
//    - Find all portfolios without userId
//    - Match them to users by email
//    - Update them with userId
//    - Delete any orphaned portfolios that can't be matched
// 5. After migration, simplify this method to only:
//    - Find by userId
//    - Create if not found
//
PortfolioSchema.statics.getPortfolio = async function(userId, userEmail = null) {
  if (!userId) {
    throw new Error('UserId is required');
  }
  
  // Convert userId to string first, then to ObjectId
  const userIdString = userId.toString ? userId.toString() : String(userId);
  
  // Validate and convert to ObjectId
  if (!mongoose.Types.ObjectId.isValid(userIdString)) {
    throw new Error('Invalid userId format');
  }
  
  const userIdObj = new mongoose.Types.ObjectId(userIdString);
  
  // First, try to find portfolio by userId
  let portfolio = await this.findOne({ userId: userIdObj });
  
  // TEMPORARY: Migration logic for old portfolios without userId
  // TODO: Remove this after running production migration script
  // NOTE: This approach works but is not ideal for production (see MIGRATION_APPROACH_ANALYSIS.md)
  if (!portfolio && userEmail) {
    // Use findOneAndUpdate to prevent race conditions during migration
    portfolio = await this.findOneAndUpdate(
      { 
        userId: { $exists: false },
        email: userEmail.toLowerCase()
      },
      { $set: { userId: userIdObj } },
      { new: true } // Return updated document
    );
    
    if (portfolio) {
      console.log(`Migrated portfolio for user ${userId} (email: ${userEmail})`);
    }
  }
  // END TEMPORARY MIGRATION LOGIC
  
  // If still not found, create a new portfolio
  if (!portfolio) {
    portfolio = await this.create({ userId: userIdObj });
  }
  
  return portfolio;
};

module.exports = mongoose.model('Portfolio', PortfolioSchema);


