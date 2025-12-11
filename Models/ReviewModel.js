const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  // מוזיקאי שמדורג
  musicianId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'P-users',
    required: true,
    index: true
  },

  // משתמש שכתב את הביקורת
  reviewerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'P-users',
    required: true
  },

  // דירוג כוכבים (1-5)
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },

  // כותרת הביקורת
  title: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 100,
    trim: true
  },

  // טקסט הביקורת
  comment: {
    type: String,
    required: true,
    minlength: 10,
    maxlength: 1000,
    trim: true
  },

  // סוג האירוע (חתונה, מסיבה, קונצרט וכו')
  eventType: {
    type: String,
    enum: ['חתונה', 'מסיבה', 'קונצרט', 'כנס', 'קידום עסק', 'ערב יום הולדת', 'אחר'],
    required: true
  },

  // אם המוזיקאי תגובה לביקורת (אופציונלי)
  musicianReply: {
    type: String,
    maxlength: 500,
    default: null
  },

  // מספר "מועיל" votes (אופציונלי לעתיד)
  helpfulCount: {
    type: Number,
    default: 0
  },

  // סטטוס (פעיל / מחוק מישהו)
  isActive: {
    type: Boolean,
    default: true
  },

  // תאריכים
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index לחיפוש מהיר
reviewSchema.index({ musicianId: 1, createdAt: -1 });
reviewSchema.index({ reviewerId: 1 });

// Virtual לחישוב כמה ימים עברו מהכתיבה
reviewSchema.virtual('daysAgo').get(function() {
  const days = Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'היום';
  if (days === 1) return 'אתמול';
  if (days < 7) return `${days} ימים`;
  if (days < 30) return `${Math.floor(days / 7)} שבועות`;
  if (days < 365) return `${Math.floor(days / 30)} חודשים`;
  return `${Math.floor(days / 365)} שנים`;
});

// טרנספורם ל-JSON עם Virtual
reviewSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Review', reviewSchema);
