# Authentication

Lumen Bridge supports two authentication paths, both producing the same JWT Bearer token:

- **Signature-based** (BSV ECDSA challenge-response) — for clients that hold a private key
- **Password-based** (email + password via `POST /api/users/login`) — for registered users

Protected endpoints (e.g. `POST /api/meta/create-agent`) require a Bearer token via the
`Authorization` header. Public endpoints (challenge, register, login, email verification,
health) do not.

## Overview

The signature flow uses a challenge-response mechanism:

1. Client requests a challenge from the server
2. Client signs the challenge with their private key
3. Server verifies the signature and issues a JWT token
4. Client uses the JWT token for authenticated API requests

The password flow is a single POST that returns the token directly.

## Authentication Flow

### Step 1: Request a Challenge

**Endpoint:** `POST /api/auth/challenge`

**Request:**

```json
{
	"publicKey": "03abc123..."
}
```

**Response:**

```json
{
	"success": true,
	"challenge": "a1b2c3d4...",
	"message": "Sign this challenge: a1b2c3d4...",
	"expiresIn": 300,
	"timestamp": 1700000000000
}
```

- Challenge expires in 5 minutes (300 seconds)
- Each challenge can only be used once

### Step 2: Sign the Challenge

Use your private key to sign the challenge nonce using DER encoding:

```javascript
import { signData } from "./tools/der-signature.js";
import bsv from "smartledger-bsv";

const privateKey = bsv.PrivateKey.fromWIF("your-private-key-wif");
const signature = signData(challenge, privateKey.toWIF());
```

### Step 3: Verify and Get Token

**Endpoint:** `POST /api/auth/verify`

**Request:**

```json
{
	"challenge": "a1b2c3d4...",
	"signature": "304502...",
	"publicKey": "03abc123..."
}
```

**Response (Success):**

```json
{
	"success": true,
	"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
	"expiresIn": "1h",
	"publicKey": "03abc123...",
	"issuedAt": "2025-11-25T12:00:00.000Z"
}
```

**Response (Failure):**

```json
{
	"success": false,
	"error": "Invalid signature"
}
```

### Step 4: Use the Token

Include the JWT token in the `Authorization` header for subsequent API requests:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Tokens are validated by the `requireAuth` middleware on protected routes. Missing or
invalid tokens return `401 { success: false, error: { code: "UNAUTHORIZED", ... } }`.

## Password-Based Login (alternative)

**Endpoint:** `POST /api/users/login`

**Request:**

```json
{ "email": "user@example.com", "password": "..." }
```

**Response:**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "1h",
  "user": { "email": "...", "publicKey": "...", "tier": "free", ... }
}
```

The returned `token` is interchangeable with the signature-flow token.

## Optional Signature Verification

All API endpoints also support optional signature verification through the `SignatureVerifier` middleware:

### Via Headers:

```
X-Signature: <der-hex-signature>
X-Public-Key: <public-key-hex>
```

### Via Request Body:

```json
{
  "signature": "<der-hex-signature>",
  "publicKey": "<public-key-hex>",
  ...other request data
}
```

Responses will include verification status:

```json
{
  "verified": true,
  "verificationDetails": {
    "verified": true,
    "reason": "Signature valid",
    "publicKey": "03abc123..."
  },
  ...response data
}
```

## Security Considerations

### Production Deployment:

1. **Set JWT Secret:** Configure a secure JWT secret in environment variables

   ```bash
   export JWT_SECRET="your-secure-random-secret-key"
   ```

2. **Use HTTPS:** Always use HTTPS in production to prevent token interception

3. **Challenge Storage:** The current implementation uses in-memory storage. For production:

   - Use Redis or a database for distributed systems
   - Rate limiting on `/api/auth/*`, `/api/users/login`, `/api/users/register` is enforced
     by `express-rate-limit` (configurable via `AUTH_RATE_LIMIT_MAX`, default 10 / 15 min / IP)
   - Monitor for suspicious authentication patterns

4. **Token Management:**

   - Tokens expire after 1 hour
   - Implement token refresh mechanism for long-running sessions
   - Consider shorter expiry times for sensitive operations

5. **Private Key Security:**
   - Never expose private keys
   - Store securely (hardware wallet, secure enclave, KMS)
   - Implement key rotation policies

## Testing

Run the authentication flow test:

```bash
node test-auth-flow.js
```

Or with an existing private key:

```bash
export TEST_PRIVATE_KEY="your-wif-private-key"
node test-auth-flow.js
```

## Example Client Implementation

```javascript
class LumenBridgeClient {
	constructor(privateKeyWIF, serverUrl = "http://localhost:3005") {
		this.privateKey = bsv.PrivateKey.fromWIF(privateKeyWIF);
		this.publicKey = this.privateKey.toPublicKey().toString();
		this.serverUrl = serverUrl;
		this.token = null;
	}

	async authenticate() {
		// Request challenge
		const challengeRes = await fetch(`${this.serverUrl}/api/auth/challenge`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ publicKey: this.publicKey }),
		});
		const { challenge } = await challengeRes.json();

		// Sign challenge
		const signature = signData(challenge, this.privateKey.toWIF());

		// Verify and get token
		const verifyRes = await fetch(`${this.serverUrl}/api/auth/verify`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ challenge, signature, publicKey: this.publicKey }),
		});
		const { token } = await verifyRes.json();

		this.token = token;
		return token;
	}

	async request(endpoint, options = {}) {
		if (!this.token) {
			await this.authenticate();
		}

		return fetch(`${this.serverUrl}${endpoint}`, {
			...options,
			headers: {
				...options.headers,
				Authorization: `Bearer ${this.token}`,
				"Content-Type": "application/json",
			},
		});
	}
}
```

## Error Codes

| Status | Error          | Description                             |
| ------ | -------------- | --------------------------------------- |
| 400    | Bad Request    | Missing required parameters             |
| 401    | Unauthorized   | Invalid signature or expired challenge  |
| 500    | Internal Error | Server-side error during authentication |

## Challenge Lifecycle

```
┌─────────────────┐
│ Request Challenge│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Generate Nonce  │ ← Stored in memory
│ Expires: 5 min  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Client Signs    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Verify Signature│
└────────┬────────┘
         │
         ├─── Valid ────► Issue JWT Token (1 hour)
         │
         └─── Invalid ──► Error Response
```

## Future Enhancements

- [ ] Token refresh endpoint
- [ ] Revocation list for compromised keys
- [ ] Multi-signature support
- [ ] OAuth2 integration
- [ ] Persistent challenge storage (Redis/DB)
- [ ] Audit logging for authentication events
