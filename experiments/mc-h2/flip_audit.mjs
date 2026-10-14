// One-time audit of the scoring change on mc-h1's raw main-run outputs (both directions, per arm).
// Old = mc-h1 terms + plain matching. New = mc-h2 labels (terms + additions) + normalisation. Run once after the terms are fixed; not used to revise terms.
import fs from "node:fs";
import { readJsonl, scoreOne, setMatchMode } from "./score.mjs";
const oldL = JSON.parse(fs.readFileSync("labels_h1_terms.json", "utf8")), newL = JSON.parse(fs.readFileSync("labels.json", "utf8"));
const refusals = JSON.parse(fs.readFileSync("refusal_patterns.json", "utf8"));
const raw = readJsonl("../mc-h1/raw/main_1.jsonl").filter((r) => r.arm === "E" || r.arm === "P");
const score = (mode, L, r) => { setMatchMode(mode); return scoreOne(r.arm, r.raw, "U", L[r.item].terms || [], refusals).recall; };
const out = {};
for (const arm of ["E", "P"]) {
	const rows = raw.filter((r) => r.arm === arm && newL[r.item].cls === "U");
	const f = { miss_to_hit: [], hit_to_miss: [] };
	for (const r of rows) {
		const o = score("plain", oldL, r), n = score("norm", newL, r);
		if (o === 0 && n === 1) f.miss_to_hit.push(`${r.item}#${r.repeat}`);
		if (o === 1 && n === 0) f.hit_to_miss.push(`${r.item}#${r.repeat}`);
	}
	out[arm] = { miss_to_hit: f.miss_to_hit.length, hit_to_miss: f.hit_to_miss.length, detail: f };
}
setMatchMode("norm");
console.log(JSON.stringify(out, null, 1));
