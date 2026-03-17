const mongoose = require('mongoose');
const User = require('../models/User');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://shalinivanjinathan_db_user:Shalini%40123@cluster0.iwimuje.mongodb.net/campus-event-hub?retryWrites=true&w=majority'; // Default URI

async function wipeUsers() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected.');

        const beforeCount = await User.countDocuments();
        console.log(`📊 Users before deletion: ${beforeCount}`);

        console.log('🗑️ Deleting all users...');
        const result = await User.deleteMany({});
        console.log(`✅ Deleted successfully. Count of deleted users: ${result.deletedCount}`);

        const afterCount = await User.countDocuments();
        console.log(`📊 Users remaining: ${afterCount}`);

    } catch (error) {
        console.error('❌ Error during wipe:', error);
    } finally {
        console.log('🔌 Disconnecting...');
        await mongoose.disconnect();
        console.log('✅ Disconnected.');
        process.exit(0);
    }
}

wipeUsers();
