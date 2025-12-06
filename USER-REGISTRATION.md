# User Registration System

Complete user registration and authentication system with client-side key generation and email verification.

## Features

- ✅ **Client-Side Key Generation** - Keys never leave the browser
- ✅ **Email Verification** - Nodemailer integration
- ✅ **Password Security** - bcryptjs hashing
- ✅ **Tier System** - Free, Pro, Enterprise tiers
- ✅ **Request Tracking** - Monthly limits per tier
- ✅ **Public Key Auth** - Cryptographic signature verification

## User Flow

### 1. Registration (`/register.html`)

User generates keys client-side:
```javascript
// 24-word mnemonic generated in browser
const mnemonic = SLH.generateMnemonic(256);
const keys = SLH.deriveKeysFromMnemonic(mnemonic, "m/44'/236'/0'/0/0");
```

Then registers with:
- Email address
- Password (hashed server-side)
- Public key (from generated keys)

### 2. Email Verification

Server sends verification email → User clicks link → Account activated

### 3. API Usage

Users can now:
- Sign requests with their private key
- Get verified status via `req.verificationResult`
- Track usage against monthly limits

## API Endpoints

### POST `/api/users/register`

Register a new user (pending verification).

**Request:**
```json
{
  "email": "user@example.com",
  "publicKey": "03abc123...",
  "password": "securepass123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful! Please check your email to verify your account.",
  "email": "user@example.com",
  "publicKey": "03abc123..."
}
```

### GET `/api/users/verify?token=xxx`

Verify email address with token from email.

Returns HTML success/error page.

### POST `/api/users/login`

Login with email and password to get user info.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepass123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "email": "user@example.com",
    "publicKey": "03abc123...",
    "tier": "free",
    "monthlyLimit": 100,
    "requestCount": 42
  }
}
```

### GET `/api/users/stats?publicKey=xxx`

Get user statistics and remaining quota.

**Response:**
```json
{
  "success": true,
  "stats": {
    "email": "user@example.com",
    "publicKey": "03abc123...",
    "tier": "free",
    "requestCount": 42,
    "monthlyLimit": 100,
    "remaining": 58,
    "resetDate": "2025-12-01T00:00:00.000Z"
  }
}
```

## Tier System

### Free Tier (Default)
- **Cost:** Free
- **Requests:** 100/month
- **Features:** Full API access
- **Requirement:** Verified email

### Pro Tier
- **Cost:** $9/month
- **Requests:** 10,000/month
- **Features:** Full API access + priority support

### Enterprise Tier
- **Cost:** $99/month
- **Requests:** Unlimited
- **Features:** Full API access + dedicated support + SLA

## Email Configuration

Set up SMTP in `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
BASE_URL=https://yourdomain.com
```

### Gmail Setup

1. Enable 2FA on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the app password as `SMTP_PASS`

## MongoDB Collections

### `verified_users`
```javascript
{
  email: String,
  publicKey: String,
  passwordHash: String,
  tier: String,  // 'free', 'pro', 'enterprise'
  requestCount: Number,
  monthlyLimit: Number,
  resetDate: Date,
  verifiedAt: Date,
  createdAt: Date
}
```

### `pending_users`
```javascript
{
  email: String,
  publicKey: String,
  passwordHash: String,
  verificationToken: String,
  tokenExpiry: Date,
  tier: String,
  requestCount: Number,
  monthlyLimit: Number,
  resetDate: Date,
  createdAt: Date
}
```

## Security Features

1. **Password Hashing** - bcryptjs with salt rounds = 10
2. **Email Verification** - Required before activation
3. **Token Expiry** - Verification tokens expire in 24 hours
4. **Public Key Uniqueness** - One key per user
5. **Email Uniqueness** - One email per user
6. **Request Signing** - Optional cryptographic verification

## Client-Side Key Management

Users manage their own keys:
- **Generate:** Create new 24-word mnemonic
- **Import:** Use existing mnemonic
- **Backup:** Encrypted JSON download
- **Restore:** Upload encrypted backup

**Important:** Keys never touch the server. Only public keys are stored.

## Future Enhancements

- [ ] Payment integration (Stripe)
- [ ] Tier upgrade endpoints
- [ ] Usage analytics dashboard
- [ ] Rate limiting middleware
- [ ] OAuth providers (Google, GitHub)
- [ ] 2FA support
- [ ] API key generation (alternative to public key)

## Testing

```bash
# Start server
npm start

# Visit registration page
open http://localhost:3005/register.html

# Generate keys, register, check email
```

## Development Mode

Without SMTP configured, verification URLs are logged to console:

```
📧 Verification URL: http://localhost:3005/api/users/verify?token=abc123...
```

Copy and paste to verify during development.

