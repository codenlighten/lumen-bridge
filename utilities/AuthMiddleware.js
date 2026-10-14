import crypto from "crypto";
import SignatureVerifier from "./SignatureVerifier.js";

export class AppError extends Error {
	constructor(code, status, message) {
		super(message);
		this.code = code;
		this.status = status;
		this.isOperational = true;
	}
}

function extractBearer(req) {
	const header = req.headers["authorization"] || req.headers["Authorization"];
	if (!header || typeof header !== "string") return null;
	const match = header.match(/^Bearer\s+(.+)$/i);
	return match ? match[1].trim() : null;
}

function decode(token) {
	if (!token) return null;
	const decoded = SignatureVerifier.verifyToken(token);
	if (!decoded) return null;
	return {
		publicKey: decoded.publicKey || decoded.sub || null,
		email: decoded.email || null,
		type: decoded.type || null,
		iat: decoded.iat,
		exp: decoded.exp,
	};
}

export function requireAuth(req, res, next) {
	const token = extractBearer(req);
	const user = decode(token);
	if (!user) {
		return res.status(401).json({
			success: false,
			error: { code: "UNAUTHORIZED", message: "Authentication required" },
		});
	}
	req.user = user;
	next();
}

export function optionalAuth(req, res, next) {
	const token = extractBearer(req);
	const user = decode(token);
	if (user) req.user = user;
	next();
}

export function asyncHandler(fn) {
	return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// Accept admin key from X-Admin-Key header (preferred) or ?adminKey query (legacy).
// Returns 403 if missing/invalid or if ADMIN_KEY env is unset.
// Constant-time comparison; hashing first makes the lengths equal.
function safeEqual(a, b) {
	const ha = crypto.createHash("sha256").update(String(a)).digest();
	const hb = crypto.createHash("sha256").update(String(b)).digest();
	return crypto.timingSafeEqual(ha, hb);
}

export function requireAdmin(req, res, next) {
	const expected = process.env.ADMIN_KEY;
	const provided =
		req.headers["x-admin-key"] ||
		req.headers["X-Admin-Key"] ||
		req.query?.adminKey;
	if (!expected || !provided || !safeEqual(provided, expected)) {
		return res.status(403).json({
			success: false,
			error: { code: "FORBIDDEN", message: "Admin credentials required" },
		});
	}
	next();
}

export function errorHandler(err, req, res, _next) {
	const isProd = process.env.NODE_ENV === "production";
	const status = err.status || err.statusCode || 500;
	const code = err.code || (status === 500 ? "INTERNAL_ERROR" : "ERROR");

	console.error(
		`[error] ${req.method} ${req.originalUrl} -> ${status} ${code}:`,
		err.stack || err.message || err
	);

	if (res.headersSent) return;

	const body = {
		success: false,
		error: {
			code,
			message:
				isProd && !err.isOperational
					? "Internal server error"
					: err.message || "Error",
		},
	};
	if (!isProd && err.stack) body.error.stack = err.stack;
	res.status(status).json(body);
}
