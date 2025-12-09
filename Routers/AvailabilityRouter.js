const express = require('express');
const router = express.Router();
const {
  addAvailability,
  getAvailability,
  updateAvailability,
  deleteAvailability
} = require('../Controllers/AvailabilityController');
const { protect } = require('../Middlewear/Middlewear');

// כל ה-routes דורשים התחברות
router.use(protect);

// הוסף זמינות חדשה
router.post('/add', addAvailability);

// קבל זמינויות
router.get('/', getAvailability);

// ערוך זמינות
router.put('/:availabilityId', updateAvailability);

// מחק זמינות
router.delete('/:availabilityId', deleteAvailability);

module.exports = router;
