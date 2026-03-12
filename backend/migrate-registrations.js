const mongoose = require('mongoose');
const Event = require('./models/Event');
const Registration = require('./models/Registration');
require('dotenv').config();

const migrateRegistrations = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB for Migration');

    const events = await Event.find({ registeredUsers: { $ne: [] } });
    console.log(`Found ${events.length} events with registrations`);

    let createdCount = 0;

    for (const event of events) {
      for (const userId of event.registeredUsers) {
        // Check if registration already exists
        const existing = await Registration.findOne({ event_id: event._id, user_id: userId });
        if (!existing) {
          await Registration.create({
            event_id: event._id,
            user_id: userId,
            status: 'pending'
          });
          createdCount++;
        }
      }
    }

    console.log(`Migration complete. Created ${createdCount} missing Registration documents.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration Error:', error);
    process.exit(1);
  }
};

migrateRegistrations();
