import { verifySignature } from "../tools/der-signature.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";

/**
 * SignatureVerifier - Helper for verifying DER signatures on API requests
 *
 * This utility allows optional signature verification for API calls.
 * Users can include signature and publicKey in request headers or body.
 * The response will include a 'verified' property indicating signature validity.
 */
class SignatureVerifier {
	// In-memory challenge storage (use Redis/DB for production)
	static challenges = new Map();
	static CHALLENGE_EXPIRY = 5 * 60 * 1000; // 5 minutes
	static JWT_SECRET =
		process.env.JWT_SECRET || "lumenbridge-secret-key-change-in-production";
	static JWT_EXPIRY = "1h";
	/**
	 * Verify a signed request
	 * @param {string} jsonString - The JSON string that was signed
	 * @param {string} signature - The DER-encoded signature in hex format
	 * @param {string} publicKey - The public key in hex format
	 * @returns {boolean} True if signature is valid, false otherwise
	 */
	static verify(jsonString, signature, publicKey) {
		try {
			if (!jsonString || !signature || !publicKey) {
				return false;
			}

			return verifySignature(jsonString, signature, publicKey);
		} catch (error) {
			console.error("Signature verification error:", error.message);
			return false;
		}
	}

	/**
	 * Extract signature data from Express request
	 * @param {Object} req - Express request object
	 * @returns {Object} Object containing signature, publicKey, and body
	 */
	static extractSignatureData(req) {
		// Check headers first
		let signature = req.headers["x-signature"] || req.headers["signature"];
		let publicKey = req.headers["x-public-key"] || req.headers["publickey"];

		// Check body if not in headers
		if (!signature && req.body) {
			signature = req.body.signature;
		}
		if (!publicKey && req.body) {
			publicKey = req.body.publicKey || req.body.publickey;
		}

		return {
			signature,
			publicKey,
			body: req.body,
		};
	}

	/**
	 * Verify request signature and return verification status
	 * @param {Object} req - Express request object
	 * @param {string} jsonString - The JSON string to verify (optional, defaults to stringified body)
	 * @returns {Object} Object with verified status and details
	 */
	static verifyRequest(req, jsonString = null) {
		const { signature, publicKey, body } = this.extractSignatureData(req);

		// If no signature provided, return unverified (not an error)
		if (!signature || !publicKey) {
			return {
				verified: false,
				reason: "No signature or public key provided",
				optional: true,
			};
		}

		// Determine what data to verify
		const dataToVerify = jsonString || JSON.stringify(body);

		const isValid = this.verify(dataToVerify, signature, publicKey);

		return {
			verified: isValid,
			publicKey: isValid ? publicKey : null,
			reason: isValid ? "Signature valid" : "Signature verification failed",
		};
	}

	/**
	 * Express middleware for optional signature verification
	 * Adds verificationResult to req object
	 * Does NOT block requests - only adds verification status
	 */
	static middleware() {
		return (req, res, next) => {
			// Skip verification for GET requests (no body to sign)
			if (req.method === "GET") {
				req.verificationResult = {
					verified: false,
					reason: "GET requests are not signed",
					optional: true,
				};
				return next();
			}

			// Perform verification
			req.verificationResult = this.verifyRequest(req);

			// Log verification attempts (optional)
			if (req.verificationResult.verified) {
				console.log(
					`✓ Request verified from public key: ${req.verificationResult.publicKey.substring(
						0,
						16
					)}...`
				);
			}

			next();
		};
	}

	/**
	 * Wrap a response to include verification status
	 * @param {Object} originalResponse - The original response object
	 * @param {Object} verificationResult - The verification result
	 * @returns {Object} Response with added verified property
	 */
	static wrapResponse(originalResponse, verificationResult) {
		return {
			...originalResponse,
			verified: verificationResult.verified,
			verificationDetails: {
				verified: verificationResult.verified,
				reason: verificationResult.reason,
				publicKey: verificationResult.publicKey,
			},
		};
	}

