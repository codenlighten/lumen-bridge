import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import bsv from "@smartledger/bsv";
import { signData } from "../tools/der-signature.js";
import { startTestServer, TEST_ADMIN_KEY } from "./helpers/server.js";

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

describe("agent endpoints require auth", () => {
	test("POST /api/custom-agent without Bearer → 401", async () => {
		const r = await fetch(`${base}/api/custom-agent`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ agentName: "X", userPrompt: "hi" }),
		});
		assert.equal(r.status, 401);
		const body = await r.json();
		assert.equal(body.error.code, "UNAUTHORIZED");
	});

	test("POST /api/agents/register without Bearer → 401", async () => {
		const r = await fetch(`${base}/api/agents/register`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "X", prompt: "p" }),
		});
		assert.equal(r.status, 401);
	});

	test("PUT /api/agents/update without Bearer → 401", async () => {
		const r = await fetch(`${base}/api/agents/update`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ agentName: "X", updates: {} }),
		});
		assert.equal(r.status, 401);
	});

	test("DELETE /api/agents/delete without Bearer → 401", async () => {
		const r = await fetch(`${base}/api/agents/delete`, {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ agentName: "X" }),
		});
		assert.equal(r.status, 401);
	});

	test("POST /api/agents/invoke-user-agent without Bearer → 401", async () => {
		const r = await fetch(`${base}/api/agents/invoke-user-agent`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ agentName: "X", context: {} }),
		});
		assert.equal(r.status, 401);
	});

	test("GET /api/agents/my-agents/:userId without Bearer → 401", async () => {
		const r = await fetch(`${base}/api/agents/my-agents/someone-else`);
		assert.equal(r.status, 401);
	});
});

describe("agent endpoints reject overlong input", () => {
	test("POST /api/agents/search with >4000-char query → 400 VALIDATION_ERROR", async () => {
		const r = await fetch(`${base}/api/agents/search`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ userQuery: "x".repeat(4001) }),
		});
		assert.equal(r.status, 400);
		const body = await r.json();
		assert.equal(body.error.code, "VALIDATION_ERROR");
	});

	test("POST /api/agents/search missing userQuery → 400", async () => {
		const r = await fetch(`${base}/api/agents/search`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});
		assert.equal(r.status, 400);
		const body = await r.json();
		assert.equal(body.error.code, "VALIDATION_ERROR");
	});

	test("POST /api/router missing userPrompt → 400 VALIDATION_ERROR", async () => {
		const r = await fetch(`${base}/api/router`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});
		assert.equal(r.status, 400);
		const body = await r.json();
		assert.equal(body.error.code, "VALIDATION_ERROR");
	});
});

describe("admin endpoints accept X-Admin-Key header", () => {
	test("POST /api/cache/clear without admin key → 403", async () => {
		const r = await fetch(`${base}/api/cache/clear`, { method: "POST" });
		assert.equal(r.status, 403);
		const body = await r.json();
		assert.equal(body.error.code, "FORBIDDEN");
	});

	test("POST /api/cache/clear with X-Admin-Key header → 200", async () => {
		const r = await fetch(`${base}/api/cache/clear`, {
			method: "POST",
			headers: { "X-Admin-Key": TEST_ADMIN_KEY },
		});
		assert.equal(r.status, 200);
	});

	test("GET /api/sessions/all with X-Admin-Key header → 200", async () => {
		const r = await fetch(`${base}/api/sessions/all`, {
			headers: { "X-Admin-Key": TEST_ADMIN_KEY },
		});
		assert.equal(r.status, 200);
	});

	test("legacy ?adminKey= query still works for back-compat", async () => {
		const key = TEST_ADMIN_KEY;
		const r = await fetch(`${base}/api/sessions/all?adminKey=${encodeURIComponent(key)}`);
		assert.equal(r.status, 200);
	});
});
