const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
    id: {
        type: String,
        unique: true
    },
    event_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled'],
        default: 'pending'
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Pre-save hook to generate a unique string ID if not provided
registrationSchema.pre('save', function (next) {
    if (!this.id) {
        this.id = 'REG-' + new mongoose.Types.ObjectId().toString().slice(-6).toUpperCase() + '-' + Date.now().toString().slice(-4);
    }
    next();
});

module.exports = mongoose.model('Registration', registrationSchema);
