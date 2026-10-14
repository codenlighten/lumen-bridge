// Noise run analysis + T. By design this prints ONLY: invalid counts/rate, estimated cost, and SDs / T.
// It never prints P2 recall or false-alarm LEVELS (so the noise run cannot preview the answer).
// usage: node compute_T.mjs raw/noise_1.jsonl
import fs from "node:fs";
import { readJsonl, scoreOne, parseOutput, sampleSD } from "./score.mjs";
const labels = JSON.parse(fs.readFileSync("labels.json", "utf8"));
const refusals = JSON.parse(fs.readFileSync("refusal_patterns.json", "utf8"));
const params = JSON.parse(fs.readFileSync("params.json", "utf8"));
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const perRepeatSD = (rows, arm, cls, key) => {
	const vals = [1, 2, 3].map((rep) => {
		const xs = rows.filter((r) => r.arm === arm && r.repeat === rep && labels[r.item].cls === cls).map((r) => scoreOne(arm, r.raw, cls, labels[r.item].terms || [], refusals)[key]);
		return mean(xs);
	});
	return { sd: sampleSD(vals), n: rows.filter((r) => r.arm === arm && labels[r.item].cls === cls).length / 3 };
};
const noise = readJsonl(process.argv[2]);
const invalid = noise.filter((r) => !parseOutput(r.arm, r.raw).valid).length;
const price = params.assumed_price_usd_per_million_tokens;
const cost = noise.reduce((a, r) => a + ((r.usage?.prompt_tokens || 0) * price.input + (r.usage?.completion_tokens || 0) * price.output) / 1e6, 0);
const h1 = readJsonl("../mc-h1/raw/main_1.jsonl");
const sdE = { recall: perRepeatSD(h1, "E", "U", "recall"), falseAlarm: perRepeatSD(h1, "E", "A", "fa") };
const sdP = { recall: perRepeatSD(noise, "P", "U", "recall"), falseAlarm: perRepeatSD(noise, "P", "A", "fa") };
const L = Math.max(sdE.recall.sd, sdE.falseAlarm.sd, sdP.recall.sd, sdP.falseAlarm.sd);
const out = {
	noise_run: { outputs: noise.length, invalid, invalidRate: invalid / noise.length, gateP2_ok: invalid / noise.length <= 0.05, estCostUSD: +cost.toFixed(4), perCallUSD: +(cost / noise.length).toFixed(5) },
	sd: { "recall(E) [mc-h1 main run, mc-h2 scorer]": +sdE.recall.sd.toFixed(4), "falseAlarm(E) [mc-h1 main run, mc-h2 scorer]": +sdE.falseAlarm.sd.toFixed(4), "recall(P2) [noise run]": +sdP.recall.sd.toFixed(4), "falseAlarm(P2) [noise run]": +sdP.falseAlarm.sd.toFixed(4) },
	largestSD: +L.toFixed(4),
	T: +Math.max(0.1, 3 * L).toFixed(4),
	projectedMainRunUSD: +((cost / noise.length) * 540).toFixed(3),
};
console.log(JSON.stringify(out, null, 2));
