const User = require('../Models/UserModel');
const bcrypt = require('bcrypt'); 
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// configure cloudinary using env vars (values kept in Server/.env locally)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || ''
});



exports.register = async function (req, res) {
    try {
        const { firstname, lastname, email, password, birthday, phone} = req.body;
         
        
        // בדיקת תקינות הנתונים
        if (!firstname || !lastname || !email || !password || !birthday) {
            // החזרת הודעה ידידותית למשתמש בעברית
            return res.status(400).json({ 
                "message": "אנא מלא/י את כל השדות המסומנים בכוכבית (שם פרטי, שם משפחה, אימייל, סיסמה ותאריך לידה)"
            });
        }

        
        
        
        // בדיקת חוזק הסיסמה (לפחות 6 תווים)
        if (password.length < 6) {
            return res.status(400).json({ 
                "message": "הסיסמה חייבת להכיל לפחות 6 תווים" 
            });
        }




        
        // הצפנת הסיסמה
        const hashedPassword = await bcrypt.hash(password, 10);

        // יצירת משתמש חדש עם הסיסמה המוצפנת
        const newUser = new User({
            firstname,
            lastname,
            email,
            password: hashedPassword,
            birthday: new Date(birthday),
            phone: phone || null
        });
        
        const savedUser = await newUser.save();



        
        // מחזירים את המשתמש ללא הסיסמה
        const userResponse = {
            _id: savedUser._id,
            firstname: savedUser.firstname,
            lastname: savedUser.lastname,
            email: savedUser.email,
            birthday: savedUser.birthday,
            phone: savedUser.phone,
            isMusician: savedUser.isMusician,
            musicianProfile: savedUser.musicianProfile,
            createdAt: savedUser.createdAt,
            updatedAt: savedUser.updatedAt
        };
        
        res.status(201).json(userResponse);
        
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ "message": "האימייל כבר קיים במערכת" });
        } else {
            res.status(500).json({ "message": "שגיאה ברישום המשתמש", "error": error.message });
        }
    }
};
















exports.login = async function (req, res) {
    try {
        const { email, password } = req.body;
        
        // בדיקת תקינות הנתונים
        if (!email || !password) {
            return res.status(400).json({ 
                "message": "אימייל וסיסמה נדרשים" 
            });
        }



        
        
        // חיפוש המשתמש לפי אימייל
        const user = await User.findOne({ email: email }).select('+password');
        if (!user) {
            return res.status(401).json({ 
                "message": "אימייל או סיסמה שגויים" 
            });
        }
        
        // השוואת הסיסמה עם הסיסמה המוצפנת
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ 
                "message": "אימייל או סיסמה שגויים" 
            });
        }
        
    


         // יצירת JWT token
        const jwtSecret = process.env.JWT_SECRET;
        const token = jwt.sign(
            { 
                id: user._id,
                role: user.role,
                email: user.email 
            },
            jwtSecret,
            { 
                expiresIn: '30d' // התוקף של הטוקן - 24 שעות
            }


            
        );        // אם הכל תקין, מחזירים את פרטי המשתמש (ללא סיסמה) ואת הטוקן
        const userResponse = {
            _id: user._id,
            firstname: user.firstname,
            lastname: user.lastname,
            email: user.email,
            birthday: user.birthday,
            phone: user.phone || null,
            isMusician: user.isMusician,
            musicianProfile: user.musicianProfile,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };
        
        res.status(200).json({
            "message": "התחברות הצליחה",
            "user": userResponse,
            "token": token
        });
        




    } catch (error) {
        res.status(500).json({ "message": "שגיאה בהתחברות", "error": error.message });
    }
};














