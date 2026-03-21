const mongoose = require("mongoose");
//const { timestamp } = require("rxjs");

const adminLogSchema = new mongoose.Schema({

    action: {
        type: String,
        required: true
    },

    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    timestamp: {
        type: Date,
        default: Date.now
    }

   /* meta: {
        type: Object
    }*/
});

module.exports = mongoose.model("AdminLog", adminLogSchema);
