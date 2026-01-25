const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { sendBookingUpdateEmail } = require('../config/email');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Get all bookings for current user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const bookings = await Booking.find({ user: req.user.userId })
            .populate('user', 'name email')
            .sort({ createdAt: -1 });

        res.json({ bookings });
    } catch (error) {
        console.error('Get bookings error:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// Get all bookings (admin only)
router.get('/all', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const bookings = await Booking.find()
            .populate('user', 'name email')
            .sort({ createdAt: -1 });

        res.json({ bookings });
    } catch (error) {
        console.error('Get all bookings error:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// Create new booking
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { serviceType, notes, location, preferredDate, preferredTime, photoUrls } = req.body;

        const booking = await Booking.create({
            user: req.user.userId,
            serviceType,
            notes,
            location,
            preferredDate,
            preferredTime,
            photoUrls: photoUrls || [],
            status: 'pending'
        });

        const populatedBooking = await Booking.findById(booking._id)
            .populate('user', 'name email');

        res.status(201).json({
            message: 'Booking created successfully',
            booking: populatedBooking
        });
    } catch (error) {
        console.error('Create booking error:', error);
        res.status(500).json({ error: 'Failed to create booking', message: error.message });
    }
});

// Update booking status (admin only)
router.patch('/:id/status', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { status } = req.body;
        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        ).populate('user', 'name email');

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Send notification email to customer
        try {
            await sendBookingUpdateEmail(
                booking.user.email,
                booking.user.name,
                booking._id,
                status
            );
        } catch (emailError) {
            console.error('Failed to send status update email:', emailError);
            // Don't fail the response if email fails
        }

        res.json({
            message: 'Booking status updated and customer notified',
            booking
        });
    } catch (error) {
        console.error('Update booking error:', error);
        res.status(500).json({ error: 'Failed to update booking' });
    }
});

// Delete booking
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Only allow user to delete their own booking or admin
        if (booking.user.toString() !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await Booking.findByIdAndDelete(req.params.id);

        res.json({ message: 'Booking deleted successfully' });
    } catch (error) {
        console.error('Delete booking error:', error);
        res.status(500).json({ error: 'Failed to delete booking' });
    }
});

module.exports = router;
