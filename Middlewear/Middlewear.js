const jwt = require('jsonwebtoken');
const {promisify} = require('util');
const User = require('../Models/UserModel');

const verifyAsync = promisify(jwt.verify);




// Middleware לאימות JWT token
exports.authenticateToken = async (req, res, next) => {

    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ 
                message: 'גישה נדחתה - לא נמצא טוקן אימות',
                needsLogin: true
            });
        }



        const jwtSecret = process.env.JWT_SECRET;



        // שימוש ב-await במקום callback
        const decoded = await verifyAsync(token, jwtSecret);




        // בדיקה שהמשתמש עדיין קיים במסד הנתונים
        const user = await User.findById(decoded.id || decoded.userId);
        if (!user) {
            return res.status(401).json({ 
                message: 'המשתמש לא נמצא במערכת' 
            });
        }
        

        // שמירת פרטי המשתמש ב-request object
        req.user = {
            id: user._id,
            userId: user._id,  // backward compatibility
            role: decoded.role || user.role,  // prefer JWT role, fallback to DB role
            email: user.email,
            firstname: user.firstname,
            lastname: user.lastname
        };
        
        // שמירת userId בנפרד לנוחות (משמש ב-Controllers)
        req.userId = user._id;

        next();

    } catch (err) {
        return res.status(403).json({ 
            message: 'טוקן לא תקין או פג תוקף' 
        });
    }
};

// Middleware to check if user is admin
exports.requireAdmin = (req, res, next) => {
    
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            message: 'גישה מוגבלת - נדרשת רמת admin'
        });
    }
    
    next();
};