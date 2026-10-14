// Dry-run of the scorer on synthetic outputs. Each check has a case built to fail it.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { literalMarkers, setMatchMode, normMatch, scoreOne, parseOutput, cleanGaps, isHit, signFlip, decide, sampleSD, scoreRun, pilotT, analyse, descriptives } from "./score.mjs";
import { shuffle } from "./seed.mjs";

const REF = ["i cannot answer", "not enough information"];
const TERMS = ["port number", "which port"];
const E = (o) => JSON.stringify({ response: "x", includesCode: false, code: "", continue: false, questionForUser: false, missingContext: [], ...o });
const P = (o) => JSON.stringify({ answer: "x", gaps: [], ...o });

describe("parsing and validity", () => {
	test("invalid JSON is invalid", () => assert.equal(parseOutput("E", "not json").valid, false));
	test("missing required key (E: no missingContext)", () => {
		const o = JSON.parse(E({})); delete o.missingContext;
		assert.equal(parseOutput("E", JSON.stringify(o)).valid, false);
	});
	test("wrong type (E: includesCode string)", () => assert.equal(parseOutput("E", E({ includesCode: "no" })).valid, false));
	test("non-string gap entry is invalid", () => assert.equal(parseOutput("P", P({ gaps: ["a", 3] })).valid, false));
	test("gap field of wrong type (number) is invalid", () => assert.equal(parseOutput("P", P({ gaps: 5 })).valid, false));
	test("single-string gap field is one entry", () => assert.deepEqual(parseOutput("P", P({ gaps: "which port" })).gaps, ["which port"]));
	test("empty-string gap entries are placeholders, not invalid", () => assert.equal(parseOutput("P", P({ gaps: [""] })).valid, true));
	test("top-level array is invalid", () => assert.equal(parseOutput("P", "[]").valid, false));
});

describe("placeholders and matching", () => {
	test("placeholders dropped, case/space-insensitive", () =>
		assert.deepEqual(cleanGaps(["None", "  N/A ", "NO  missing   context", "-", "", "nothing", "null", "na"]), []));
	test("punctuated placeholder is NOT dropped (exact match rule)", () => assert.deepEqual(cleanGaps(["none."]), ["none."]));
	test("hit on plain casefolded substring", () => assert.equal(isHit(["Which   PORT does it use?"], TERMS), true));
	test("generic vague gap does not hit", () => assert.equal(isHit(["more details", "configuration"], TERMS), false));
	test("more than 3 entries is a miss even if one names F", () =>
		assert.equal(isHit(["a b", "c d", "e f", "which port"], TERMS), false));
	test("exactly 3 entries with a hit counts", () => assert.equal(isHit(["a b", "c d", "which port"], TERMS), true));
	test("empty list is not a hit", () => assert.equal(isHit([], TERMS), false));
	test("substring trap: term 'age' would match 'page' (documented risk)", () => assert.equal(isHit(["the page"], ["age"]), true));
});

describe("per-output scoring", () => {
	test("U: hit gives recall 1, not answered-anyway", () => {
		const s = scoreOne("P", P({ gaps: ["which port"] }), "U", TERMS, REF);
		assert.equal(s.recall, 1); assert.equal(s.aa, 0);
	});
	test("U: answered anyway = real answer + empty gap list", () => {
		const s = scoreOne("P", P({ answer: "curl localhost:8080" }), "U", TERMS, REF);
		assert.equal(s.recall, 0); assert.equal(s.aa, 1);
	});
	test("U: refusal text with empty gaps is neither hit nor answered-anyway", () => {
		const s = scoreOne("P", P({ answer: "I cannot answer this." }), "U", TERMS, REF);
		assert.equal(s.recall, 0); assert.equal(s.aa, 0);
	});
	test("U: empty answer is a non-answer", () => assert.equal(scoreOne("P", P({ answer: "   " }), "U", TERMS, REF).aa, 0));
	test("A: non-empty gap list is a false alarm; placeholder-only is not", () => {
		assert.equal(scoreOne("P", P({ gaps: ["something"] }), "A", TERMS, REF).fa, 1);
		assert.equal(scoreOne("P", P({ gaps: ["none"] }), "A", TERMS, REF).fa, 0);
	});
	test("invalid output on A scores false alarm 1; on U recall 0 and answered-anyway 0", () => {
		assert.equal(scoreOne("E", "garbage", "A", TERMS, REF).fa, 1);
		const u = scoreOne("E", "garbage", "U", TERMS, REF);
		assert.equal(u.recall, 0); assert.equal(u.aa, 0);
	});
	test("N has no recall or false alarm, only answered-anyway", () => {
		const u = scoreOne("N", JSON.stringify({ answer: "port 80" }), "U", TERMS, REF);
		assert.equal(u.recall, null); assert.equal(u.aa, 1);
		assert.equal(scoreOne("N", JSON.stringify({ answer: "x" }), "A", TERMS, REF).fa, null);
	});
	test("E envelope scores through missingContext", () =>
		assert.equal(scoreOne("E", E({ missingContext: ["Which port number?"] }), "U", TERMS, REF).recall, 1));
});

