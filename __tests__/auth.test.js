import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import bsv from "smartledger-bsv";
import { signData } from "../tools/der-signature.js";
import { startTestServer } from "./helpers/server.js";

let server;
let base;

before(async () => {
	server = await startTestServer({ port: 3091 });
	base = server.url;
});

after(async () => {
	if (server) await server.stop();
});

describe("auth contract", () => {
	test("GET unknown route → 404 with structured error", async () => {
		const r = await fetch(`${base}/api/does-not-exist`);
		assert.equal(r.status, 404);
		const body = await r.json();
		assert.equal(body.success, false);
		assert.equal(body.error.code, "NOT_FOUND");
	});

	test("protected route without Bearer → 401", async () => {
		const r = await fetch(`${base}/api/meta/create-agent`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ prompt: "x" }),
		});
		assert.equal(r.status, 401);
		const body = await r.json();
		assert.equal(body.error.code, "UNAUTHORIZED");
	});

	test("protected route with garbage Bearer → 401", async () => {
		const r = await fetch(`${base}/api/meta/create-agent`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: "Bearer tampered.token.value",
			},
			body: JSON.stringify({ prompt: "x" }),
		});
		assert.equal(r.status, 401);
	});

	test("challenge → verify → protected route reaches handler (400 not 401)", async () => {
		const pk = bsv.PrivateKey.fromRandom();
		const publicKey = pk.publicKey.toString();

		// 1. challenge
		let r = await fetch(`${base}/api/auth/challenge`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ publicKey }),
		});
		assert.equal(r.status, 200);
		const c = await r.json();
		assert.ok(c.challenge);

		// 2. sign + verify
		const signature = signData(c.challenge, pk.toWIF());
		r = await fetch(`${base}/api/auth/verify`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				challenge: c.challenge,
				signature,
				publicKey,
			}),
		});
		assert.equal(r.status, 200);
		const v = await r.json();
		assert.ok(v.token, "JWT must be issued");

		// 3. hit protected route — empty prompt yields 400 (validation), proving auth passed
		r = await fetch(`${base}/api/meta/create-agent`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${v.token}`,
			},
			body: JSON.stringify({ prompt: "" }),
		});
		assert.equal(r.status, 400);
	});

	test("verify with invalid signature → 401", async () => {
		const pk = bsv.PrivateKey.fromRandom();
		const publicKey = pk.publicKey.toString();
		const r1 = await fetch(`${base}/api/auth/challenge`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ publicKey }),
		});
		const c = await r1.json();
		const r2 = await fetch(`${base}/api/auth/verify`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				challenge: c.challenge,
				signature: "30440220" + "00".repeat(34),
				publicKey,
			}),
		});
		assert.equal(r2.status, 401);
	});
});

describe("hardening", () => {
	test("helmet headers present", async () => {
		const r = await fetch(`${base}/api/cache/stats`);
		assert.equal(r.headers.get("x-content-type-options"), "nosniff");
		assert.match(
			r.headers.get("strict-transport-security") || "",
			/max-age=/
		);
		assert.ok(r.headers.get("x-frame-options"));
	});

	test("oversized body → 413", async () => {
		const big = "x".repeat(300_000);
		const r = await fetch(`${base}/api/auth/challenge`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ publicKey: big }),
		});
		assert.equal(r.status, 413);
	});

	test("missing publicKey on challenge → 400", async () => {
		const r = await fetch(`${base}/api/auth/challenge`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});
		assert.equal(r.status, 400);
	});

	test("rate limit headers present on auth route", async () => {
		const r = await fetch(`${base}/api/auth/challenge`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ publicKey: "deadbeef" }),
		});
		// express-rate-limit standardHeaders = true → RateLimit-* headers
		assert.ok(
			r.headers.get("ratelimit-limit") || r.headers.get("ratelimit"),
			"expected RateLimit-Limit header"
		);
	});
});

describe("ajv validation", () => {
	test("challenge with wrong type → 400 VALIDATION_ERROR", async () => {
		const r = await fetch(`${base}/api/auth/challenge`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ publicKey: 12345 }),
		});
		assert.equal(r.status, 400);
		const body = await r.json();
		assert.equal(body.error.code, "VALIDATION_ERROR");
		assert.ok(Array.isArray(body.error.details));
	});

	test("verify missing fields → 400 VALIDATION_ERROR", async () => {
		const r = await fetch(`${base}/api/auth/verify`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ challenge: "abc" }),
		});
		assert.equal(r.status, 400);
		const body = await r.json();
		assert.equal(body.error.code, "VALIDATION_ERROR");
	});

	test("register with short password → 400 VALIDATION_ERROR (not a leak)", async () => {
		const r = await fetch(`${base}/api/users/register`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				email: "x@y.com",
				publicKey: "0".repeat(66),
				password: "short",
			}),
		});
		assert.equal(r.status, 400);
		const body = await r.json();
		assert.equal(body.error.code, "VALIDATION_ERROR");
	});
});
