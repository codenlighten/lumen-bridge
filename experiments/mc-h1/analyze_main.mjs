// Applies the frozen scorer and the pre-registered decision table to a raw main file. Not part of the freeze (analysis only).
import fs from "node:fs";
import { readJsonl, analyse, descriptives, parseOutput } from "./score.mjs";
const T = 0.5773502691896257; // fixed from the pilot, confirmed by two independent scorers
const labels = JSON.parse(fs.readFileSync("labels.json", "utf8"));
const refusals = JSON.parse(fs.readFileSync("refusal_patterns.json", "utf8"));
const lists = JSON.parse(fs.readFileSync("sensitivity_lists.json", "utf8"));
const raw = readJsonl(process.argv[2]);
const rows = raw.map((r) => ({ item: r.item, arm: r.arm, repeat: r.repeat, raw: r.raw }));
const res = analyse(rows, labels, refusals, T);
const desc = descriptives(rows, labels, refusals, lists);
const invalid = raw.filter((r) => !parseOutput(r.arm, r.raw).valid).map((r) => ({ item: r.item, arm: r.arm, repeat: r.repeat, finish: r.finish_reason, head: String(r.raw).slice(0, 120) }));
const out = { rawFile: process.argv[2], T, result: { arms: res.arms, d: res.d, FA: res.FA, test: res.test, outcome: res.outcome }, descriptives: desc, invalid };
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
