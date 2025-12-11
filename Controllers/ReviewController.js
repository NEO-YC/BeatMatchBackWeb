const Review = require('../Models/ReviewModel');
const User = require('../Models/UserModel');
const mongoose = require('mongoose');

// יצירת ביקורת חדשה
exports.createReview = async (req, res) => {
  try {
    const { musicianId, rating, title, comment, eventType } = req.body;
    const reviewerId = req.user?.userId || req.user?.id || req.userId;

    // ולידציה
    if (!musicianId || !rating || !title || !comment || !eventType) {
      return res.status(400).json({ error: 'כל השדות חובה' });
    }

    if (!reviewerId) {
      return res.status(401).json({ error: 'יש להתחבר כדי לשלוח ביקורת' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'דירוג חייב להיות בין 1 ל-5' });
    }

    if (title.length < 5 || title.length > 100) {
      return res.status(400).json({ error: 'כותרת חייבת להיות בין 5 ל-100 תווים' });
    }

    if (comment.length < 10 || comment.length > 1000) {
      return res.status(400).json({ error: 'ביקורת חייבת להיות בין 10 ל-1000 תווים' });
    }

    // בדוק שהמוזיקאי קיים
    const musician = await User.findById(musicianId);
    if (!musician) {
      return res.status(404).json({ error: 'מוזיקאי לא נמצא' });
    }

    // בדוק שלא כתבו כבר ביקורת (אופציונלי - אפשר להוריד אם רוצים מספר ביקורות לאותו מוזיקאי)
    // const existingReview = await Review.findOne({ musicianId, reviewerId });
    // if (existingReview) {
    //   return res.status(400).json({ error: 'כבר כתבת ביקורת למוזיקאי זה' });
    // }

    // יצירת ביקורת חדשה
    const review = new Review({
      musicianId: musicianId,
      reviewerId: reviewerId,
      rating: parseInt(rating),
      title,
      comment,
      eventType
    });

    await review.save();

    // הזן population על המידע של כותב הביקורת
    await review.populate('reviewerId', 'firstname lastname profileImage');

    return res.status(201).json({
      message: 'ביקורת נוצרה בהצלחה',
      review
    });
  } catch (error) {
    console.error('Error creating review:', error);
    return res.status(500).json({ error: 'שגיאה בשרת', details: error.message });
  }
};

// קבלת כל הביקורות של מוזיקאי
exports.getReviewsForMusician = async (req, res) => {
  try {
    const { musicianId } = req.params;
    const { limit = 10, page = 1, sortBy = 'newest' } = req.query;

    // בדוק שהמוזיקאי קיים
    const musician = await User.findById(musicianId);
    if (!musician) {
      return res.status(404).json({ error: 'מוזיקאי לא נמצא' });
    }

    // הגדר סדר
    let sortOptions = { createdAt: -1 };
    if (sortBy === 'highest') sortOptions = { rating: -1, createdAt: -1 };
    if (sortBy === 'lowest') sortOptions = { rating: 1, createdAt: -1 };

    // קבל את הביקורות
    const skip = (page - 1) * limit;
    const reviews = await Review.find({ musicianId, isActive: true })
      .populate('reviewerId', 'firstname lastname profileImage')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // קבל את סך הביקורות
    const totalReviews = await Review.countDocuments({ musicianId, isActive: true });

    // חשב דירוג ממוצע
    const averageRating = await Review.aggregate([
      { $match: { musicianId: new mongoose.Types.ObjectId(musicianId), isActive: true } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          totalCount: { $sum: 1 }
        }
      }
    ]);

    const avgRating = averageRating.length > 0 ? parseFloat(averageRating[0].avgRating.toFixed(1)) : 0;
    const ratingCount = averageRating.length > 0 ? averageRating[0].totalCount : 0;

    return res.status(200).json({
      reviews,
      pagination: {
        total: totalReviews,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalReviews / limit)
      },
      statistics: {
        averageRating: avgRating,
        totalReviews: ratingCount,
        ratingDistribution: await getRatingDistribution(musicianId)
      }
    });
  } catch (error) {
    console.error('Error getting reviews:', error);
    return res.status(500).json({ error: 'שגיאה בשרת' });
  }
};

