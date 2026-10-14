import { test, describe } from "node:test";
import assert from "node:assert/strict";
import bsv from "@smartledger/bsv";
import { canonicalize } from "../tools/canonical.js";
import { getAddressFromPublicKey, signData } from "../tools/der-signature.js";
import {
	signResponseBody,
	signedPayloadHash,
	verifyResponseSignature,
} from "../structured-json.js";

const schema = { type: "object", properties: { response: { type: "string" } } };
const body = { response: "ok", includesCode: false, code: "", missingContext: [] };

function agent() {
	const pk = bsv.PrivateKey.fromRandom();
	return { privateKey: pk.toWIF(), publicKey: pk.toPublicKey().toString(), agentName: "t" };
}

async function signed(b = body, key = agent(), extra = {}) {
	const sig = await signResponseBody(b, {
		mergedSchema: schema,
		query: "q",
		context: null,
		agentKey: key,
		...extra,
	});
	return { ...b, _signature: sig, _llm: { model: "m" } };
}

describe("canonicalize", () => {
	test("key order does not change the output", () => {
		assert.equal(canonicalize({ b: 1, a: { d: 2, c: 3 } }), canonicalize({ a: { c: 3, d: 2 }, b: 1 }));
	});
	test("rejects non-finite numbers instead of emitting null", () => {
		assert.throws(() => canonicalize({ a: NaN }));
		assert.throws(() => canonicalize({ a: Infinity }));
	});
	test("rejects non-plain objects such as Date", () => {
		assert.throws(() => canonicalize({ d: new Date() }));
	});
	test("undefined fields are dropped, arrays keep order", () => {
		assert.equal(canonicalize({ a: undefined, b: [2, 1] }), '{"b":[2,1]}');
	});
});

describe("response signatures (v2) — must pass", () => {
	test("genuine response verifies against its pinned key; key order is irrelevant", async () => {
		const key = agent();
		const r = await signed(body, key);
		const opts = { trustedPublicKeys: [key.publicKey] };
		assert.equal((await verifyResponseSignature(r, opts)).verified, true);
		const { response, code, ...rest } = r;
		assert.equal((await verifyResponseSignature({ code, response, ...rest }, opts)).verified, true);
	});
	test("expected schema/query hashes and a fresh timestamp are accepted", async () => {
		const key = agent();
		const r = await signed(body, key);
		const v = await verifyResponseSignature(r, {
			trustedPublicKeys: [key.publicKey],
			expectedSchemaHash: r._signature.schemaHash,
			expectedQueryHash: r._signature.queryHash,
			maxAgeMs: 60_000,
		});
		assert.equal(v.verified, true);
	});
	test("pinned to the right key verifies", async () => {
		const key = agent();
		const r = await signed(body, key);
		const v = await verifyResponseSignature(r, { trustedPublicKeys: [key.publicKey] });
		assert.equal(v.verified, true);
		assert.equal(v.trusted, true);
	});
});