// עדכון או יצירת פרופיל מוזיקאי
exports.updateMusicianProfile = async function (req, res) {
    try {
        const userId = req.userId; // מגיע מה-middleware של אימות
        const {
            instrument,
            musictype,
            experienceYears,
            profilePicture,
            isSinger,
            eventTypes,
            bio,
            location,
            phone,
            whatsappLink,
            galleryPictures,
            galleryVideos,
            youtubeLinks
        } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ "message": "משתמש לא נמצא" });
        }

        // עדכון טלפון ברמת המשתמש (אם סופק)
        if (phone !== undefined) {
            user.phone = phone;
        }

        // עדכון או יצירת פרופיל מוזיקאי
        if (user.musicianProfile.length === 0) {
            // יצירת פרופיל חדש
            user.musicianProfile.push({
                instrument,
                musictype,
                experienceYears,
                isSinger: !!isSinger,
                profilePicture,
                eventTypes: eventTypes || [],
                bio,
                location: location || [],
                whatsappLink: whatsappLink || '',
                galleryPictures: galleryPictures || [],
                galleryVideos: galleryVideos || [],
                youtubeLinks: youtubeLinks || [],
                isActive: false
            });
        } else {
            // עדכון פרופיל קיים
            const profile = user.musicianProfile[0];
            if (instrument !== undefined) profile.instrument = instrument;
            if (musictype !== undefined) profile.musictype = musictype;
            if (experienceYears !== undefined) profile.experienceYears = experienceYears;
            if (isSinger !== undefined) profile.isSinger = !!isSinger;
            if (profilePicture !== undefined) profile.profilePicture = profilePicture;
            if (eventTypes !== undefined) profile.eventTypes = eventTypes;
            if (bio !== undefined) profile.bio = bio;
            if (location !== undefined) profile.location = location;
            if (whatsappLink !== undefined) profile.whatsappLink = whatsappLink;
            if (galleryPictures !== undefined) profile.galleryPictures = galleryPictures;
            if (galleryVideos !== undefined) profile.galleryVideos = galleryVideos;
            if (youtubeLinks !== undefined) profile.youtubeLinks = youtubeLinks;
        }

        // סימון שהמשתמש הוא מוזיקאי
        user.isMusician = true;

        await user.save();

        res.status(200).json({
            "message": "פרופיל מוזיקאי עודכן בהצלחה",
            "musicianProfile": user.musicianProfile[0]
        });

    } catch (error) {
        res.status(500).json({ 
            "message": "שגיאה בעדכון פרופיל מוזיקאי", 
            "error": error.message 
        });
    }
};





exports.getMusicianProfile = async function (req, res) {
    try {
        const userId = req.params.userId || req.userId;


        // מציאת המשתמש
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ "message": "משתמש לא נמצא" });
        }



        // בדיקה שהמשתמש הוא מוזיקאי ויש לו פרופיל
        if (!user.isMusician || user.musicianProfile.length === 0) {
            return res.status(404).json({ 
                "message": "משתמש זה אינו מוזיקאי או אין לו פרופיל" 
            });
        }


        // החזר אובייקט פרופיל (לא מערך) לשמירה על תאימות עם הקליינט
        res.status(200).json({
            "user": {
                _id: user._id,
                firstname: user.firstname,
                lastname: user.lastname,
                email: user.email
            },
            "phone": user.phone,
            "musicianProfile": user.musicianProfile[0]
        });

    } catch (error) {
        console.error('[getMusicianProfile] Error:', error);
        res.status(500).json({ 
            "message": "שגיאה בטעינת פרופיל", 
            "error": error.message 
        });
    }
};



