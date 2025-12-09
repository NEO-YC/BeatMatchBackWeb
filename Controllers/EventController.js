const Event = require('../Models/EventModel');
const User = require('../Models/UserModel');

// יצירת אירוע חדש - רק למשתמשים רשומים
const createEvent = async (req, res) => {
  try {
    // בדיקה שהמשתמש מחובר
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ 
        message: 'יש להתחבר כדי לפרסם אירוע' 
      });
    }

    const { 
      eventType, 
      eventDate, 
      location, 
      budgetMin, 
      budgetMax, 
      description 
    } = req.body;

    // וולידציה בסיסית
    if (!eventType || !eventDate || !location || !description) {
      return res.status(400).json({ 
        message: 'חסרים שדות חובה' 
      });
    }

    // יצירת האירוע עם קישור למשתמש היוצר
    const newEvent = new Event({
      eventType,
      eventDate,
      location,
      budgetMin,
      budgetMax,
      description,
      status: 'פתוח',
      createdBy: req.user.userId
    });

    await newEvent.save();

    res.status(201).json({ 
      message: 'האירוע פורסם בהצלחה!',
      event: newEvent 
    });

  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ 
      message: 'שגיאה ביצירת האירוע',
      error: error.message 
    });
  }
};

// קבלת כל האירועים הפתוחים - רק למוזיקאים פעילים
const getAllEvents = async (req, res) => {
  try {
    // בדיקה שהמשתמש מחובר
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ 
        message: 'נדרשת התחברות',
        needsLogin: true 
      });
    }

    // בדיקה שהמשתמש הוא מוזיקאי פעיל
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ 
        message: 'משתמש לא נמצא' 
      });
    }

    // בדיקה אם יש פרופיל מוזיקאי פעיל
    const hasActiveProfile = user.musicianProfile && 
                            user.musicianProfile.length > 0 && 
                            user.musicianProfile[0].isActive === true;
    
    if (!hasActiveProfile) {
      return res.status(403).json({ 
        message: 'גישה למוזיקאים פעילים בלבד',
        needsPayment: true 
      });
    }

    // שליפת כל האירועים הפתוחים, ממוינים לפי תאריך יצירה (החדשים ראשונים)
    const events = await Event.find({ status: 'פתוח' })
      .populate({
        path: 'createdBy',
        select: 'firstname lastname email musicianProfile'
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ 
      events,
      count: events.length,
      currentUserId: req.user.userId
    });

  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ 
      message: 'שגיאה בטעינת האירועים',
      error: error.message 
    });
  }
};

// ספירת אירועים פתוחים - למוזיקאים פעילים (לאינדיקטור)
const getOpenEventsCount = async (req, res) => {
  try {
    // בדיקה שהמשתמש מחובר
    if (!req.user || !req.user.userId) {
      return res.status(200).json({ count: 0 });
    }

    // בדיקה שהמשתמש הוא מוזיקאי פעיל
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(200).json({ count: 0 });
    }

    const hasActiveProfile = user.musicianProfile && 
                            user.musicianProfile.length > 0 && 
                            user.musicianProfile[0].isActive === true;

    if (!hasActiveProfile) {
      return res.status(200).json({ count: 0 });
    }

    // ספירת אירועים פתוחים
    const count = await Event.countDocuments({ status: 'פתוח' });

    res.status(200).json({ count });

  } catch (error) {
    console.error('Error counting events:', error);
    res.status(200).json({ count: 0 });
  }
};

// סגירת אירוע - כל מוזיקאי רשום יכול לסגור
const closeEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    // בדיקה שהמשתמש מחובר
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ 
        message: 'נדרשת התחברות' 
      });
    }

    // בדיקה שהמשתמש הוא מוזיקאי
    const user = await User.findById(req.user.userId);
    
    if (!user || !user.isMusician) {
      return res.status(403).json({ 
        message: 'רק מוזיקאים יכולים לסגור אירועים' 
      });
    }

    // מציאת האירוע ועדכון
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ 
        message: 'אירוע לא נמצא' 
      });
    }

    if (event.status === 'סגור') {
      return res.status(400).json({ 
        message: 'האירוע כבר סגור' 
      });
    }

    // עדכון האירוע לסגור
    event.status = 'סגור';
    event.closedBy = req.user.userId;
    event.closedAt = new Date();

    await event.save();

    res.status(200).json({ 
      message: 'האירוע נסגר בהצלחה!',
      event 
    });

  } catch (error) {
    console.error('Error closing event:', error);
    res.status(500).json({ 
      message: 'שגיאה בסגירת האירוע',
      error: error.message 
    });
  }
};

// עריכת אירוע - רק היוצר יכול לערוך
const updateEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    // בדיקה שהמשתמש מחובר
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ 
        message: 'נדרשת התחברות' 
      });
    }

    // מציאת האירוע
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ 
        message: 'אירוע לא נמצא' 
      });
    }

    // בדיקה שהמשתמש המחובר הוא זה שיצר את האירוע או admin
    const userIdStr = req.user.userId.toString();
    const creatorIdStr = event.createdBy.toString();
    const isOwner = creatorIdStr === userIdStr;
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ 
        message: 'רק יוצר האירוע או admin יכולים לערוך אותו' 
      });
    }

    // עדכון השדות המותרים
    const allowedUpdates = [
      'contactName', 
      'contactPhone', 
      'contactEmail', 
      'eventType', 
      'eventDate', 
      'location', 
      'budgetMin', 
      'budgetMax', 
      'description'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        event[field] = req.body[field];
      }
    });

    await event.save();

    res.status(200).json({ 
      message: 'האירוע עודכן בהצלחה!',
      event 
    });

  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ 
      message: 'שגיאה בעדכון האירוע',
      error: error.message 
    });
  }
};

// מחיקת אירוע - רק היוצר יכול למחוק
const deleteEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    // בדיקה שהמשתמש מחובר
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ 
        message: 'נדרשת התחברות' 
      });
    }

    // מציאת האירוע
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ 
        message: 'אירוע לא נמצא' 
      });
    }

    // בדיקה שהמשתמש המחובר הוא זה שיצר את האירוע או admin
    const userIdStr = req.user.userId.toString();
    const creatorIdStr = event.createdBy.toString();
    const isOwner = creatorIdStr === userIdStr;
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ 
        message: 'רק יוצר האירוע או admin יכולים למחוק אותו' 
      });
    }

    // מחיקת האירוע
    await Event.findByIdAndDelete(eventId);

    res.status(200).json({ 
      message: 'האירוע נמחק בהצלחה!' 
    });

  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ 
      message: 'שגיאה במחיקת האירוע',
      error: error.message 
    });
  }
};

// קבלת האירועים של המשתמש המחובר
const getMyEvents = async (req, res) => {
  try {
    // בדיקה שהמשתמש מחובר
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ 
        message: 'נדרשת התחברות' 
      });
    }

    // שליפת כל האירועים של המשתמש, ממוינים לפי תאריך יצירה
    const events = await Event.find({ createdBy: req.user.userId })
      .sort({ createdAt: -1 });

    res.status(200).json({ 
      events,
      count: events.length 
    });

  } catch (error) {
    console.error('Error fetching my events:', error);
    res.status(500).json({ 
      message: 'שגיאה בטעינת האירועים',
      error: error.message 
    });
  }
};

module.exports = {
  createEvent,
  getAllEvents,
  closeEvent,
  updateEvent,
  deleteEvent,
  getMyEvents
};
