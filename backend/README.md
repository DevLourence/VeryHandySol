# VH Autoglass Backend API

Simple Node.js backend with OTP email verification for VH Autoglass.

## 🚀 Quick Setup

### Prerequisites
- Node.js (v16 or higher)
- MySQL (or XAMPP)

### Installation Steps

1. **Install Node.js**
   - Download from: https://nodejs.org/
   - Install and verify: `node --version`

2. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Setup Database**
   - Start MySQL (or XAMPP)
   - Import database schema:
   ```bash
   mysql -u root -p < database/schema.sql
   ```

4. **Configure Environment**
   - Copy `.env.example` to `.env`
   - Update email settings:
   ```env
   EMAIL_USER=veryhandyhomeservices1@gmail.com
   EMAIL_PASS=your-gmail-app-password
   ```

5. **Get Gmail App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Create app password for "Mail"
   - Copy 16-character password to `.env`

6. **Start Server**
   ```bash
   npm start
   ```

   Server will run on: http://localhost:3000

## 📧 Email Configuration

### Gmail Setup
1. Enable 2-Step Verification in your Google Account
2. Generate App Password at: https://myaccount.google.com/apppasswords
3. Use the 16-character password in `.env`

### Alternative: Mailtrap (Testing)
```env
EMAIL_HOST=sandbox.smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=your_mailtrap_username
EMAIL_PASS=your_mailtrap_password
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register user (sends OTP)
- `POST /api/auth/verify-otp` - Verify OTP code
- `POST /api/auth/resend-otp` - Resend OTP email
- `POST /api/auth/login` - User login

### Health Check
- `GET /api/health` - Check if server is running

## ✅ Testing

Test with Postman or curl:

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "address": "123 Test St",
    "age": 25
  }'

# Verify OTP
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "123456"
  }'
```

## 🔧 Troubleshooting

**Email not sending?**
- Check Gmail App Password is correct
- Verify 2-Step Verification is enabled
- Check spam folder

**Database connection error?**
- Verify MySQL is running
- Check database credentials in `.env`
- Ensure database `vh_autoglass` exists

**Port already in use?**
- Change PORT in `.env` to different number (e.g., 3001)