// חיפוש מוזיקאים לפי קריטריונים
exports.searchMusicians = async function (req, res) {
    try {
        const { musictype, location, instrument, eventTypes, region, q, singer } = req.query;

        // יצירת אובייקט שאילתה התחלתי - מחפשים רק משתמשים שמוגדרים כמוזיקאים
        let query = { 
            isMusician: true
        };
        // וודא שקיים לפחות פרופיל מוזיקאי אחד פעיל בתוך מערך musicianProfile
        query.musicianProfile = { $elemMatch: { isActive: true } };

        // פונקציה שמוודאת שהערכים שמגיעים מהquery יהיו תמיד מערך (גם אם מגיע מחרוזת עם פסיקים)
        const toArray = (v) => {
            if (!v) return [];
            let arr = Array.isArray(v) ? v.map(x => String(x).trim()) : String(v).split(',').map(x => x.trim());
            arr = arr.filter(Boolean);
            return arr;
        };
        // חיפוש לפי שם פרטי/משפחה או חיפוש של שני מילים יחד
        if (q && q.trim()) {
            const searchTerm = q.trim();
            const words = searchTerm.split(/\s+/);

            // אם יש מילה אחת - חיפוש פשוט
            if (words.length === 1) {
                query.$or = [
                    { firstname: new RegExp(words[0], 'i') },
                    { lastname: new RegExp(words[0], 'i') }
                ];
            } else {
                // שתי מילים ומעלה - נסה להתאים פרטי+משפחה בשני סדרים שונים
                query.$or = [
                    { $and: [
                        { firstname: new RegExp(words[0], 'i') },
                        { lastname: new RegExp(words.slice(1).join(' '), 'i') }
                    ]},
                    { $and: [
                        { firstname: new RegExp(words[words.length - 1], 'i') },
                        { lastname: new RegExp(words.slice(0, -1).join(' '), 'i') }
                    ]}
                ];
            }
        }
        // סינון לפי סוג מוזיקה
        const types = toArray(musictype);
        if (types.length && !types.includes('הכל')) {
            const typePattern = types.join('|');
            query['musicianProfile.musictype'] = new RegExp(typePattern, 'i');
        }

        // סינון לפי כלי נגינה (מחפשים בתוך מחרוזת שמכילה כמה כלים מופרדים בפסיק)
        const instruments = toArray(instrument);
        if (instruments.length && !instruments.includes('הכל')) {
            const instrumentPattern = instruments.join('|');
            query['musicianProfile.instrument'] = {
                $regex: `${instrumentPattern}|הכל בכלים`,
                $options: 'i'
            };
        }

        // סינון לפי סוגי אירועים (eventTypes הוא מערך בדאטהבייס)
        const events = toArray(eventTypes);
        if (events.length && !events.includes('הכל')) {
            query['musicianProfile.eventTypes'] = {
                $in: [...events, 'הכל']
            };
        }

        // סינון לפי האם הלקוח ביקש זמרים בלבד
        if (singer !== undefined) {
            const wantSinger = (String(singer).toLowerCase() === 'true' || String(singer) === '1');
            if (wantSinger) {
                query['musicianProfile.isSinger'] = true;
            }
        }

        // סינון לפי אזור גיאוגרפי מדויק
        if (region) {
            // חיפוש ישיר באנגלית כפי שנשמר בדאטהבייס
            query['musicianProfile.location'] = region;
        } else if (location) {
            // חיפוש טקסט חופשי באזור
            query['musicianProfile.location'] = new RegExp(String(location).trim(), 'i');
        }

        // שליפת תוצאות מהדאטהבייס, ללא שדה הסיסמה
        const musicians = await User.find(query).select('-password');

        // עיבוד תוצאות לפני החזרה ללקוח
        res.status(200).json({
            "count": musicians.length,
            "musicians": musicians.map(m => ({
                _id: m._id,
                firstname: m.firstname,
                lastname: m.lastname,
                phoneNumber: m.phone,
                profileImage: m.musicianProfile && m.musicianProfile[0] ? m.musicianProfile[0].profilePicture : undefined,
                musicianProfile: m.musicianProfile[0]
            }))
        });

    } catch (error) {
        res.status(500).json({ 
            "message": "שגיאה בחיפוש מוזיקאים", 
            "error": error.message 
        });
    }
};



// מחיקת משתמש (חשבון מלא)
exports.deleteUser = async function (req, res) {
    try {
        const userId = req.userId; // מגיע מה-middleware של אימות
        
        // מחיקת המשתמש
        const deletedUser = await User.findByIdAndDelete(userId);
        
        if (!deletedUser) {
            return res.status(404).json({ 
                "message": "משתמש לא נמצא" 
            });
        }

        res.status(200).json({
            "message": "חשבון המשתמש נמחק בהצלחה"
        });

    } catch (error) {
        res.status(500).json({ 
            "message": "שגיאה במחיקת המשתמש", 
            "error": error.message 
        });
    }
};










// Get Cloudinary signature for client-side upload
exports.getUploadSignature = async function (req, res) {
    try {
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            return res.status(500).json({ message: 'Cloudinary not configured' });
        }

        const timestamp = Math.round(Date.now() / 1000);
        const folder = 'final-project';
        
        // Create params for signature - ONLY these params, nothing more
        const paramsToSign = {
            timestamp: timestamp,
            folder: folder
        };

        // Generate signature using Cloudinary's method
        const signature = cloudinary.utils.api_sign_request(
            paramsToSign,
            process.env.CLOUDINARY_API_SECRET
        );


        res.status(200).json({
            timestamp,
            signature,
            api_key: process.env.CLOUDINARY_API_KEY,
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            folder
        });
    } catch (error) {
        console.error('Signature generation error:', error);
        res.status(500).json({ message: 'Failed to generate signature', error: error.message });
    }
};




