const express = require('express');
const router = express.Router();
const reviewController = require('../Controllers/ReviewController');
const { verifyToken } = require('../Middlewear/Middlewear');

// יצירת ביקורת חדשה (דורש התחברות)
router.post('/create', verifyToken, reviewController.createReview);

// קבלת כל הביקורות של מוזיקאי (public)
router.get('/musician/:musicianId', reviewController.getReviewsForMusician);

// קבלת דירוג ממוצע בלבד (public - למוצג בכרטיס)
router.get('/average/:musicianId', reviewController.getAverageRating);

// עדכון ביקורת (דורש התחברות - רק כותב הביקורת)
router.put('/update/:reviewId', verifyToken, reviewController.updateReview);

// מחיקת ביקורת (דורש התחברות - רק כותב או המוזיקאי)
router.delete('/delete/:reviewId', verifyToken, reviewController.deleteReview);

module.exports = router;
