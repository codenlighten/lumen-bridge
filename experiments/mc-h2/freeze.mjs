// Build/verify the manifest: SHA-256 of every frozen file, then the hash of the manifest itself.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
// paths relative to experiments/mc-h1, except E code which lives in the repo root
export const FROZEN = [
	"items.json", "labels.json", "labels_h1_terms.json", "terms_additions.json", "refusal_patterns.json", "sensitivity_lists.json",
	"params.json", "order.json", "build_order.mjs", "apply_terms.mjs", "e_identity.mjs", "e_identity.json", "PREREG-DRAFT.md",
	"compute_T.mjs", "analyze_main.mjs", "flip_audit.mjs", "flip_audit_registered.json", "arms.mjs", "env.mjs", "seed.mjs", "score.mjs", "selftest.test.mjs", "run.mjs",
	"../../structured-json.js", "../../tools/canonical.js",
];
const sha = (f) => crypto.createHash("sha256").update(fs.readFileSync(path.resolve(here, f))).digest("hex");
export function buildManifest() {
	return Object.fromEntries(FROZEN.map((f) => [f, sha(f)]));
}
export const manifestHash = (m) => crypto.createHash("sha256").update(JSON.stringify(m, null, 2) + "\n").digest("hex");
export function verify(expectedHash) {
	const stored = JSON.parse(fs.readFileSync(path.resolve(here, "manifest.json"), "utf8"));
	const now = buildManifest();
	const bad = FROZEN.filter((f) => stored[f] !== now[f]);
	const h = manifestHash(stored);
	return { ok: bad.length === 0 && (!expectedHash || h === expectedHash), bad, manifestHash: h };
}
if (import.meta.url === `file://${process.argv[1]}`) {
	if (process.argv[2] === "verify") {
		const r = verify(process.argv[3]);
		console.log(JSON.stringify(r, null, 2));
		process.exit(r.ok ? 0 : 1);
	}
	const out = path.resolve(here, "manifest.json");
	if (fs.existsSync(out) && process.argv[2] !== "--force-new") {
		console.error("manifest.json exists; a freeze is never overwritten. Use a new directory/name.");
		process.exit(1);
	}
	const m = buildManifest();
	fs.writeFileSync(out, JSON.stringify(m, null, 2) + "\n");
	console.log("manifest written; MANIFEST_SHA256 =", manifestHash(m));
	console.log("E-code diff base: git diff --stat HEAD -- structured-json.js (original at HEAD)");
}
