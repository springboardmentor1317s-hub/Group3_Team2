const User = require('../models/User');
const Event = require('../models/Event');
const Registration = require('../models/Registration');

// ─── GET ALL USERS (STUDENTS) ────────────────────────────────────────────────
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'student' }).select('-password').lean();
    
    // Get registration counts
    for (let user of users) {
       user.registeredEventsCount = await Registration.countDocuments({ user_id: user._id });
    }
    
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
};

// ─── GET ALL ADMINS ──────────────────────────────────────────────────────────
exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: 'college-admin' }).select('-password').lean();
    
    // Count events managed by each admin
    for (let admin of admins) {
      admin.eventsManaged = await Event.countDocuments({ createdBy: admin._id });
    }

    res.status(200).json(admins);
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ message: 'Server error fetching admins' });
  }
};

// ─── GET ALL COLLEGES ────────────────────────────────────────────────────────
exports.getColleges = async (req, res) => {
  try {
    // We aggregate unique colleges from the User collection
    // and count total events and students for each.
    
    const collegesPipeline = await User.aggregate([
      { 
        $group: { 
          _id: "$college",
          adminName: { 
            $first: {
              $cond: [ { $eq: ["$role", "college-admin"] }, "$fullName", null ]
            }
          },
          adminEmail: {
            $first: {
              $cond: [ { $eq: ["$role", "college-admin"] }, "$email", null ]
            }
          },
          studentCount: { 
            $sum: { $cond: [ { $eq: ["$role", "student"] }, 1, 0 ] } 
          },
          createdAt: { $min: "$createdAt" }
        }
      }
    ]);

    // Format the response and get event counts
    const formattedColleges = [];
    let i = 1;
    for (const c of collegesPipeline) {
      if (!c._id) continue; // Skip empty college names

      // Calculate total events held at this college
      const adminsAtCollege = await User.find({ college: c._id, role: 'college-admin' }).select('_id');
      const adminIds = adminsAtCollege.map(a => a._id);
      const eventCount = await Event.countDocuments({ createdBy: { $in: adminIds } });

      formattedColleges.push({
        id: i++,
        name: c._id,
        adminName: c.adminName || 'Unknown Admin',
        adminEmail: c.adminEmail || 'Unknown',
        eventCount: eventCount,
        studentCount: c.studentCount,
        status: 'active', // All colleges are considered active by default for now
        createdAt: c.createdAt
      });
    }

    res.status(200).json(formattedColleges);
  } catch (error) {
    console.error('Error fetching colleges:', error);
    res.status(500).json({ message: 'Server error fetching colleges' });
  }
};
