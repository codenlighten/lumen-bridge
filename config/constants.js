// Centralized constants. Prefer reading from here over inlining values.

export const AUTH = {
	BCRYPT_COST: 12,
	JWT_EXPIRY: process.env.JWT_EXPIRES_IN || "1h",
	CHALLENGE_EXPIRY_MS: 5 * 60 * 1000, // 5 minutes
	EMAIL_VERIFICATION_TTL_MS: 24 * 60 * 60 * 1000, // 24 hours
};

export const TIERS = {
	free: { monthlyLimit: 100 },
	pro: { monthlyLimit: 10_000 },
	enterprise: { monthlyLimit: -1 }, // -1 = unlimited
};

export const META_AGENT = {
	REQUEST_COST: 10, // creating a custom agent counts as 10 requests
};

export const CACHE = {
	TTL_MS: 60 * 60 * 1000, // 1 hour
	MAX_SIZE: 100,
};
