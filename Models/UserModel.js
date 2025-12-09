const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
  firstname: { type: String, required: true, trim: true },
  lastname:  { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:  { type: String, required: true, select: false },
  birthday:  { type: Date, required: true },
  phone:     { type: String, required: false, trim: true },
  isMusician:{ type: Boolean, default: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },

  musicianProfile: {
    type: [{
      instrument:       { type: String, trim: true },
      musictype:        { type: String, trim: true },
      experienceYears:  { type: String, trim: true },
      profilePicture:   { type: String, trim: true },
      eventTypes:       [{ type: String, trim: true }],
      bio:              { type: String, trim: true, maxlength: 250 },
      location:         [{ type: String, trim: true }],
      whatsappLink:     { type: String, trim: true },
      galleryPictures:  [{ type: String, trim: true }],
      galleryVideos:    [{ type: String, trim: true }],
      youtubeLinks:     [{ type: String, trim: true }],
      // האם המשתמש הוא זמר (vocalist) - שימוש ל-filter ותצוגה
      isSinger:          { type: Boolean, default: false },

      availability: {
        type: [{
          from:      { type: String, trim: true },  // YYYY-MM-DD
          to:        { type: String, trim: true },  // YYYY-MM-DD
          startTime: { type: String, trim: true },  // HH:mm
          endTime:   { type: String, trim: true },  // HH:mm
          type:      { type: String, enum: ['available', 'unavailable'], default: 'available' }
        }],
        default: []
      },
      // האם הפרופיל מוזיקאי פעיל (שניתן לראות בחיפוש) - פעיל לאחר תשלום
      isActive: { type: Boolean, default: false }
    }],
    default: []
  }

}, {
  timestamps: true
});




module.exports = mongoose.model('P-users', userSchema);
