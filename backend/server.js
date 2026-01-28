require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const reviewRoutes = require('./routes/reviews');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'VeryHandy Solution API is running',
        timestamp: new Date().toISOString(),
        mongodb: process.env.MONGODB_URI ? 'Configured' : 'Not configured',
        email: process.env.EMAIL_USER || 'Not configured'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to VeryHandy Solution API',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            auth: {
                register: 'POST /api/auth/register',
                verifyOtp: 'POST /api/auth/verify-otp',
                resendOtp: 'POST /api/auth/resend-otp',
                login: 'POST /api/auth/login',
                me: 'GET /api/auth/me'
            },
            bookings: {
                list: 'GET /api/bookings',
                create: 'POST /api/bookings',
                updateStatus: 'PATCH /api/bookings/:id/status',
                delete: 'DELETE /api/bookings/:id'
            },
            reviews: {
                approved: 'GET /api/reviews/approved',
                create: 'POST /api/reviews',
                approve: 'PATCH /api/reviews/:id/approve',
                delete: 'DELETE /api/reviews/:id'
            }
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

app.listen(PORT, () => {
    console.log(`\n✅ ========================================`);
    console.log(`🚀 VeryHandy Solution API`);
    console.log(`📡 Server: http://localhost:${PORT}`);
    console.log(`📧 Email Service: Resend (API)`);
    console.log(`🗄️  MongoDB: ${process.env.MONGODB_URI ? 'Configured' : 'Not configured'}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`========================================\n`);
    console.log(`📖 API Documentation: http://localhost:${PORT}/`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/api/health\n`);
});