// Upload a single file (from multer memoryStorage) to Cloudinary OR save already-uploaded URL
exports.uploadToCloudinary = async function (req, res) {
    try {
        // Check if this is a save-URL request (client already uploaded to Cloudinary)
        if (req.body && req.body.url && req.body.save) {
            const { url, public_id, save: saveHint } = req.body;
            
            let persistedProfile = null;
            if (saveHint && req.userId) {
                try {
                    const user = await User.findById(req.userId);
                    if (user) {
                        if (!Array.isArray(user.musicianProfile)) user.musicianProfile = [];
                        if (user.musicianProfile.length === 0) {
                            user.musicianProfile.push({ profilePicture: '', galleryPictures: [], galleryVideos: [] });
                        }
                        const profile = user.musicianProfile[0];
                        if (saveHint === 'profile') {
                            profile.profilePicture = url;
                        } else if (saveHint === 'gallery') {
                            if (!Array.isArray(profile.galleryPictures)) profile.galleryPictures = [];
                            profile.galleryPictures.push(url);
                        }
                        await user.save();
                        persistedProfile = user.musicianProfile[0];
                        console.log('✅ Saved URL to profile:', { saveHint, url: url.substring(0, 50) });
                    }
                } catch (errSave) {
                    console.error('Failed to persist URL:', errSave);
                }
            }
            
            const responsePayload = { url, public_id };
            if (persistedProfile) responsePayload.musicianProfile = persistedProfile;
            return res.status(200).json(responsePayload);
        }
        
        // Original upload flow (if file buffer present)
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        // Check Cloudinary credentials early and return a helpful error
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            console.error('Cloudinary env vars missing');
            return res.status(500).json({ message: 'Cloudinary not configured on server. Please set CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET in .env' });
        }
        
        
        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { 
                    folder: 'final-project', 
                    resource_type: 'auto'
                },
                (error, result) => {
                    if (error) {
                        console.error('❌ Cloudinary upload error:', error);
                        return reject(error);
                    }
                    console.log('✅ Upload successful:', result.secure_url);
                    resolve(result);
                }
            );
            streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
        });

        // If the client sent a "save" hint (FormData field), persist the URL into the user's musicianProfile
        const saveHint = (req.body && req.body.save) || (req.query && req.query.save) || null;
        let persistedProfile = null;
        if (saveHint && req.userId) {
            try {
                const user = await User.findById(req.userId);
                if (user) {
                    if (!Array.isArray(user.musicianProfile)) user.musicianProfile = [];
                    if (user.musicianProfile.length === 0) {
                        user.musicianProfile.push({ profilePicture: '', galleryPictures: [], galleryVideos: [] });
                    }
                    const profile = user.musicianProfile[0];
                    if (saveHint === 'profile') {
                        profile.profilePicture = result.secure_url;
                    } else if (saveHint === 'gallery') {
                        if (!Array.isArray(profile.galleryPictures)) profile.galleryPictures = [];
                        profile.galleryPictures.push(result.secure_url);
                    }
                    await user.save();
                    persistedProfile = user.musicianProfile[0];
                }
            } catch (errSave) {
                console.error('Failed to persist uploaded URL to user profile:', errSave);
            }
        }

        const responsePayload = { url: result.secure_url, public_id: result.public_id };
        if (persistedProfile) responsePayload.musicianProfile = persistedProfile;

        res.status(200).json(responsePayload);
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        res.status(500).json({ message: 'שגיאה בהעלאת קובץ', error: error.message });
    }
};






// Helpers for PayPal
const PAYPAL_BASE = (process.env.PAYPAL_ENV === 'live') ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

async function getPayPalAccessToken() {
    const client = process.env.PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_SECRET;
    if (!client || !secret) throw new Error('PayPal credentials not configured');
    const auth = Buffer.from(`${client}:${secret}`).toString('base64');

    const resp = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error_description || 'Failed to obtain PayPal access token');
    return data.access_token;
}

// יצירת הזמנה בפייפאל (מחזיר approval_url)
exports.createPayPalOrder = async function (req, res) {
    try {
        const userId = req.userId;
        const { amount, currency } = req.body;
        const value = (amount && String(amount)) || process.env.PROFILE_ACTIVATION_AMOUNT || '9.99';
        const curr = (currency && String(currency)) || process.env.PROFILE_ACTIVATION_CURRENCY || 'USD';
        const token = await getPayPalAccessToken();

        const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';

        const orderResp = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [{
                    amount: { currency_code: curr, value },
                    custom_id: userId,
                    description: 'הפעלת פרופיל מוזיקאי'
                }],
                application_context: {
                    return_url: `${frontend}/payment-success`,
                    cancel_url: `${frontend}/payment-cancel`
                }
            })
        });

        const orderData = await orderResp.json();
        if (!orderResp.ok) {
            console.error('PayPal create order failed:', orderData);
            return res.status(500).json({ message: 'Failed to create PayPal order', error: orderData });
        }

        const approveLink = (orderData.links || []).find(l => l.rel === 'approve');

        // Persist a pending payment entry (if user exists)
        try {
            const user = await User.findById(userId);
            if (user) {
                if (!Array.isArray(user.musicianProfile)) user.musicianProfile = [];
                if (user.musicianProfile.length === 0) user.musicianProfile.push({ profilePicture: '', galleryPictures: [], galleryVideos: [], isActive: false });
                await user.save();
            }
        } catch (err) {
            console.error('Failed to persist pending payment:', err);
        }

        res.status(200).json({ orderId: orderData.id, approvalUrl: approveLink ? approveLink.href : null });
    } catch (error) {
        console.error('createPayPalOrder error:', error);
        res.status(500).json({ message: 'שגיאה ביצירת תשלום', error: error.message });
    }
};