describe("exact sign-flip test", () => {
	// brute force over all sign assignments for small n
	const brute = (diffs) => {
		const nz = diffs.filter((d) => d !== 0), m = nz.length;
		const obs = nz.reduce((a, b) => a + b, 0);
		let ge = 0, le = 0;
		for (let mask = 0; mask < 2 ** m; mask++) {
			let s = 0;
			nz.forEach((d, i) => (s += mask & (1 << i) ? d : -d));
			if (s >= obs) ge++;
			if (s <= obs) le++;
		}
		return { p: ge / 2 ** m, pOpp: le / 2 ** m, m };
	};
	test("DP equals brute force on random small cases", () => {
		for (let t = 0; t < 40; t++) {
			const n = 1 + (t % 12);
			const d = Array.from({ length: n }, (_, i) => ((i * 7 + t * 3) % 7) - 3);
			const a = signFlip(d), b = brute(d);
			assert.equal(a.m, b.m); assert.ok(Math.abs(a.p - b.p) < 1e-12 && Math.abs(a.pOpp - b.pOpp) < 1e-12, JSON.stringify(d));
		}
	});
	test("all-positive differences hit the floor 2^-m and ties count", () => {
		const r = signFlip([3, 3, 3, 3, 3, 0, 0]);
		assert.equal(r.m, 5); assert.equal(r.p, 1 / 32); assert.equal(r.floor, 1 / 32);
	});
	test("all zero: p = 1, m = 0", () => assert.deepEqual([signFlip([0, 0]).p, signFlip([0, 0]).m], [1, 0]));
	test("30 items runs fast", () => {
		const t = Date.now(); signFlip(Array.from({ length: 30 }, (_, i) => (i % 3) + 1)); assert.ok(Date.now() - t < 2000);
	});
	test("opposite tail: E worse than P gives small pOpp, large p", () => {
		const r = signFlip([-3, -3, -2, -3, -1, -3, -2]);
		assert.ok(r.p > 0.9 && r.pOpp <= 0.05);
	});
});

describe("outcome table is exhaustive at the boundaries", () => {
	const T = 0.3;
	test("case 1 supported", () => assert.match(decide({ d: 0.3, T, p: 0.01, pOpp: 1, FA: 0.1 }), /^1/));
	test("case 2 mixed when FA > 0.10", () => assert.match(decide({ d: 0.4, T, p: 0.01, pOpp: 1, FA: 0.11 }), /^2/));
	test("case 3 inconclusive when p > 0.05", () => assert.match(decide({ d: 0.4, T, p: 0.2, pOpp: 1, FA: 0 }), /^3/));
	test("case 4 no difference inside (-T, T)", () => {
		assert.match(decide({ d: 0.29, T, p: 0.5, pOpp: 0.5, FA: 0 }), /^4/);
		assert.match(decide({ d: -0.29, T, p: 0.5, pOpp: 0.5, FA: 0 }), /^4/);
	});
	test("case 5 refuted uses the opposite tail", () => assert.match(decide({ d: -0.3, T, p: 1, pOpp: 0.01, FA: 0 }), /^5/));
	test("case 6 inconclusive when pOpp > 0.05", () => assert.match(decide({ d: -0.5, T, p: 1, pOpp: 0.3, FA: 0 }), /^6/));
	test("every d on a grid maps to exactly one case", () => {
		for (let d = -1; d <= 1.0001; d += 0.05) for (const p of [0.01, 0.5]) for (const FA of [0, 0.2])
			assert.match(decide({ d, T, p, pOpp: p, FA }), /^[1-6]/);
	});
});

