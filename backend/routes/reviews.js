const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Review = require('../models/Review');
const User = require('../models/User');

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

// Get all approved reviews (public)
router.get('/approved', async (req, res) => {
    try {
        const reviews = await Review.find({ isApproved: true })
            .populate('user', 'name')
            .sort({ createdAt: -1 });

        res.json({ reviews });
    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

// Get all reviews (admin only)
router.get('/all', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const reviews = await Review.find()
            .populate('user', 'name email')
            .populate('booking')
            .sort({ createdAt: -1 });

        res.json({ reviews });
    } catch (error) {
        console.error('Get all reviews error:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

// Create new review
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { bookingId, rating, comment, photoUrls } = req.body;

        const review = await Review.create({
            user: req.user.userId,
            booking: bookingId || null,
            rating,
            comment,
            photoUrls: photoUrls || [],
            isApproved: false
        });

        const populatedReview = await Review.findById(review._id)
            .populate('user', 'name email');

        res.status(201).json({
            message: 'Review submitted successfully. It will be published after approval.',
            review: populatedReview
        });
    } catch (error) {
        console.error('Create review error:', error);
        res.status(500).json({ error: 'Failed to create review', message: error.message });
    }
});

// Approve/reject review (admin only)
router.patch('/:id/approve', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { isApproved } = req.body;
        const review = await Review.findByIdAndUpdate(
            req.params.id,
            { isApproved },
            { new: true }
        ).populate('user', 'name email');

        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }

        res.json({
            message: `Review ${isApproved ? 'approved' : 'rejected'}`,
            review
        });
    } catch (error) {
        console.error('Approve review error:', error);
        res.status(500).json({ error: 'Failed to update review' });
    }
});

// Delete review
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }

        // Only allow user to delete their own review or admin
        if (review.user.toString() !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await Review.findByIdAndDelete(req.params.id);

        res.json({ message: 'Review deleted successfully' });
    } catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({ error: 'Failed to delete review' });
    }
});

module.exports = router;
