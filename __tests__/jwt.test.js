import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "unit-test-secret-not-the-default";
const { default: SV } = await import("../utilities/SignatureVerifier.js");

const base = { publicKey: "pk", type: "signature-auth" };
const sign = (claims, secret = process.env.JWT_SECRET, opts = {}) =>
	jwt.sign(claims, secret, {
		expiresIn: "1h",
		issuer: SV.JWT_ISSUER,
		audience: SV.JWT_AUDIENCE,
		...opts,
	});

describe("verifyToken — must pass", () => {
	test("token minted by signToken verifies", () => {
		const t = SV.signToken({ publicKey: "pk", type: "password-auth", email: "a@b.c" }, "pk");
		assert.equal(SV.verifyToken(t).publicKey, "pk");
	});
});

describe("verifyToken — must fail", () => {
	test("alg=none", () => {
		const enc = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
		const t = `${enc({ alg: "none", typ: "JWT" })}.${enc({ ...base, iss: SV.JWT_ISSUER, aud: SV.JWT_AUDIENCE, exp: Math.floor(Date.now() / 1000) + 3600 })}.`;
		assert.equal(SV.verifyToken(t), null);
	});
	test("wrong algorithm (HS512 with the right secret)", () => {
		assert.equal(SV.verifyToken(sign(base, undefined, { algorithm: "HS512" })), null);
	});
	test("expired", () => {
		assert.equal(SV.verifyToken(sign(base, undefined, { expiresIn: -10 })), null);
	});
	test("wrong secret", () => {
		assert.equal(SV.verifyToken(sign(base, "another-secret")), null);
	});
	test("the published default secret", () => {
		assert.equal(SV.verifyToken(sign(base, SV.DEFAULT_JWT_SECRET)), null);
	});
	test("wrong audience", () => {
		assert.equal(SV.verifyToken(sign(base, undefined, { audience: "someone-else" })), null);
	});
	test("wrong issuer", () => {
		assert.equal(SV.verifyToken(sign(base, undefined, { issuer: "evil" })), null);
	});
	test("missing audience", () => {
		assert.equal(SV.verifyToken(jwt.sign(base, process.env.JWT_SECRET, { expiresIn: "1h", issuer: SV.JWT_ISSUER })), null);
	});
	test("unknown token type", () => {
		assert.equal(SV.verifyToken(sign({ publicKey: "pk", type: "email-verify" })), null);
	});
	test("no identity claim", () => {
		assert.equal(SV.verifyToken(sign({ type: "signature-auth" })), null);
	});
	test("sub that does not match publicKey", () => {
		assert.equal(SV.verifyToken(sign({ ...base, publicKey: "pk" }, undefined, { subject: "someone-else" })), null);
	});
	test("garbage", () => {
		assert.equal(SV.verifyToken("abc"), null);
		assert.equal(SV.verifyToken(""), null);
	});
});

describe("secret handling", () => {
	test("production refuses a missing or default JWT secret", () => {
		const prev = { s: process.env.JWT_SECRET, e: process.env.NODE_ENV };
		try {
			process.env.NODE_ENV = "production";
			delete process.env.JWT_SECRET;
			assert.throws(() => SV.JWT_SECRET);
			process.env.JWT_SECRET = SV.DEFAULT_JWT_SECRET;
			assert.throws(() => SV.JWT_SECRET);
		} finally {
			process.env.JWT_SECRET = prev.s;
			if (prev.e === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = prev.e;
		}
	});
	test("challenge store refuses to grow past its cap", () => {
		const prev = SV.MAX_PENDING_CHALLENGES;
		SV.challenges.clear();
		SV.MAX_PENDING_CHALLENGES = 3;
		try {
			for (let i = 0; i < 3; i++) assert.ok(SV.generateChallenge("pk"));
			assert.equal(SV.generateChallenge("pk"), null);
		} finally {
			SV.MAX_PENDING_CHALLENGES = prev;
			SV.challenges.clear();
		}
	});
});
