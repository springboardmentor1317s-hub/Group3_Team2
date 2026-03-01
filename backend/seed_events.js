const mongoose = require('mongoose');
const Event = require('./models/Event');
const User = require('./models/User');
require('dotenv').config();

const seedEvents = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Need an admin user to be the creator
        let adminUser = await User.findOne({ role: 'college_admin' });
        if (!adminUser) {
            // Fallback to any user if no admin found just for testing
            adminUser = await User.findOne();
            if (!adminUser) {
                console.log("No users found. Please create a user first.");
                process.exit(1);
            }
        }

        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);

        const sampleEvents = [
            {
                title: "Tech Innovation Summit 2026",
                description: "Annual gathering of tech enthusiasts and industry leaders.",
                type: "technical",
                category: "inter-college",
                venue: "Main Auditorium",
                startDate: tomorrow,
                endDate: tomorrow,
                registrationDeadline: today,
                maxParticipants: 500,
                currentParticipants: 150,
                organizer: "Computer Science Dept",
                contactEmail: "cs@campuseventhub.com",
                status: "upcoming",
                createdBy: adminUser._id,
                imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800"
            },
            {
                title: "Campus Cultural Fest",
                description: "A celebration of art, music, and dance.",
                type: "cultural",
                category: "college",
                venue: "Open Air Theatre",
                startDate: nextWeek,
                endDate: nextWeek,
                registrationDeadline: tomorrow,
                maxParticipants: 1000,
                currentParticipants: 300,
                organizer: "Cultural Committee",
                contactEmail: "culture@campuseventhub.com",
                status: "upcoming",
                createdBy: adminUser._id,
                imageUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=800"
            }
        ];

        // Clear existing events for a clean slate
        await Event.deleteMany({});
        console.log('Cleared existing events');

        await Event.insertMany(sampleEvents);
        console.log('Sample events seeded successfully with images!');

        process.exit(0);
    } catch (error) {
        console.error('Error seeding events:', error);
        process.exit(1);
    }
};

seedEvents();