// קבלת דירוג ממוצע לכרטיס מוזיקאי
exports.getAverageRating = async (req, res) => {
  try {
    const { musicianId } = req.params;

    const result = await Review.aggregate([
      { $match: { musicianId: new mongoose.Types.ObjectId(musicianId), isActive: true } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          totalCount: { $sum: 1 }
        }
      }
    ]);

    const avgRating = result.length > 0 ? parseFloat(result[0].avgRating.toFixed(1)) : 0;
    const totalReviews = result.length > 0 ? result[0].totalCount : 0;

    return res.status(200).json({
      averageRating: avgRating,
      totalReviews: totalReviews,
      ratingDistribution: await getRatingDistribution(musicianId)
    });
  } catch (error) {
    console.error('Error getting average rating:', error);
    return res.status(500).json({ error: 'שגיאה בשרת' });
  }
};

// עדכון ביקורת (כותב הביקורת או Admin יכולים)
exports.updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, title, comment, eventType } = req.body;
    const userId = req.user?.userId || req.user?.id || req.userId;
    const userRole = req.user?.role;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ error: 'ביקורת לא נמצאה' });
    }

    // בדוק הרשאות: כותב הביקורת או Admin יכולים לערוך
    const isOwner = review.reviewerId.toString() === userId.toString();
    const isAdmin = userRole === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'אתה לא יכול לערוך ביקורת זו' });
    }

    // עדכן שדות (כל השדות יכולים להיות עדכונים)
    if (rating) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'דירוג חייב להיות בין 1 ל-5' });
      }
      review.rating = parseInt(rating);
    }

    if (title) {
      if (title.length < 5 || title.length > 100) {
        return res.status(400).json({ error: 'כותרת חייבת להיות בין 5 ל-100 תווים' });
      }
      review.title = title;
    }

    if (comment) {
      if (comment.length < 10 || comment.length > 1000) {
        return res.status(400).json({ error: 'ביקורת חייבת להיות בין 10 ל-1000 תווים' });
      }
      review.comment = comment;
    }

    if (eventType) {
      review.eventType = eventType;
    }

    review.updatedAt = Date.now();
    await review.save();
    await review.populate('reviewerId', 'firstname lastname profileImage');

    return res.status(200).json({
      message: 'ביקורת עודכנה בהצלחה',
      review
    });
  } catch (error) {
    console.error('Error updating review:', error);
    return res.status(500).json({ error: 'שגיאה בשרת', details: error.message });
  }
};

// מחיקת ביקורת (רק ה-reviewer או מוזיקאי)
exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user?.userId || req.user?.id || req.userId;
    const userRole = req.user?.role;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ error: 'ביקורת לא נמצאה' });
    }

    // בדוק הרשאות: כותב הביקורת, המוזיקאי, או Admin יכולים למחוק
    const isOwner = review.reviewerId.toString() === userId.toString();
    const isMusician = review.musicianId.toString() === userId.toString();
    const isAdmin = userRole === 'admin';

    if (!isOwner && !isMusician && !isAdmin) {
      return res.status(403).json({ error: 'אתה לא יכול למחוק ביקורת זו' });
    }

    review.isActive = false;
    await review.save();

    return res.status(200).json({
      message: 'ביקורת הוסרה בהצלחה'
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    return res.status(500).json({ error: 'שגיאה בשרת' });
  }
};

// פונקציה עזר לחישוב התפלגות דירוגים
async function getRatingDistribution(musicianId) {
  const distribution = await Review.aggregate([
    { $match: { musicianId: new mongoose.Types.ObjectId(musicianId), isActive: true } },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // יצור אובייקט עם כל הדירוגים (אפילו אם אין)
  const result = {};
  for (let i = 1; i <= 5; i++) {
    result[i] = 0;
  }

  distribution.forEach(item => {
    result[item._id] = item.count;
  });

  return result;
}
