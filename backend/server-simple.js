require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'VH Autoglass Backend is running!',
        timestamp: new Date().toISOString(),
        mongodb: process.env.MONGODB_URI ? 'Configured' : 'Not configured',
        email: process.env.EMAIL_USER || 'Not configured'
    });
});

// Simple test route
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to VH Autoglass API',
        endpoints: {
            health: '/api/health',
            auth: '/api/auth/*'
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
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📧 Email: ${process.env.EMAIL_USER || 'Not configured'}`);
    console.log(`🗄️  MongoDB: ${process.env.MONGODB_URI ? 'Configured' : 'Not configured'}`);
    console.log(`========================================\n`);
    console.log(`Test the server: http://localhost:${PORT}/api/health\n`);
});
