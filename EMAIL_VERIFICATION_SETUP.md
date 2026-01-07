# Email Verification Setup Guide

This application includes **optional email verification**. Users can still login even if their email is not verified, but verification is recommended for security.

## Features

✅ **Optional Verification** - Users can login without verifying email  
✅ **Automatic Email Sending** - Verification emails sent on signup  
✅ **Resend Verification** - Users can request new verification emails  
✅ **Graceful Fallback** - Works without email service configured  

## Setup Instructions

### Option 1: Gmail (Recommended for Development)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter "Portfolio App" as the name
   - Copy the generated 16-character password

3. **Update `.env` file**:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-character-app-password
FRONTEND_URL=http://localhost:4200
```

### Option 2: Outlook/Hotmail

```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password
FRONTEND_URL=http://localhost:4200
```

### Option 3: Custom SMTP Server

```env
EMAIL_HOST=your-smtp-server.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@domain.com
EMAIL_PASS=your-password
FRONTEND_URL=http://localhost:4200
```

### Option 4: No Email Service (Development Only)

If you don't configure email settings, the app will:
- ✅ Still allow user registration
- ✅ Still allow login (verification is optional)
- ⚠️ Skip sending verification emails
- ℹ️ Show a message that email service is not configured

## How It Works

### Registration Flow

1. User signs up with email and password
2. System generates verification token
3. Verification email is sent (if email service is configured)
4. User can login immediately (verification is optional)
5. User clicks verification link in email
6. Email is marked as verified

### Verification Flow

1. User receives email with verification link
2. Link format: `http://localhost:4200/verify-email?token=xxx`
3. User clicks link
4. System verifies token and marks email as verified
5. User is redirected to login page

### Login Flow

- ✅ Users can login **with or without** email verification
- ✅ Verification status is shown in user profile
- ✅ Unverified users can still access portfolio

## API Endpoints

### POST `/api/auth/register`
Register new user and send verification email (if configured)

**Response:**
```json
{
  "message": "User registered successfully",
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "isEmailVerified": false
  },
  "emailSent": true,
  "emailMessage": "Verification email sent successfully"
}
```

### GET `/api/auth/verify-email?token=xxx`
Verify email address using token from email

**Response:**
```json
{
  "message": "Email verified successfully",
  "verified": true
}
```

### POST `/api/auth/resend-verification`
Resend verification email

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "Verification email sent successfully",
  "emailSent": true,
  "emailMessage": "Verification email sent successfully"
}
```

## Frontend Routes

- `/verify-email?token=xxx` - Email verification page
- `/signup` - Registration (shows verification message if email sent)
- `/login` - Login (works with or without verification)

## Testing

### Test Without Email Service

1. Don't configure email in `.env`
2. Sign up a new user
3. User can login immediately
4. System will log: "Email verification skipped (email service not configured)"

### Test With Email Service

1. Configure email in `.env`
2. Sign up a new user
3. Check email inbox for verification link
4. Click link to verify email
5. User can login (verification status shown)

## Troubleshooting

### Email Not Sending

1. **Check `.env` file** - Ensure all email variables are set
2. **Check Gmail App Password** - Must use app password, not regular password
3. **Check Firewall** - Port 587 must be open
4. **Check Server Logs** - Look for email service errors

### Verification Link Not Working

1. **Check Token Expiry** - Links expire after 24 hours
2. **Check Frontend URL** - Must match `FRONTEND_URL` in `.env`
3. **Request New Link** - Use resend verification endpoint

### Users Can't Login

- ✅ **This shouldn't happen** - Login works without verification
- Check if password is correct
- Check if user exists in database
- Check server logs for errors

## Security Notes

- Verification tokens expire after 24 hours
- Tokens are cryptographically secure (32-byte random)
- Email verification is **optional** - users can login without it
- For production, consider making verification required

## Production Deployment

For production:

1. Use a professional email service (SendGrid, Mailgun, AWS SES)
2. Set `FRONTEND_URL` to your production domain
3. Consider making verification required
4. Set up email templates
5. Monitor email delivery rates

---

**Note:** Email verification is designed to be optional. Users can always login, but verified users have better account security.