describe("response signatures (v2) — must fail", () => {
	test("a response signed by an untrusted key is not verified when keys are pinned", async () => {
		const trusted = agent();
		const attacker = agent();
		const forged = await signed(body, attacker);
		const v = await verifyResponseSignature(forged, { trustedPublicKeys: [trusted.publicKey] });
		assert.equal(v.verified, false);
		assert.equal(v.signatureValid, true);
		assert.equal(v.trusted, false);
	});
	test("tampering with each signed field fails", async () => {
		const r = await signed();
		const cases = {
			body: { ...r, response: "changed" },
			extraField: { ...r, extra: 1 },
			timestamp: { ...r, _signature: { ...r._signature, timestamp: "1999-01-01T00:00:00.000Z" } },
			schemaHash: { ...r, _signature: { ...r._signature, schemaHash: "0".repeat(64) } },
			queryHash: { ...r, _signature: { ...r._signature, queryHash: "0".repeat(64) } },
			address: { ...r, _signature: { ...r._signature, address: getAddressFromPublicKey(agent().publicKey) } },
			publicKey: { ...r, _signature: { ...r._signature, publicKey: agent().publicKey } },
			version: { ...r, _signature: { ...r._signature, version: 3 } },
			algorithm: { ...r, _signature: { ...r._signature, algorithm: "none" } },
			garbageSig: { ...r, _signature: { ...r._signature, signature: "00" } },
		};
		for (const [name, resp] of Object.entries(cases)) {
			assert.equal((await verifyResponseSignature(resp)).verified, false, `${name} must not verify`);
		}
	});
	test("a self-consistent address that does not belong to the key is rejected", async () => {
		const r = await signed();
		const bad = { ...r, _signature: { ...r._signature, address: getAddressFromPublicKey(agent().publicKey) } };
		const v = await verifyResponseSignature(bad);
		assert.equal(v.verified, false);
	});
	test("a properly signed payload that names someone else's address is rejected", async () => {
		const key = agent();
		const r = await signed(body, key);
		const lie = getAddressFromPublicKey(agent().publicKey);
		const meta = { ...r._signature, address: lie };
		const responseHash = signedPayloadHash(body, meta);
		const forged = {
			...body,
			_signature: { ...meta, responseHash, signature: signData(responseHash, key.privateKey) },
		};
		const v = await verifyResponseSignature(forged);
		assert.equal(v.verified, false);
		assert.match(v.error, /Address does not match/);
	});
	test("without a pinned key nothing is 'verified', only signatureValid", async () => {
		const v = await verifyResponseSignature(await signed());
		assert.equal(v.signatureValid, true);
		assert.equal(v.verified, false);
	});
	test("wrong expected schema, wrong expected input and stale timestamps are rejected", async () => {
		const key = agent();
		const r = await signed(body, key);
		const pin = { trustedPublicKeys: [key.publicKey] };
		assert.equal((await verifyResponseSignature(r, { ...pin, expectedSchemaHash: "0".repeat(64) })).verified, false);
		assert.equal((await verifyResponseSignature(r, { ...pin, expectedQueryHash: "0".repeat(64) })).verified, false);
		const old = await signed(body, key, {});
		old._signature = { ...old._signature, timestamp: new Date(Date.now() - 3600_000).toISOString() };
		assert.equal((await verifyResponseSignature(old, { ...pin, maxAgeMs: 60_000 })).verified, false);
	});
	test("missing signature is not verified", async () => {
		assert.equal((await verifyResponseSignature(body)).verified, false);
		assert.equal((await verifyResponseSignature(null)).verified, false);
	});
	test("unsigned fields (_llm, agentIdentity) are documented as unsigned", async () => {
		const key = agent();
		const r = await signed(body, key);
		const v = await verifyResponseSignature({ ...r, _llm: { model: "other" }, _signature: { ...r._signature, agentIdentity: "x" } }, { trustedPublicKeys: [key.publicKey] });
		assert.equal(v.verified, true);
	});
});

describe("legacy (v1) responses", () => {
	test("legacy hash-only signature is rejected by default and flagged version 1 when allowed", async () => {
		const { signData } = await import("../tools/der-signature.js");
		const crypto = await import("node:crypto");
		const key = agent();
		const h = crypto.createHash("sha256").update(JSON.stringify(body)).digest("hex");
		const legacy = {
			...body,
			_signature: { signature: signData(h, key.privateKey), responseHash: h, publicKey: key.publicKey, algorithm: "BSV-ECDSA-DER" },
		};
		assert.equal((await verifyResponseSignature(legacy, { trustedPublicKeys: [key.publicKey] })).verified, false);
		const opts = { trustedPublicKeys: [key.publicKey], allowLegacy: true };
		const v = await verifyResponseSignature(legacy, opts);
		assert.equal(v.verified, true);
		assert.equal(v.version, 1);
		legacy.response = "changed";
		assert.equal((await verifyResponseSignature(legacy, opts)).verified, false);
	});
});

describe("key hygiene", () => {
	test("generateKeys does not print private keys unless asked", async () => {
		const { generateKeys } = await import("../tools/generate-keys.js");
		const logs = [];
		const orig = console.log;
		console.log = (...a) => logs.push(a.join(" "));
		try {
			const k = generateKeys();
			assert.ok(k.privateKey);
			assert.equal(logs.length, 0);
			generateKeys({ log: true });
			assert.ok(logs.some((l) => l.includes("Private Key")));
		} finally {
			console.log = orig;
		}
	});
});
