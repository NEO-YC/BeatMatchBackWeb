const User = require('../Models/UserModel');

// Get all users
exports.getUsers = async (req, res) => {
    try {
        
        const users = await User.find().select('-password');
        
        res.json({
            message: 'משתמשים שהוחזרו בהצלחה',
            total: users.length,
            users: users.map(user => ({
                _id: user._id,
                firstname: user.firstname,
                lastname: user.lastname,
                email: user.email,
                phone: user.phone,
                isMusician: user.isMusician,
                role: user.role,
                isActive: user.musicianProfile && user.musicianProfile.length > 0 
                    ? user.musicianProfile[0].isActive 
                    : false,
                createdAt: user.createdAt
            }))
        });
    } catch (err) {
        res.status(500).json({
            message: 'שגיאה בשליפת המשתמשים',
            error: err.message
        });
    }
};

// Toggle user role between user and admin
exports.toggleRole = async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent admin from changing their own role
        if (req.user.id.toString() === id) {
            return res.status(403).json({
                message: 'לא ניתן לשנות את התפקיד שלך בעצמך'
            });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                message: 'משתמש לא נמצא'
            });
        }

        // Toggle between user and admin
        user.role = user.role === 'admin' ? 'user' : 'admin';
        await user.save();

        res.json({
            message: `תפקיד משתמש שונה ל-${user.role}`,
            user: {
                _id: user._id,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        res.status(500).json({
            message: 'שגיאה בשינוי תפקיד',
            error: err.message
        });
    }
};

// Toggle subscription status (isActive in musicianProfile)
exports.toggleSubscription = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                message: 'משתמש לא נמצא'
            });
        }

        // Initialize musicianProfile if empty
        if (!user.musicianProfile || user.musicianProfile.length === 0) {
            user.musicianProfile = [{
                isActive: true,
                instrument: '',
                musictype: '',
                experienceYears: ''
            }];
        } else {
            // Toggle isActive
            user.musicianProfile[0].isActive = !user.musicianProfile[0].isActive;
        }

        await user.save();

        res.json({
            message: `סטטוס מנוי שונה ל-${user.musicianProfile[0].isActive ? 'פעיל' : 'לא פעיל'}`,
            user: {
                _id: user._id,
                email: user.email,
                isActive: user.musicianProfile[0].isActive
            }
        });
    } catch (err) {
        res.status(500).json({
            message: 'שגיאה בשינוי סטטוס המנוי',
            error: err.message
        });
    }
};

// Delete user
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent admin from deleting themselves
        if (req.user.id.toString() === id) {
            return res.status(403).json({
                message: 'לא ניתן למחוק את עצמך'
            });
        }

        const user = await User.findByIdAndDelete(id);
        if (!user) {
            return res.status(404).json({
                message: 'משתמש לא נמצא'
            });
        }

        res.json({
            message: 'משתמש נמחק בהצלחה',
            deletedUser: {
                _id: user._id,
                email: user.email
            }
        });
    } catch (err) {
        res.status(500).json({
            message: 'שגיאה במחיקת משתמש',
            error: err.message
        });
    }
};
