
const express = require('express');
const router = express.Router();



//distructure the controller functions: 
const { 
    register, 
    login,
    updateMusicianProfile,
    uploadToCloudinary,
    getUploadSignature,
    getMusicianProfile,
    searchMusicians,
    createPayPalOrder,
    capturePayPalOrder,
    handlePayPalWebhook,
    deleteUser
} = require('../Controllers/UserController');

// Admin controller functions
const { 
    getUsers, 
    toggleRole, 
    toggleSubscription, 
    deleteUser: deleteUserAdmin 
} = require('../Controllers/AdminController');

// distructure the authentication middleware
const { authenticateToken, requireAdmin } = require('../Middlewear/Middlewear');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });



// נתיבים פומביים (ללא אימות)
router.post('/register', register);
router.post('/login', login);
// חיפוש מוזיקאים - פומבי
router.get('/musicians/search', searchMusicians);
// צפייה בפרופיל מוזיקאי - פומבי
router.get('/musicians/:userId', getMusicianProfile);




// נתיבים מאובטחים (דורשים אימות JWT)
router.put('/musician/profile', authenticateToken, updateMusicianProfile);
// Get Cloudinary upload signature
router.get('/upload-signature', authenticateToken, getUploadSignature);
// upload single file to Cloudinary 
router.post('/upload', authenticateToken, upload.single('file'), uploadToCloudinary);

// PayPal payment flow
router.post('/payments/create', authenticateToken, createPayPalOrder);
router.post('/payments/capture', authenticateToken, capturePayPalOrder);
// Webhook (public)
router.post('/payments/webhook', express.json({ type: '*/*' }), handlePayPalWebhook);

// קבלת הפרופיל שלי (המשתמש המחובר)
router.get('/me/musician-profile', authenticateToken, getMusicianProfile);
// מחיקת חשבון משתמש )
router.delete('/account', authenticateToken, deleteUser);

// ============ ADMIN ROUTES ============
// Protected with auth + requireAdmin middleware
router.get('/admin/users', authenticateToken, requireAdmin, getUsers);
router.put('/admin/users/:id/role', authenticateToken, requireAdmin, toggleRole);
router.put('/admin/users/:id/togglesub', authenticateToken, requireAdmin, toggleSubscription);
router.delete('/admin/users/:id', authenticateToken, requireAdmin, deleteUserAdmin);

module.exports = router;
