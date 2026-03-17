const mongoose = require("mongoose");
//const { timestamp } = require("rxjs");

const registrationSchema = new mongoose.Schema({

    event_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event"
    },

    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    status: {
        type:String,
        enum: ["pending", "approved", "rejected"],
        default: "pending"
    },

    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Registration", registrationSchema);