describe("noise rule", () => {
	test("sample SD uses n-1", () => assert.ok(Math.abs(sampleSD([0, 0, 1]) - Math.sqrt(1 / 3)) < 1e-12));
	test("SD is zero when repeats agree, so T = 0.10", () => {
		const labels = { u1: { cls: "U", terms: TERMS }, a1: { cls: "A", terms: [] } };
		const rows = [];
		for (const arm of ["E", "P"]) for (const rep of [1, 2, 3]) {
			rows.push({ item: "u1", arm, repeat: rep, raw: arm === "E" ? E({ missingContext: ["which port"] }) : P({ gaps: ["which port"] }) });
			rows.push({ item: "a1", arm, repeat: rep, raw: arm === "E" ? E({}) : P({}) });
		}
		const r = pilotT(rows, labels, REF);
		assert.equal(r.largest, 0); assert.equal(r.T, 0.1);
	});
	test("one flipped item among 6 gives SD ~0.096 and T ~0.29", () => {
		const labels = {}, rows = [];
		for (let i = 0; i < 6; i++) labels[`u${i}`] = { cls: "U", terms: TERMS };
		for (let i = 0; i < 6; i++) labels[`a${i}`] = { cls: "A", terms: [] };
		for (let i = 0; i < 6; i++) for (const arm of ["E", "P"]) for (const rep of [1, 2, 3]) {
			rows.push({ item: `a${i}`, arm, repeat: rep, raw: arm === "E" ? E({}) : P({}) });
			const hit = !(arm === "E" && i === 0 && rep === 1);
			rows.push({ item: `u${i}`, arm, repeat: rep, raw: arm === "E" ? E({ missingContext: hit ? ["which port"] : [] }) : P({ gaps: ["which port"] }) });
		}
		const r = pilotT(rows, labels, REF);
		assert.ok(Math.abs(r.largest - 1 / (6 * Math.sqrt(3))) < 1e-9, String(r.largest));
		assert.ok(Math.abs(r.T - 0.2887) < 1e-3);
	});
});

describe("end to end on synthetic data", () => {
	const mk = (eHit, pHit, faE = 0, faP = 0) => {
		const labels = {}, rows = [];
		for (let i = 0; i < 30; i++) { labels[`u${i}`] = { cls: "U", terms: TERMS }; labels[`a${i}`] = { cls: "A", terms: [] }; }
		for (let i = 0; i < 30; i++) for (const rep of [1, 2, 3]) {
			rows.push({ item: `u${i}`, arm: "E", repeat: rep, raw: E({ missingContext: i < eHit ? ["which port"] : [] }) });
			rows.push({ item: `u${i}`, arm: "P", repeat: rep, raw: P({ gaps: i < pHit ? ["which port"] : [] }) });
			rows.push({ item: `u${i}`, arm: "N", repeat: rep, raw: JSON.stringify({ answer: "x" }) });
			rows.push({ item: `a${i}`, arm: "E", repeat: rep, raw: E({ missingContext: i < faE ? ["something"] : [] }) });
			rows.push({ item: `a${i}`, arm: "P", repeat: rep, raw: P({ gaps: i < faP ? ["something"] : [] }) });
			rows.push({ item: `a${i}`, arm: "N", repeat: rep, raw: JSON.stringify({ answer: "x" }) });
		}
		return { labels, rows };
	};
	test("E clearly better, no extra false alarms -> SUPPORTED", () => {
		const { labels, rows } = mk(28, 10);
		const r = analyse(rows, labels, REF, 0.1);
		assert.match(r.outcome, /^1/); assert.ok(r.test.p <= 0.05);
	});
	test("E better but many false alarms -> MIXED", () => {
		const { labels, rows } = mk(28, 10, 15, 0);
		assert.match(analyse(rows, labels, REF, 0.1).outcome, /^2/);
	});
	test("P clearly better -> REFUTED", () => {
		const { labels, rows } = mk(10, 28);
		assert.match(analyse(rows, labels, REF, 0.1).outcome, /^5/);
	});
	test("identical arms -> no detectable difference", () => {
		const { labels, rows } = mk(15, 15);
		assert.match(analyse(rows, labels, REF, 0.1).outcome, /^4/);
	});
	test("an arm with >5% invalid outputs invalidates the comparison", () => {
		const { labels, rows } = mk(28, 10);
		for (let i = 0; i < 12; i++) rows.find((r) => r.arm === "E" && r.item === `u${i}` && r.repeat === 1).raw = "garbage";
		const r = analyse(rows, labels, REF, 0.1);
		assert.ok(r.arms.E.invalidRate > 0.05); assert.match(r.outcome, /^INVALID/);
	});
	test("invalid outputs cannot lower the false-alarm rate", () => {
		const { labels, rows } = mk(15, 15, 0, 0);
		const before = analyse(rows, labels, REF, 0.1).arms.E.falseAlarm;
		rows.find((r) => r.arm === "E" && r.item === "a0" && r.repeat === 1).raw = "garbage";
		assert.ok(analyse(rows, labels, REF, 0.1).arms.E.falseAlarm > before);
	});
});

