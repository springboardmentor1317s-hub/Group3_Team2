const mongoose = require("mongoose");
//const { timestamp } = require("rxjs");

const feedbackSchema = new mongoose.Schema({

    event_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event"
    },

    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    rating: {
        type: Number,
        min: 1,
        max: 5
    },

    comments: String,

    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Feedback", feedbackSchema);