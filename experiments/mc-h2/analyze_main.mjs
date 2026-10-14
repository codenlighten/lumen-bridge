// Applies the frozen scorer and the pre-registered decision table to a raw main file. Not part of the freeze (analysis only).
import fs from "node:fs";
import { readJsonl, analyse, descriptives, parseOutput, setMatchMode, scoreOne, literalMarkers } from "./score.mjs";
const T = Number(process.argv[4]); // fixed from compute_T.mjs on the noise run, written to the lab node before the main run
if (!(T > 0)) throw new Error("usage: node analyze_main.mjs raw/main_1.jsonl results/main_analysis.json <T> [labels_file] [plain|norm]");
const labelsFile = process.argv[5] || "labels.json";
setMatchMode(process.argv[6] || "norm");
const labels = JSON.parse(fs.readFileSync(labelsFile, "utf8"));
const refusals = JSON.parse(fs.readFileSync("refusal_patterns.json", "utf8"));
const lists = JSON.parse(fs.readFileSync("sensitivity_lists.json", "utf8"));
const raw = readJsonl(process.argv[2]);
const rows = raw.map((r) => ({ item: r.item, arm: r.arm, repeat: r.repeat, raw: r.raw }));
const res = analyse(rows, labels, refusals, T);
const desc = descriptives(rows, labels, refusals, lists);
const invalid = raw.filter((r) => !parseOutput(r.arm, r.raw).valid).map((r) => ({ item: r.item, arm: r.arm, repeat: r.repeat, finish: r.finish_reason, head: String(r.raw).slice(0, 120) }));
// Pre-registered sensitivity: drop every (item, repeat) cell where EITHER arm's output is invalid, keep the pairing.
const cell = (arm, item, rep) => rows.find((r) => r.arm === arm && r.item === item && r.repeat === rep);
const validPair = (item, rep) => parseOutput("E", cell("E", item, rep).raw).valid && parseOutput("P", cell("P", item, rep).raw).valid;
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const sensitivity = (() => {
	const perItem = (cls, key, arm) => {
		const res = {};
		for (const item of Object.keys(labels).filter((i) => labels[i].cls === cls && rows.some((r) => r.item === i && r.arm === "E"))) {
			const reps = [1, 2, 3].filter((rep) => validPair(item, rep));
			if (reps.length) res[item] = mean(reps.map((rep) => scoreOne(arm, cell(arm, item, rep).raw, cls, labels[item].terms || [], refusals)[key]));
		}
		return res;
	};
	const rE = perItem("U", "recall", "E"), rP = perItem("U", "recall", "P"), fE = perItem("A", "fa", "E"), fP = perItem("A", "fa", "P");
	const uItems = Object.keys(rE), aItems = Object.keys(fE);
	const cellsU = uItems.reduce((n, i) => n + [1, 2, 3].filter((rep) => validPair(i, rep)).length, 0);
	const cellsA = aItems.reduce((n, i) => n + [1, 2, 3].filter((rep) => validPair(i, rep)).length, 0);
	return {
		rule: "drop every (item, repeat) cell where either E or P output is invalid; item mean over remaining repeats; items with no valid pair dropped",
		U_items: uItems.length, U_cells_kept: cellsU, A_items: aItems.length, A_cells_kept: cellsA,
		recallE: mean(uItems.map((i) => rE[i])), recallP: mean(uItems.map((i) => rP[i])),
		d: mean(uItems.map((i) => rE[i])) - mean(uItems.map((i) => rP[i])),
		FA: mean(aItems.map((i) => fE[i])) - mean(aItems.map((i) => fP[i])),
	};
})();
// Decision constraint (c): a SUPPORTED (1) or REFUTED (5) outcome also needs the same case under the mc-h1 term lists plus normalisation only.
const secondary = (() => {
	const oldLabels = JSON.parse(fs.readFileSync("labels_h1_terms.json", "utf8"));
	const r = analyse(rows, oldLabels, refusals, T);
	return { outcome: r.outcome, d: r.d, FA: r.FA, p: r.test.p };
})();
const caseOf = (o) => (o.match(/^[1-6]/) || [null])[0];
let finalOutcome = res.outcome;
if (["1", "5"].includes(caseOf(res.outcome)) && caseOf(secondary.outcome) !== caseOf(res.outcome)) finalOutcome = "INCONCLUSIVE (matcher-dependent): primary " + res.outcome + " vs old-terms+normalisation " + secondary.outcome;
const literalExampleMarkers = {};
for (const arm of ["E", "P", "N"]) {
	const rs = raw.filter((r) => r.arm === arm);
	const m = rs.map((r) => ({ ...literalMarkers(arm, r.raw), cls: labels[r.item].cls }));
	literalExampleMarkers[arm] = { outputs: rs.length, answer_is_ellipsis: m.filter((x) => x.a).length, gaps_entry_what_is_missing: m.filter((x) => x.b).length, gaps_entry_what_is_missing_on_A: m.filter((x) => x.b && x.cls === "A").length, note: "literal copying only; descriptive; not used for validity or scoring" };
}
const out = { rawFile: process.argv[2], T, result: { arms: res.arms, d: res.d, FA: res.FA, test: res.test, primaryOutcome: res.outcome, outcomeAfterMatcherConstraint: finalOutcome }, secondaryOldTermsNormalisationOnly: secondary, descriptives: desc, pairedInvalidExcludedSensitivity: sensitivity, literalExampleMarkers, invalidByArmAndClass: (() => { const c = {}; for (const r of raw) { if (!parseOutput(r.arm, r.raw).valid) { const k = r.arm + "/" + labels[r.item].cls; c[k] = (c[k] || 0) + 1; } } return c; })(), invalid };
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
