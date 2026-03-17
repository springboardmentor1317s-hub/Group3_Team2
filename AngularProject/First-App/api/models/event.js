const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({

    college_id: {
         type:mongoose.Schema.Types.ObjectId,
         ref:'User'
        },

    title: {
        type: String,
        required: true
    },

    description: {
        type: String,
        required: true
    },

    startDate: {
        type: Date, 
        required: true 
    },

    endDate: {
        type: Date,
        required: true
    },

    category: {
        type: String 
    },


    location: {
        type: String,
        required: true
    },



    maxParticipants: { type: Number },

    imageUrl: {
        type: String
    },

    /*created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }*/



}, { timestamps:true });

module.exports = mongoose.model('Event', eventSchema);