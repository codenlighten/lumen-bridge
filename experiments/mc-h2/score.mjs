// Mechanical scorer implementing pre-registration v4.2 literally. No model or human judge.
import fs from "node:fs";

export const PLACEHOLDERS = new Set(["", "none", "n/a", "na", "nothing", "null", "-", "no missing context"]);
const norm = (s) => s.trim().replace(/\s+/g, " ").toLowerCase();

// Matching normalisation (mc-h2): split camelCase boundaries, turn "_" and "-" into spaces, casefold, collapse whitespace.
// Applied identically to gap entries and terms. Placeholders still use plain norm(). mode "plain" reproduces mc-h1 matching.
let MATCH_MODE = "norm";
export function setMatchMode(m) {
	if (m !== "norm" && m !== "plain") throw new Error("match mode must be norm or plain");
	MATCH_MODE = m;
}
export const normMatch = (s) =>
	MATCH_MODE === "plain"
		? norm(s)
		: s
				.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
				.replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
				.replace(/[_-]/g, " ")
				.trim()
				.replace(/\s+/g, " ")
				.toLowerCase();

const E_REQ = { response: "string", includesCode: "boolean", code: "string", continue: "boolean", questionForUser: "boolean" };

/** Returns {valid, answer, gaps(raw entries array)} or {valid:false}. */
export function parseOutput(arm, raw) {
	let o;
	try {
		o = JSON.parse(raw);
	} catch {
		return { valid: false };
	}
	if (o === null || typeof o !== "object" || Array.isArray(o)) return { valid: false };
	let answer, gapField;
	if (arm === "E") {
		for (const [k, t] of Object.entries(E_REQ)) if (typeof o[k] !== t) return { valid: false };
		if (!("missingContext" in o)) return { valid: false };
		answer = o.response;
		gapField = o.missingContext;
	} else if (arm === "P") {
		if (typeof o.answer !== "string" || !("gaps" in o)) return { valid: false };
		answer = o.answer;
		gapField = o.gaps;
	} else if (arm === "N") {
		if (typeof o.answer !== "string") return { valid: false };
		return { valid: true, answer: o.answer, gaps: [] };
	} else throw new Error(`unknown arm ${arm}`);
	let entries;
	if (typeof gapField === "string") entries = [gapField];
	else if (Array.isArray(gapField)) entries = gapField;
	else return { valid: false };
	if (entries.some((e) => typeof e !== "string")) return { valid: false };
	return { valid: true, answer, gaps: entries };
}

export function cleanGaps(entries) {
	// keep case/shape for matching; placeholders are judged on the plain-normalised form
	return entries.map((e) => e.trim().replace(/\s+/g, " ")).filter((e) => !PLACEHOLDERS.has(e.toLowerCase()));
}

export function isHit(cleaned, terms) {
	if (cleaned.length === 0 || cleaned.length > 3) return false;
	const ts = terms.map(normMatch);
	return cleaned.map(normMatch).some((e) => ts.some((t) => t && e.includes(t)));
}

export function isNonAnswer(answer, refusals) {
	const a = norm(answer);
	return a === "" || refusals.map(norm).some((r) => a.includes(r));
}