// Capture order (synchronous flow after redirect)
exports.capturePayPalOrder = async function (req, res) {
    try {
        const userId = req.userId;
        const { orderId } = req.body;
        if (!orderId) return res.status(400).json({ message: 'orderId required' });

        const token = await getPayPalAccessToken();
        const capResp = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        });
        const capData = await capResp.json();
        if (!capResp.ok) {
            console.error('PayPal capture failed:', capData);
            return res.status(500).json({ message: 'Failed to capture order', error: capData });
        }

        // On success, mark user profile as active
        try {
            const user = await User.findById(userId);
            if (user) {
                if (!Array.isArray(user.musicianProfile)) user.musicianProfile = [];
                if (user.musicianProfile.length === 0) user.musicianProfile.push({ profilePicture: '', galleryPictures: [], galleryVideos: [], isActive: false });
                const profile = user.musicianProfile[0];
                profile.isActive = true;
                await user.save();
            }
        } catch (err) {
            console.error('Failed to update user after capture:', err);
        }

        res.status(200).json({ message: 'Payment captured and profile activated', capture: capData });
    } catch (error) {
        console.error('capturePayPalOrder error:', error);
        res.status(500).json({ message: 'שגיאה בתקיפת הזמנה', error: error.message });
    }
};

// Webhook endpoint to receive PayPal async notifications
exports.handlePayPalWebhook = async function (req, res) {
    try {
        const body = req.body;
        // Minimal handling: look for order ID and try to activate corresponding user
        const eventType = body.event_type || body.eventType || '';
        console.log('PayPal webhook received:', eventType);

        // Try to find order id in resource
        const resource = body.resource || {};
        const orderId = resource.id || (resource.supplementary_data && resource.supplementary_data.related_ids && resource.supplementary_data.related_ids.order_id) || (resource.order_id) || null;

        // If we don't have orderId but have purchase_units in resource, try to extract custom_id
        let customUserId = null;
        try {
            if (resource.purchase_units && resource.purchase_units[0] && resource.purchase_units[0].custom_id) {
                customUserId = resource.purchase_units[0].custom_id;
            }
            if (!customUserId && resource.custom_id) customUserId = resource.custom_id;
        } catch (e) {}

        // If we have orderId and/or customUserId, try to mark profile active
        if (customUserId || orderId) {
            // if we only have orderId, try to fetch order details to get custom_id
            let userId = customUserId;
            if (!userId && orderId) {
                try {
                    const token = await getPayPalAccessToken();
                    const orderResp = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
                    const orderData = await orderResp.json();
                    if (orderData.purchase_units && orderData.purchase_units[0] && orderData.purchase_units[0].custom_id) userId = orderData.purchase_units[0].custom_id;
                } catch (e) {
                    console.error('Failed to fetch order to get custom_id:', e);
                }
            }

            if (userId) {
                try {
                    const user = await User.findById(userId);
                    if (user) {
                        if (!Array.isArray(user.musicianProfile)) user.musicianProfile = [];
                        if (user.musicianProfile.length === 0) user.musicianProfile.push({ profilePicture: '', galleryPictures: [], galleryVideos: [], isActive: false });
                        const profile = user.musicianProfile[0];
                        // mark active if event indicates capture/completion
                        if (eventType.includes('CAPTURE') || eventType.includes('COMPLETED') || eventType.includes('APPROVED')) {
                            profile.isActive = true;
                        }
                        await user.save();
                        console.log('Activated profile via webhook for user', userId);
                    }
                } catch (err) {
                    console.error('Failed to activate profile via webhook:', err);
                }
            }
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('handlePayPalWebhook error:', error);
        res.status(500).send('Webhook handling error');
    }
};