describe("seeded shuffle", () => {
	test("deterministic for a seed, different across seeds, permutation", () => {
		const a = Array.from({ length: 50 }, (_, i) => i);
		assert.deepEqual(shuffle(a, 1), shuffle(a, 1));
		assert.notDeepEqual(shuffle(a, 1), shuffle(a, 2));
		assert.deepEqual([...shuffle(a, 3)].sort((x, y) => x - y), a);
	});
});

describe("descriptive analyses", () => {
	const lists = { weak_default_can_pass_as_answer: ["deploy-02"], cued_missing_fact_named_in_both_members: ["data-02"], echo_terms_term_appears_in_the_u_prompt: [] };
	const labels = {
		"deploy-01-U": { cls: "U", terms: TERMS }, "deploy-02-U": { cls: "U", terms: TERMS }, "data-02-U": { cls: "U", terms: TERMS },
		"deploy-01-A": { cls: "A", terms: [] }, "deploy-02-A": { cls: "A", terms: [] },
	};
	const rows = [];
	for (const rep of [1, 2, 3]) {
		// E: hits deploy-01 only; names F inside a 4-entry list for deploy-02 (capped miss, uncapped hit)
		rows.push({ item: "deploy-01-U", arm: "E", repeat: rep, raw: E({ missingContext: ["which port"] }) });
		rows.push({ item: "deploy-02-U", arm: "E", repeat: rep, raw: E({ missingContext: ["a b", "c d", "e f", "which port"] }) });
		rows.push({ item: "data-02-U", arm: "E", repeat: rep, raw: E({ missingContext: [] }) });
		rows.push({ item: "deploy-01-A", arm: "E", repeat: rep, raw: E({}) });
		rows.push({ item: "deploy-02-A", arm: "E", repeat: rep, raw: E({ missingContext: ["x y"] }) });
		for (const id of ["deploy-01-U", "deploy-02-U", "data-02-U"]) rows.push({ item: id, arm: "P", repeat: rep, raw: P({ gaps: [] }) });
		rows.push({ item: "deploy-01-A", arm: "P", repeat: rep, raw: P({}) });
		rows.push({ item: "deploy-02-A", arm: "P", repeat: rep, raw: P({}) });
		for (const id of ["deploy-01-U", "deploy-02-U", "data-02-U"]) rows.push({ item: id, arm: "N", repeat: rep, raw: JSON.stringify({ answer: "port 80" }) });
	}
	const d = descriptives(rows, labels, REF, lists);
	test("uncapped recall counts a hit inside a long list; the capped metric does not", () => {
		assert.ok(Math.abs(d.E.recall_uncapped - 2 / 3) < 1e-9);
		assert.ok(Math.abs(scoreRun(rows, labels, REF).arms.E.recall - 1 / 3) < 1e-9);
	});
	test("excluding weak pairs removes deploy-02 from recall and false alarm", () => {
		assert.ok(Math.abs(d.E.recall_without_weak - 1 / 2) < 1e-9);
		assert.equal(d.E.falseAlarm_without_weak, 0);
	});
	test("cued-only recall uses only the cued pair", () => assert.equal(d.E.recall_on_cued_only, 0));
	test("per-domain split and N answered-anyway", () => {
		assert.equal(d.E.byDomain.deploy.falseAlarm, 0.5);
		assert.equal(d.N.answeredAnyway, 1);
	});
});

