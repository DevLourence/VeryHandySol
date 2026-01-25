require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendOTPEmail } = require('./config/email');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory storage (temporary - for testing without MongoDB)
const users = [
    // Pre-created admin account
    {
        id: 'admin-1769143511895',
        name: 'VH Admin',
        email: 'veryhandyhomeservices1@gmail.com',
        password: '$2a$10$aMSpcMf84wPp2pkNY.DcrOKFGmM54glv3ZSYSBkG0ZaJkgxInfzIe',
        address: 'Admin Office',
        age: 30,
        emailVerified: true,
        role: 'admin',
        createdAt: new Date('2026-01-23T04:45:11.895Z')
    }
];
const otps = [];
const bookings = [];
const reviews = [];

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Generate 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, address, age } = req.body;

        // Check if user exists
        if (users.find(u => u.email === email)) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = {
            id: Date.now().toString(),
            name,
            email,
            password: hashedPassword,
            address,
            age,
            emailVerified: false,
            role: 'client',
            createdAt: new Date()
        };
        users.push(user);

        // Generate OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60000);

        otps.push({ email, otp, expiresAt });

        // Send OTP email
        try {
            await sendOTPEmail(email, otp, name);
            console.log(`✅ OTP sent to ${email}: ${otp}`);
        } catch (emailError) {
            console.error('Email error:', emailError);
            // Continue even if email fails - for testing
            console.log(`⚠️  Email failed, but OTP is: ${otp}`);
        }

        res.status(201).json({
            message: 'Registration successful. Please check your email for OTP verification.',
            email: email,
            userId: user.id,
            // For testing without email - remove this in production!
            _testOTP: otp
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed', message: error.message });
    }
});

app.post('/api/auth/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Find valid OTP
        const otpIndex = otps.findIndex(o =>
            o.email === email &&
            o.otp === otp &&
            new Date(o.expiresAt) > new Date()
        );

        if (otpIndex === -1) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        // Update user as verified
        const user = users.find(u => u.email === email);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.emailVerified = true;

        // Remove used OTP
        otps.splice(otpIndex, 1);

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Email verified successfully',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({ error: 'Verification failed', message: error.message });
    }
});

app.post('/api/auth/resend-otp', async (req, res) => {
    try {
        const { email } = req.body;

        const user = users.find(u => u.email === email);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Generate new OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60000);

        // Remove old OTP
        const oldIndex = otps.findIndex(o => o.email === email);
        if (oldIndex !== -1) otps.splice(oldIndex, 1);

        // Add new OTP
        otps.push({ email, otp, expiresAt });

        // Send OTP email
        try {
            await sendOTPEmail(email, otp, user.name);
            console.log(`✅ OTP resent to ${email}: ${otp}`);
        } catch (emailError) {
            console.error('Email error:', emailError);
            console.log(`⚠️  Email failed, but OTP is: ${otp}`);
        }

        res.json({
            message: 'OTP resent successfully',
            _testOTP: otp // For testing - remove in production
        });

    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({ error: 'Failed to resend OTP', message: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = users.find(u => u.email === email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (!user.emailVerified) {
            return res.status(403).json({ error: 'Please verify your email first' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                address: user.address
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed', message: error.message });
    }
});

// Get all users (admin only)
app.get('/api/users', (req, res) => {
    try {
        // Return users without passwords
        const usersData = users.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            address: u.address,
            age: u.age,
            role: u.role,
            emailVerified: u.emailVerified,
            createdAt: u.createdAt
        }));

        res.json({
            users: usersData,
            total: usersData.length
        });
    } catch (error) {
        console.error('Fetch users error:', error);
        res.status(500).json({ error: 'Failed to fetch users', message: error.message });
    }
});

// Delete user (admin only)
app.delete('/api/users/:id', (req, res) => {
    try {
        const { id } = req.params;

        // Find user index
        const userIndex = users.findIndex(u => u.id === id);

        if (userIndex === -1) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Remove user from array
        const deletedUser = users.splice(userIndex, 1)[0];

        // Also remove any OTPs for this user
        const otpIndex = otps.findIndex(o => o.email === deletedUser.email);
        if (otpIndex !== -1) {
            otps.splice(otpIndex, 1);
        }

        console.log(`🗑️  User deleted: ${deletedUser.email}`);

        res.json({
            message: 'User deleted successfully',
            user: {
                id: deletedUser.id,
                email: deletedUser.email,
                name: deletedUser.name
            }
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user', message: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'VH Autoglass API (In-Memory Mode)',
        timestamp: new Date().toISOString(),
        storage: 'In-Memory (temporary)',
        users: users.length,
        email: process.env.EMAIL_USER || 'Not configured'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'VH Autoglass API - Testing Mode',
        version: '1.0.0',
        storage: 'In-Memory (data will be lost on restart)',
        endpoints: {
            register: 'POST /api/auth/register',
            verifyOtp: 'POST /api/auth/verify-otp',
            resendOtp: 'POST /api/auth/resend-otp',
            login: 'POST /api/auth/login',
            health: 'GET /api/health'
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: err.message
    });
});

app.listen(PORT, () => {
    console.log(`\n✅ ========================================`);
    console.log(`🚀 VH Autoglass API - TESTING MODE`);
    console.log(`📡 Server: http://localhost:${PORT}`);
    console.log(`📧 Email: ${process.env.EMAIL_USER || 'Not configured'}`);
    console.log(`💾 Storage: In-Memory (temporary)`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`========================================\n`);
    console.log(`📖 API Docs: http://localhost:${PORT}/`);
    console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
    console.log(`\n⚠️  NOTE: Data is stored in memory and will be lost on restart`);
    console.log(`⚠️  OTP codes are logged to console for testing\n`);
});
