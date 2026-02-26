const mongoose = require("mongoose");

const teamMemberSchema = new mongoose.Schema({
    name: String,
    email: String,
    collegeId: String
});

const eventSchema = new mongoose.Schema({
    category: {
        type: String,
        enum: ["sports", "hackathon", "culturals", "technical", "workshop"],
        required: true
    },
    collegeId: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    startDate: Date,
    endDate: Date,

    prizePool: Number,

    images: [
        {
            type: String // Base64 string
        }
    ],

    organizerContact: {
        phone: String,
        email: String
    },

    isPaid: {
        type: Boolean,
        default: false
    },

    price: {
        type: Number,
        default: 0
    },

    teamSize: Number,
    teamMembers: [teamMemberSchema],

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    participants: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ]

}, { timestamps: true });

module.exports = mongoose.model("Event", eventSchema);