describe("mc-h2 matching normalisation", () => {
	const T2 = ["cutoff year", "exchange rate", "network name"];
	test("camelCase, snake_case and hyphenated gaps now hit", () => {
		assert.equal(isHit(["cutoffYear"], T2), true);
		assert.equal(isHit(["cutoff_year"], T2), true);
		assert.equal(isHit(["EUR_to_USD_exchange_rate is needed"], T2), true);
		assert.equal(isHit(["network-name"], T2), true);
	});
	test("acronym boundaries split (HTTPServer -> http server)", () => assert.equal(normMatch("HTTPServer"), "http server"));
	test("terms are normalised the same way as entries", () => assert.equal(isHit(["long service cutoff"], ["long-service cutoff"]), true));
	test("vague gaps still do not hit after normalisation", () => {
		assert.equal(isHit(["more_details", "configurationSettings", "pre-existing setup"], T2), false);
	});
	test("camel splitting does not manufacture a hit inside ordinary words", () => {
		assert.equal(isHit(["Tuesday"], ["day"]) === true, true); // plain substring behaviour is unchanged: documented risk
		assert.equal(normMatch("Tuesday"), "tuesday");
	});
	test("plain mode reproduces mc-h1 matching: cutoff_year does not hit", () => {
		setMatchMode("plain");
		try {
			assert.equal(isHit(["cutoff_year"], T2), false);
			assert.equal(isHit(["cutoff year"], T2), true);
		} finally {
			setMatchMode("norm");
		}
	});
	test("placeholders are judged before matching: '-' and 'N/A' dropped, 'none.' kept", () => {
		assert.deepEqual(cleanGaps(["-", "N/A", "None"]), []);
		assert.deepEqual(cleanGaps(["none."]), ["none."]);
	});
	test("cleanGaps keeps original case so camelCase can be split later", () => assert.deepEqual(cleanGaps(["cutoffYear"]), ["cutoffYear"]));
	test("end to end: a camelCase gap on a U item scores a hit; the same gap in plain mode scores a miss", () => {
		const raw = P({ gaps: ["cutoffYear"] });
		assert.equal(scoreOne("P", raw, "U", ["cutoff year"], REF).recall, 1);
		setMatchMode("plain");
		try {
			assert.equal(scoreOne("P", raw, "U", ["cutoff year"], REF).recall, 0);
		} finally {
			setMatchMode("norm");
		}
	});
});

describe("mc-h2 payloads", () => {
	test("P2 and N2 never describe the output as a JSON schema, and keep the instruction line", async () => {
		const { P2_SYSTEM, N2_SYSTEM } = await import("./arms.mjs");
		for (const s of [P2_SYSTEM, N2_SYSTEM]) {
			assert.ok(!/JSON schema/i.test(s) && !/"type"\s*:\s*"object"/.test(s), "schema-style wording present");
			assert.ok(/not a schema/.test(s));
		}
		assert.ok(P2_SYSTEM.includes("If you lack information needed, list what is missing in gaps."));
		assert.ok(!N2_SYSTEM.includes("gaps"));
	});
});

describe("mc-h2 identifier trap (Critic)", () => {
	test("a joined lowercase identifier term misses a camelCase gap unless the split form is also a term", () => {
		assert.equal(isHit(["appVersion to 4.2.0"], ["appversion to"]), false);
		assert.equal(isHit(["appVersion to 4.2.0"], ["appversion to", "app version to"]), true);
	});
	test("frozen code-04 terms contain the split form", async () => {
		const fs = await import("node:fs");
		const L = JSON.parse(fs.readFileSync(new URL("./labels.json", import.meta.url), "utf8"));
		assert.ok(L["code-04-U"].terms.includes("app version to"));
		assert.equal(isHit(["appVersion to 4.2.0"], L["code-04-U"].terms), true);
	});
});

