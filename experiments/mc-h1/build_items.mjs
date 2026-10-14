// items_draft.json (pairs) -> items.json (prompts only, what the runner sees), labels.json (private labels),
// order.json (seeded shuffle of every call), blind_for_polymath.json + blind_key.json (seeded sample of 12 pairs).
import fs from "node:fs";
import { shuffle } from "./seed.mjs";
const params = JSON.parse(fs.readFileSync("params.json", "utf8"));
const pairs = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const items = [], labels = {};
for (const p of pairs) {
	for (const cls of ["A", "U"]) {
		const id = `${p.pair_id}-${cls}`;
		const para = cls === "A" ? p.paragraph_with_F : p.paragraph_without_F;
		items.push({ id, pair_id: p.pair_id, domain: p.domain, split: p.split, prompt: `${para}\n\n${p.question}` });
		labels[id] = { cls, pair_id: p.pair_id, F_label: p.F_label, F_value: p.F_value, terms: cls === "U" ? p.terms.map((t) => t.toLowerCase()) : [] };
	}
}
// call order: every (item, arm, repeat), one fixed seeded shuffle
const calls = [];
for (const it of items) for (const arm of ["E", "P", "N"]) for (let repeat = 1; repeat <= params.repeats; repeat++) calls.push({ item: it.id, arm, repeat });
const order = shuffle(calls, params.order_seed).map((c, seq) => ({ ...c, seq }));
// blind sample: 12 distinct pairs, one member each
const pairIds = pairs.map((p) => p.pair_id);
const chosen = shuffle(pairIds, params.blind_sample_seed).slice(0, 12);
const pick = chosen.map((pid, i) => ({ pid, cls: shuffle(["A", "U"], params.blind_sample_seed + i + 1)[0] }));
const blind = shuffle(pick.map((x) => `${x.pid}-${x.cls}`), params.blind_sample_seed + 99);
// round 2 (added after the round-1 labels): re-label the reworded data-03 member, and draw 2 more MAIN pairs
// (round 1 drew from all 36 pairs and included 2 pilot items, but only main items should count).
const mainIds = pairs.filter((p) => p.split === "main").map((p) => p.pair_id);
const round1Pairs = new Set(chosen);
const extra = shuffle(mainIds.filter((id) => !round1Pairs.has(id)), params.blind_sample_seed_round2).slice(0, 2);
const r2 = [`data-03-U`, ...extra.map((pid, i) => `${pid}-${shuffle(["A", "U"], params.blind_sample_seed_round2 + i + 1)[0]}`)];
const blind2 = shuffle(r2, params.blind_sample_seed_round2 + 99);
fs.writeFileSync("blind2_for_polymath.json", JSON.stringify(blind2.map((id, k) => ({ blind_id: `c${String(k + 1).padStart(2, "0")}`, prompt: items.find((i) => i.id === id).prompt })), null, 1));
fs.writeFileSync("blind2_key.json", JSON.stringify(blind2.map((id, k) => ({ blind_id: `c${String(k + 1).padStart(2, "0")}`, item: id, cls: labels[id].cls })), null, 1));
// round 3: one more MAIN pair, excluding round-1 and round-2 pairs and every pair the labeller has already seen
const seen = new Set([...round1Pairs, ...extra, ...params.blind_contaminated_pairs_polymath]);
const extra3 = shuffle(mainIds.filter((id) => !seen.has(id)), params.blind_sample_seed_round3).slice(0, 1);
const r3 = extra3.map((pid) => `${pid}-${shuffle(["A", "U"], params.blind_sample_seed_round3 + 1)[0]}`);
fs.writeFileSync("blind3_for_polymath.json", JSON.stringify(r3.map((id, k) => ({ blind_id: `d${String(k + 1).padStart(2, "0")}`, prompt: items.find((i) => i.id === id).prompt })), null, 1));
fs.writeFileSync("blind3_key.json", JSON.stringify(r3.map((id, k) => ({ blind_id: `d${String(k + 1).padStart(2, "0")}`, item: id, cls: labels[id].cls })), null, 1));
// round 4: after the Critic review, relabel every pair whose text changed (one member each, seeded)
const r4 = params.blind_relabel_pairs_round4.map((pid, i) => `${pid}-${shuffle(["A", "U"], params.blind_sample_seed_round4 + i + 1)[0]}`);
const blind4 = shuffle(r4, params.blind_sample_seed_round4 + 99);
fs.writeFileSync("blind4_for_polymath.json", JSON.stringify(blind4.map((id, k) => ({ blind_id: `e${String(k + 1).padStart(2, "0")}`, prompt: items.find((i) => i.id === id).prompt })), null, 1));
fs.writeFileSync("blind4_key.json", JSON.stringify(blind4.map((id, k) => ({ blind_id: `e${String(k + 1).padStart(2, "0")}`, item: id, cls: labels[id].cls })), null, 1));
// round 5: pairs reworded again after the Critic's v3 re-check (one member each, seeded)
const r5 = params.blind_relabel_pairs_round5.map((pid, i) => `${pid}-${shuffle(["A", "U"], params.blind_sample_seed_round5 + i + 1)[0]}`);
const blind5 = shuffle(r5, params.blind_sample_seed_round5 + 99);
fs.writeFileSync("blind5_for_polymath.json", JSON.stringify(blind5.map((id, k) => ({ blind_id: `f${String(k + 1).padStart(2, "0")}`, prompt: items.find((i) => i.id === id).prompt })), null, 1));
fs.writeFileSync("blind5_key.json", JSON.stringify(blind5.map((id, k) => ({ blind_id: `f${String(k + 1).padStart(2, "0")}`, item: id, cls: labels[id].cls })), null, 1));
fs.writeFileSync("items.json", JSON.stringify(items, null, 1));
fs.writeFileSync("labels.json", JSON.stringify(labels, null, 1));
fs.writeFileSync("order.json", JSON.stringify(order));
fs.writeFileSync("blind_for_polymath.json", JSON.stringify(blind.map((id, k) => ({ blind_id: `b${String(k + 1).padStart(2, "0")}`, prompt: items.find((i) => i.id === id).prompt })), null, 1));
fs.writeFileSync("blind_key.json", JSON.stringify(blind.map((id, k) => ({ blind_id: `b${String(k + 1).padStart(2, "0")}`, item: id, cls: labels[id].cls })), null, 1));
console.log(`items=${items.length} calls=${calls.length} main_calls=${order.filter((c) => items.find((i) => i.id === c.item).split === "main").length} blind=${blind.length}`);