/** Score one raw output. cls = "A" | "U". */
export function scoreOne(arm, raw, cls, terms, refusals) {
	const p = parseOutput(arm, raw);
	if (!p.valid) return { invalid: true, recall: cls === "U" ? 0 : null, fa: cls === "A" ? 1 : null, aa: cls === "U" ? 0 : null, len: null };
	const cleaned = cleanGaps(p.gaps);
	const out = { invalid: false, len: cleaned.length };
	if (cls === "U") {
		out.recall = arm === "N" ? null : isHit(cleaned, terms) ? 1 : 0;
		out.aa = !isNonAnswer(p.answer, refusals) && cleaned.length === 0 ? 1 : 0;
		out.fa = null;
	} else {
		out.fa = arm === "N" ? null : cleaned.length > 0 ? 1 : 0;
		out.recall = null;
		out.aa = null;
	}
	return out;
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
export const sampleSD = (xs) => {
	if (xs.length < 2) return 0;
	const m = mean(xs);
	return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
};

/**
 * rows: [{item, arm, repeat, raw}], labels: {item:{cls, terms}}.
 * Returns per-item means and arm-level summaries.
 */
export function scoreRun(rows, labels, refusals) {
	const per = {}; // arm -> item -> {recall:[],fa:[],aa:[],len:[],invalid:n}
	const counts = {}; // arm -> {total, invalid}
	for (const r of rows) {
		const lab = labels[r.item];
		const s = scoreOne(r.arm, r.raw, lab.cls, lab.terms || [], refusals);
		((per[r.arm] ??= {})[r.item] ??= { recall: [], fa: [], aa: [], len: [], byRepeat: {} });
		const cell = per[r.arm][r.item];
		for (const k of ["recall", "fa", "aa", "len"]) if (s[k] !== null && s[k] !== undefined) cell[k].push(s[k]);
		cell.byRepeat[r.repeat] = s;
		const c = (counts[r.arm] ??= { total: 0, invalid: 0 });
		c.total++;
		if (s.invalid) c.invalid++;
	}
	const itemMean = (arm, item, k) => {
		const v = per[arm]?.[item]?.[k];
		return v && v.length ? mean(v) : null;
	};
	const arms = {};
	for (const arm of Object.keys(per)) {
		const U = Object.keys(labels).filter((i) => labels[i].cls === "U" && per[arm][i]);
		const A = Object.keys(labels).filter((i) => labels[i].cls === "A" && per[arm][i]);
		const m = (ids, k) => {
			const xs = ids.map((i) => itemMean(arm, i, k)).filter((x) => x !== null);
			return xs.length ? mean(xs) : null;
		};
		arms[arm] = {
			recall: m(U, "recall"),
			falseAlarm: m(A, "fa"),
			answeredAnyway: m(U, "aa"),
			meanListLen: m(Object.keys(per[arm]), "len"),
			invalid: counts[arm].invalid,
			total: counts[arm].total,
			invalidRate: counts[arm].invalid / counts[arm].total,
			armInvalid: counts[arm].invalid / counts[arm].total > 0.05,
		};
	}
	return { per, arms, itemMean };
}

/** Pilot noise: SD across repeats of the arm-level metric, max over recall/FA of E and P. */
export function pilotT(rows, labels, refusals) {
	const reps = [...new Set(rows.map((r) => r.repeat))].sort();
	const sd = {};
	for (const arm of ["E", "P"]) {
		for (const [metric, cls, key] of [["recall", "U", "recall"], ["falseAlarm", "A", "fa"]]) {
			const vals = reps.map((rep) => {
				const xs = [];
				const items = new Set(rows.filter((r) => r.arm === arm).map((r) => r.item));
				for (const item of items) {
					if (labels[item].cls !== cls) continue;
					const r = rows.find((q) => q.arm === arm && q.item === item && q.repeat === rep);
					if (r) xs.push(scoreOne(arm, r.raw, cls, labels[item].terms || [], refusals)[key]);
				}
				return mean(xs);
			});
			sd[`${metric}(${arm})`] = { values: vals, sd: sampleSD(vals) };
		}
	}
	const largest = Math.max(...Object.values(sd).map((x) => x.sd));
	const setBy = Object.entries(sd).filter(([, x]) => x.sd === largest).map(([k]) => k);
	return { sd, largest, setBy, T: Math.max(0.1, 3 * largest) };
}

/** Exact one-sided sign-flip p-values by DP over integer sums. diffs are integers (x3 scale). */
export function signFlip(diffs) {
	const nz = diffs.filter((d) => d !== 0);
	const m = nz.length;
	const obs = nz.reduce((a, b) => a + b, 0); // zeros contribute 0
	let dist = new Map([[0, 1]]);
	for (const d of nz) {
		const a = Math.abs(d);
		const nxt = new Map();
		for (const [s, c] of dist) {
			nxt.set(s + a, (nxt.get(s + a) || 0) + c);
			nxt.set(s - a, (nxt.get(s - a) || 0) + c);
		}
		dist = nxt;
	}
	let ge = 0, le = 0;
	for (const [s, c] of dist) {
		if (s >= obs) ge += c;
		if (s <= obs) le += c;
	}
	const total = 2 ** m;
	return { m, observedSum: obs, p: ge / total, pOpp: le / total, floor: 1 / total };
}

export function decide({ d, T, p, pOpp, FA }) {
	const eps = 1e-12;
	if (d >= T - eps) {
		if (p <= 0.05) return FA <= 0.1 + eps ? "1 SUPPORTED" : "2 MIXED";
		return "3 INCONCLUSIVE";
	}
	if (Math.abs(d) < T - eps) return p <= 0.05 ? "4 NO DETECTABLE DIFFERENCE (small but real flagged)" : "4 NO DETECTABLE DIFFERENCE";
	return pOpp <= 0.05 ? "5 REFUTED (X)" : "6 INCONCLUSIVE";
}


/**
 * Descriptive analyses (outside the decision table; lists frozen in sensitivity_lists.json):
 * per-domain recall/false alarm, recall without weak/echo pairs, recall on cued pairs,
 * uncapped recall (the >3-entries cap ignored), invalid counts, mean list length.
 */
export function descriptives(rows, labels, refusals, lists) {
	const pairOf = (id) => id.replace(/-[AU]$/, "");
	const domainOf = (id) => id.split("-")[0];
	const rowsFor = (arm, pred) => rows.filter((r) => r.arm === arm && pred(r.item));
	const metric = (arm, cls, key, pred) => {
		const per = {};
		for (const r of rowsFor(arm, (i) => labels[i].cls === cls && pred(i))) {
			const s = scoreOne(arm, r.raw, cls, labels[r.item].terms || [], refusals);
			if (s[key] !== null && s[key] !== undefined) (per[r.item] ??= []).push(s[key]);
		}
		const xs = Object.values(per).map(mean);
		return xs.length ? mean(xs) : null;
	};
	const uncapped = (arm, pred) => {
		const per = {};
		for (const r of rowsFor(arm, (i) => labels[i].cls === "U" && pred(i))) {
			const p = parseOutput(arm, r.raw);
			const hit = p.valid && (() => {
				const c = cleanGaps(p.gaps);
				const ts = (labels[r.item].terms || []).map(normMatch);
				return c.map(normMatch).some((e) => ts.some((t) => t && e.includes(t)));
			})();
			(per[r.item] ??= []).push(hit ? 1 : 0);
		}
		const xs = Object.values(per).map(mean);
		return xs.length ? mean(xs) : null;
	};
	const all = () => true;
	const weak = new Set(lists.weak_default_can_pass_as_answer), cued = new Set(lists.cued_missing_fact_named_in_both_members), echo = new Set(lists.echo_terms_term_appears_in_the_u_prompt);
	const out = {};
	for (const arm of ["E", "P"]) {
		out[arm] = {
			recall_uncapped: uncapped(arm, all),
			recall_without_weak: metric(arm, "U", "recall", (i) => !weak.has(pairOf(i))),
			recall_without_echo: metric(arm, "U", "recall", (i) => !echo.has(pairOf(i))),
			recall_on_cued_only: metric(arm, "U", "recall", (i) => cued.has(pairOf(i))),
			falseAlarm_without_weak: metric(arm, "A", "fa", (i) => !weak.has(pairOf(i))),
			byDomain: Object.fromEntries(["deploy", "data", "code"].map((d) => [d, {
				recall: metric(arm, "U", "recall", (i) => domainOf(i) === d),
				falseAlarm: metric(arm, "A", "fa", (i) => domainOf(i) === d),
			}])),
		};
	}
	out.N = { answeredAnyway: metric("N", "U", "aa", all) };
	return out;
}

/**
 * Descriptive literal-example markers (never used for validity or scoring): (a) answer, trimmed, equals "...";
 * (b) a gaps entry equals "what is missing" as a whole entry, case-insensitive. Literal copying only, not paraphrased echoes.
 */
export function literalMarkers(arm, raw) {
	const p = parseOutput(arm, raw);
	if (!p.valid) return { a: false, b: false };
	return {
		a: p.answer.trim() === "...",
		b: p.gaps.some((e) => e.trim().toLowerCase() === "what is missing"),
	};
}

export function readJsonl(file) {
	return fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

/** Full main-run analysis. */
export function analyse(rows, labels, refusals, T) {
	const { per, arms, itemMean } = scoreRun(rows, labels, refusals);
	const Uitems = Object.keys(labels).filter((i) => labels[i].cls === "U");
	const diffs = Uitems.map((i) => Math.round(3 * (itemMean("E", i, "recall") - itemMean("P", i, "recall"))));
	const test = signFlip(diffs);
	const d = arms.E.recall - arms.P.recall;
	const FA = arms.E.falseAlarm - arms.P.falseAlarm;
	const outcome = arms.E.armInvalid || arms.P.armInvalid ? "INVALID ARM: comparison invalid" : decide({ d, T, p: test.p, pOpp: test.pOpp, FA });
	return { arms, d, FA, T, test, outcome, diffs };
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const [, , dir, rawFile, T] = process.argv;
	const labels = JSON.parse(fs.readFileSync(`${dir}/labels.json`, "utf8"));
	const refusals = JSON.parse(fs.readFileSync(`${dir}/refusal_patterns.json`, "utf8"));
	const rows = readJsonl(rawFile);
	const res = T === "pilot" ? pilotT(rows, labels, refusals) : analyse(rows, labels, refusals, Number(T));
	console.log(JSON.stringify(res, null, 2));
}
