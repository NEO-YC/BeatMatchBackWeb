const mongoose = require('mongoose');

// מודל לאירועים - לוח מודעות לחיפוש מוזיקאים
const eventSchema = new mongoose.Schema({
  // פרטי האירוע
  eventType: { 
    type: String, 
    required: true,
    enum: ['חתונה', 'בר/בת מצווה', 'ברית/בריתה', 'אירוע פרטי', 'מסיבה', 'אירוע עסקי', 'אחר'],
    trim: true 
  },
  eventDate: { 
    type: Date, 
    required: true 
  },
  location: { 
    type: String, 
    required: true, 
    trim: true 
  },
  
  // תקציב - טווח משוער
  budgetMin: { 
    type: Number 
  },
  budgetMax: { 
    type: Number 
  },

  // תיאור מפורט של הצורך
  description: { 
    type: String, 
    required: true, 
    trim: true,
    maxlength: 500 
  },

  // סטטוס האירוע
  status: { 
    type: String, 
    enum: ['פתוח', 'סגור'],
    default: 'פתוח' 
  },

  // מי יצר את האירוע (משתמש רשום)
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'P-users',
    required: true 
  },

  // מי סגר את האירוע (מוזיקאי שסגר עסקה)
  closedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'P-users',
    default: null 
  },

  // תאריך סגירה
  closedAt: { 
    type: Date 
  }

}, {
  timestamps: true // יוסיף createdAt ו-updatedAt אוטומטית
});

// אינדקס לחיפוש מהיר לפי סטטוס
eventSchema.index({ status: 1, createdAt: -1 });

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
