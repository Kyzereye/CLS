# CLS Backend API

A secure Node.js/Express backend API for the CLS (Colorado Land Surveyors) application.

## 🚀 Recent Improvements

This backend has been significantly enhanced with modern security practices and best practices:

### ✅ Security Enhancements
- **Helmet.js**: Added security headers to protect against common web vulnerabilities
- **Rate Limiting**: Implemented request rate limiting to prevent abuse
  - General API: 100 requests per 15 minutes
  - Auth endpoints: 5 requests per 15 minutes
- **JWT Authentication**: Secure token-based authentication system
- **Input Validation**: Comprehensive validation using express-validator
- **CORS Configuration**: Properly configured CORS with credentials support

### ✅ Code Quality Improvements
- **Centralized Error Handling**: Consistent error responses with proper HTTP status codes
- **Database Service Layer**: Reusable database operations to reduce code duplication
- **Async Error Handling**: Proper async/await error handling with try-catch blocks
- **Request Validation**: Input sanitization and validation middleware
- **Environment Configuration**: Proper environment variable management

### ✅ New Features
- **Health Check Endpoint**: `/health` for monitoring
- **JWT Token Generation**: Secure authentication tokens
- **Resource Ownership Validation**: Users can only access their own data
- **Comprehensive Logging**: Structured error logging with timestamps

## 📁 Project Structure

```
backend/
├── controllers/           # Route handlers
│   ├── authController.js
│   ├── emailController.js
│   ├── registrationController.js
│   └── userProfileController.js
├── middleware/           # Custom middleware
│   ├── auth.js          # JWT authentication
│   ├── errorHandler.js  # Error handling
│   └── validation.js    # Input validation
├── routes/              # API routes
│   ├── authRoutes.js
│   ├── emailRoutes.js
│   ├── registrationRoutes.js
│   └── userProfileRoutes.js
├── services/            # Business logic services
│   └── databaseService.js
├── utils/               # Utility functions
│   ├── db.js           # Database connection
│   └── sql.sql         # Database schema
├── .env.example        # Environment variables template
├── package.json        # Dependencies and scripts
└── server.js          # Main application file
```

## 🔧 Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Required Environment Variables**
   ```env
   NODE_ENV=development
   PORT=3000
   FRONTEND_URL=http://localhost:4200
   
   # Database
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=CSL
   
   # Email
   EMAIL_USER=your_email@example.com
   EMAIL_PASS=your_email_password
   
   # JWT
   JWT_SECRET=your_super_secret_key
   JWT_EXPIRES_IN=24h
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## 🔐 Security Features

### Authentication
- JWT tokens with configurable expiration
- Secure password hashing with bcryptjs
- Token validation on protected routes

### Rate Limiting
- Prevents brute force attacks
- Different limits for different endpoint types
- IP-based tracking

### Input Validation
- Email format validation
- Password strength requirements
- SQL injection prevention
- XSS protection

### Headers Security
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - User login (with JWT token response)

### Registration
- `POST /api/registration/register-user` - User registration

### User Profile (Protected - requires JWT token)
- `GET /api/user-profile/:id` - Get user profile
- `PUT /api/user-profile/info/:id` - Update user info
- `PATCH /api/user-profile/password/:id` - Change password
- `PUT /api/user-profile/services/:id` - Update services
- `PUT /api/user-profile/areas/:id` - Update service areas
- `DELETE /api/user-profile/:id` - Delete user account

### Email
- `POST /api/email/send-email` - Send email

### System
- `GET /` - Server status
- `GET /health` - Health check

## 🛡️ Error Handling

All errors are handled consistently with:
- Proper HTTP status codes
- Structured error messages
- Request tracing information
- Development vs production error details

## 🔍 Monitoring

- Health check endpoint for uptime monitoring
- Structured logging with timestamps
- Memory usage tracking
- Request/response logging

## 🚀 Deployment Notes

1. Set `NODE_ENV=production` in production
2. Use a strong, unique `JWT_SECRET`
3. Configure proper CORS origins
4. Set up database connection pooling
5. Enable HTTPS in production
6. Monitor rate limiting and adjust as needed

## 📝 Development Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run lint` - Run linting (placeholder)

## 🔄 Database Service

The new `DatabaseService` class provides:
- Connection pooling management
- Transaction support
- CRUD operations
- Pagination
- Batch operations
- Query optimization

This reduces code duplication and provides a consistent interface for database operations.

