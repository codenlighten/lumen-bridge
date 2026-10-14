import crypto from "crypto";

/**
 * Deterministic JSON serialisation: object keys sorted by UTF-16 code unit
 * order at every depth, no whitespace. This follows RFC 8785 (JCS) for the
 * I-JSON subset used here (strings, finite numbers, booleans, null, arrays,
 * plain objects). undefined values are dropped like JSON.stringify does;
 * NaN/Infinity throw instead of becoming null.
 */
export function canonicalize(value) {
	if (value === null) return "null";
	switch (typeof value) {
		case "string":
		case "boolean":
			return JSON.stringify(value);
		case "number":
			if (!Number.isFinite(value)) {
				throw new TypeError("canonicalize: non-finite number");
			}
			return JSON.stringify(value);
		case "object": {
			const proto = Object.getPrototypeOf(value);
			if (!Array.isArray(value) && proto !== Object.prototype && proto !== null) {
				throw new TypeError("canonicalize: only plain objects and arrays are supported");
			}
			if (Array.isArray(value)) {
				return `[${value
					.map((v) => (v === undefined ? "null" : canonicalize(v)))
					.join(",")}]`;
			}
			const keys = Object.keys(value)
				.filter((k) => value[k] !== undefined)
				.sort();
			return `{${keys
				.map((k) => `${JSON.stringify(k)}:${canonicalize(value[k])}`)
				.join(",")}}`;
		}
		default:
			throw new TypeError(`canonicalize: unsupported type ${typeof value}`);
	}
}

export function sha256Hex(text) {
	return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

export function canonicalHash(value) {
	return sha256Hex(canonicalize(value));
}
