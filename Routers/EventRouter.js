const express = require('express');
const router = express.Router();

// ייבוא הפונקציות מה-Controller
const {
  createEvent,
  getAllEvents,
  closeEvent,
  updateEvent,
  deleteEvent,
  getMyEvents
} = require('../Controllers/EventController');// ייבוא ה-Middleware לאימות
const { authenticateToken } = require('../Middlewear/Middlewear');

// === ניתובים ===

// יצירת אירוע חדש - רק למשתמשים רשומים
router.post('/create', authenticateToken, createEvent);

// קבלת כל האירועים הפתוחים - רק למוזיקאים פעילים
router.get('/all', authenticateToken, getAllEvents);

// קבלת האירועים שלי - רק למשתמש המחובר
router.get('/my-events', authenticateToken, getMyEvents);

// עריכת אירוע - רק היוצר
router.put('/:eventId', authenticateToken, updateEvent);

// מחיקת אירוע - רק היוצר
router.delete('/:eventId', authenticateToken, deleteEvent);

// סגירת אירוע - רק למוזיקאים רשומים
router.put('/:eventId/close', authenticateToken, closeEvent);

module.exports = router;