describe("mc-h2 frozen camelCase function (edge cases fixed by test)", () => {
	const cases = {
		appVersion: "app version", cutoffYear: "cutoff year", HTTPServer: "http server", base64Rate: "base64 rate",
		version2Update: "version2 update", EURtoUSD: "eu rto usd", EUR_to_USD_exchange_rate: "eur to usd exchange rate",
		"network-name": "network name", "X-Sched-Auth": "x sched auth", "--queue": "queue", cutoff_year: "cutoff year", "app.version": "app.version", "a/b": "a/b",
	};
	for (const [input, want] of Object.entries(cases)) test(`normMatch(${JSON.stringify(input)}) = ${JSON.stringify(want)}`, () => assert.equal(normMatch(input), want));
	test("normalisation is idempotent", () => { for (const w of Object.values(cases)) assert.equal(normMatch(w), w); });
	test("order: placeholders are judged on the casefolded entry, the 3-entry cap applies, only then matching normalisation", () => {
		assert.deepEqual(cleanGaps(["None", "cutoffYear"]), ["cutoffYear"]);
		assert.equal(isHit(["a", "b", "c", "cutoffYear"], ["cutoff year"]), false);
	});
});

describe("mc-h2 payload and term constraints", () => {
	test("P2 shows two neutral examples (empty and filled) and N2 stays gap-free", async () => {
		const { P2_SYSTEM, N2_SYSTEM } = await import("./arms.mjs");
		assert.ok(P2_SYSTEM.includes('"gaps":[]') && P2_SYSTEM.includes('"gaps":["what is missing"]'));
		assert.ok(!N2_SYSTEM.includes("gaps"));
	});
	test('"what is missing" is not matched by any term in any list (the P2 example text must not score as a hit)', async () => {
		const fs = await import("node:fs");
		const L = JSON.parse(fs.readFileSync(new URL("./labels.json", import.meta.url), "utf8"));
		for (const [id, v] of Object.entries(L)) if (v.cls === "U") assert.equal(isHit(["what is missing"], v.terms), false, id);
	});
	test("no pair has more than 3 added terms and all added terms are lowercase", async () => {
		const fs = await import("node:fs");
		const add = JSON.parse(fs.readFileSync(new URL("./terms_additions.json", import.meta.url), "utf8"));
		for (const [pair, terms] of Object.entries(add)) { assert.ok(terms.length <= 3, pair); for (const t of terms) assert.equal(t, t.toLowerCase()); }
	});
});

describe("mc-h2 literal-example markers (descriptive)", () => {
	test("(a) answer equal to ... after trim", () => assert.equal(literalMarkers("P", P({ answer: "  ...  " })).a, true));
	test("(a) a real answer is not flagged, nor an answer containing ...", () => {
		assert.equal(literalMarkers("P", P({ answer: "ls -la" })).a, false);
		assert.equal(literalMarkers("P", P({ answer: "wait... no" })).a, false);
	});
	test("(b) a gaps entry that is exactly 'what is missing', case-insensitive", () => {
		assert.equal(literalMarkers("P", P({ gaps: ["What Is Missing"] })).b, true);
		assert.equal(literalMarkers("P", P({ gaps: ["  what is missing "] })).b, true);
	});
	test("(b) a real gap or a longer sentence containing the phrase is not flagged", () => {
		assert.equal(literalMarkers("P", P({ gaps: ["the port"] })).b, false);
		assert.equal(literalMarkers("P", P({ gaps: ["tell me what is missing here"] })).b, false);
	});
	test("invalid output flags nothing", () => assert.deepEqual(literalMarkers("P", "garbage"), { a: false, b: false }));
	test("markers never change scoring: an example-echo output still scores as an ordinary valid output", () => {
		const s = scoreOne("P", P({ answer: "...", gaps: ["what is missing"] }), "A", [], REF);
		assert.equal(s.invalid, false);
		assert.equal(s.fa, 1);
	});
});
