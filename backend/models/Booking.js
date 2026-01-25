const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    serviceType: {
        type: String,
        required: true
    },
    notes: {
        type: String
    },
    location: {
        type: String,
        required: true
    },
    preferredDate: {
        type: Date,
        required: true
    },
    preferredTime: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'],
        default: 'pending'
    },
    photoUrls: [{
        type: String
    }]
}, {
    timestamps: true
});

// Index for faster queries
bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ preferredDate: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
