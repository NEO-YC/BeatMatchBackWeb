const User = require('../Models/UserModel');

// הוסף זמינות חדשה
const addAvailability = async (req, res) => {
  try {
    const { from, to, startTime, endTime, type } = req.body;
    const userId = req.user.userId;

    // בדוק ששדות חובה קיימים
    if (!from || !to || !startTime || !endTime) {
      return res.status(400).json({
        message: 'חסרים שדות חובה: from, to, startTime, endTime'
      });
    }

    // מצא את המשתמש
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }

    // הוסף זמינות חדשה
    const newAvailability = {
      from,
      to,
      startTime,
      endTime,
      type: type || 'available'
    };

    user.musicianProfile[0].availability.push(newAvailability);
    await user.save();

    res.status(201).json({
      message: 'זמינות נוספה בהצלחה',
      availability: newAvailability
    });
  } catch (error) {
    console.error('Error adding availability:', error);
    res.status(500).json({
      message: 'שגיאה בהוספת זמינות',
      error: error.message
    });
  }
};

// קבל את כל הזמינויות של מוזיקאי
const getAvailability = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }

    const availability = user.musicianProfile[0]?.availability || [];

    res.status(200).json({
      message: 'זמינויות התקבלו בהצלחה',
      availability
    });
  } catch (error) {
    console.error('Error getting availability:', error);
    res.status(500).json({
      message: 'שגיאה בקבלת זמינויות',
      error: error.message
    });
  }
};

// ערוך זמינות קיימת
const updateAvailability = async (req, res) => {
  try {
    const { availabilityId } = req.params;
    const { from, to, startTime, endTime, type } = req.body;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }

    const availability = user.musicianProfile[0].availability.id(availabilityId);
    if (!availability) {
      return res.status(404).json({ message: 'זמינות לא נמצאה' });
    }

    // עדכן את השדות
    if (from) availability.from = from;
    if (to) availability.to = to;
    if (startTime) availability.startTime = startTime;
    if (endTime) availability.endTime = endTime;
    if (type) availability.type = type;

    await user.save();

    res.status(200).json({
      message: 'זמינות עודכנה בהצלחה',
      availability
    });
  } catch (error) {
    console.error('Error updating availability:', error);
    res.status(500).json({
      message: 'שגיאה בעדכון זמינות',
      error: error.message
    });
  }
};

// מחק זמינות
const deleteAvailability = async (req, res) => {
  try {
    const { availabilityId } = req.params;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }

    user.musicianProfile[0].availability.id(availabilityId).deleteOne();
    await user.save();

    res.status(200).json({
      message: 'זמינות נמחקה בהצלחה'
    });
  } catch (error) {
    console.error('Error deleting availability:', error);
    res.status(500).json({
      message: 'שגיאה במחיקת זמינות',
      error: error.message
    });
  }
};

module.exports = {
  addAvailability,
  getAvailability,
  updateAvailability,
  deleteAvailability
};