	/**
	 * Generate a random challenge for signature authentication
	 * @param {string} publicKey - The public key requesting the challenge
	 * @returns {Object} Challenge object with nonce and expiry
	 */
	static generateChallenge(publicKey) {
		const nonce = crypto.randomBytes(32).toString("hex");
		const timestamp = Date.now();
		const expiresAt = timestamp + this.CHALLENGE_EXPIRY;

		const challenge = {
			nonce,
			publicKey,
			timestamp,
			expiresAt,
		};

		// Store challenge
		this.challenges.set(nonce, challenge);

		// Clean up expired challenges
		this.cleanExpiredChallenges();

		return {
			challenge: nonce,
			message: `Sign this challenge: ${nonce}`,
			expiresIn: this.CHALLENGE_EXPIRY / 1000, // seconds
			timestamp,
		};
	}

	/**
	 * Verify a signed challenge and issue JWT token
	 * @param {string} challenge - The challenge nonce
	 * @param {string} signature - The signed challenge
	 * @param {string} publicKey - The public key
	 * @returns {Object} Result with JWT token or error
	 */
	static verifyChallenge(challenge, signature, publicKey) {
		const storedChallenge = this.challenges.get(challenge);

		if (!storedChallenge) {
			return {
				success: false,
				error: "Challenge not found or expired",
			};
		}

		if (Date.now() > storedChallenge.expiresAt) {
			this.challenges.delete(challenge);
			return {
				success: false,
				error: "Challenge expired",
			};
		}

		if (storedChallenge.publicKey !== publicKey) {
			return {
				success: false,
				error: "Public key mismatch",
			};
		}

		// Verify the signature
		const isValid = this.verify(challenge, signature, publicKey);

		if (!isValid) {
			return {
				success: false,
				error: "Invalid signature",
			};
		}

		// Delete used challenge
		this.challenges.delete(challenge);

		// Generate JWT token
		const token = jwt.sign(
			{
				publicKey,
				type: "signature-auth",
			},
			this.JWT_SECRET,
			{
				expiresIn: this.JWT_EXPIRY,
				issuer: "lumenbridge",
				subject: publicKey,
			}
		);

		return {
			success: true,
			token,
			expiresIn: "1h",
			publicKey,
			issuedAt: new Date().toISOString(),
		};
	}

	/**
	 * Verify a JWT token
	 * @param {string} token - The JWT token to verify
	 * @returns {Object} Decoded token or null if invalid
	 */
	static verifyToken(token) {
		try {
			return jwt.verify(token, this.JWT_SECRET);
		} catch (error) {
			return null;
		}
	}

	/**
	 * Clean up expired challenges
	 */
	static cleanExpiredChallenges() {
		const now = Date.now();
		for (const [nonce, challenge] of this.challenges.entries()) {
			if (now > challenge.expiresAt) {
				this.challenges.delete(nonce);
			}
		}
	}
}

export default SignatureVerifier;

/**
 * Example usage:
 *
 * In server.js:
 * import SignatureVerifier from './utilities/SignatureVerifier.js';
 *
 * // Add as middleware (optional)
 * app.use(express.json());
 * app.use(SignatureVerifier.middleware());
 *
 * // In route handlers:
 * app.post('/api/endpoint', (req, res) => {
 *   const result = processRequest(req.body);
 *   const response = SignatureVerifier.wrapResponse(result, req.verificationResult);
 *   res.json(response);
 * });
 *
 * Client usage:
 * POST /api/endpoint
 * Headers:
 *   X-Signature: <der-hex-signature>
 *   X-Public-Key: <public-key-hex>
 * Body:
 *   { ...request data... }
 *
 * Or include in body:
 * {
 *   "signature": "<der-hex-signature>",
 *   "publicKey": "<public-key-hex>",
 *   ...request data...
 * }
 */
