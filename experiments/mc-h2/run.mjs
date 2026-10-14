// Runner. Refuses to call the API unless the frozen files match the recorded manifest hash.
// usage: node run.mjs --split noise|main --manifest-hash <sha256> --out raw_<name>.jsonl [--concurrency 4]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./env.mjs";
import OpenAI from "openai";
import { buildMessages } from "./arms.mjs";
import { verify } from "./freeze.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const split = arg("split"), expected = arg("manifest-hash"), outName = arg("out");
const concurrency = Number(arg("concurrency", "4"));
const dry = process.argv.includes("--dry-run");
if (!["noise", "main"].includes(split) || !outName) throw new Error("need --split noise|main and --out");

const v = verify(expected);
if (!v.ok) { console.error("FROZEN FILES DO NOT MATCH THE MANIFEST HASH", JSON.stringify(v)); process.exit(2); }

const params = JSON.parse(fs.readFileSync(path.join(here, "params.json"), "utf8"));
const items = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(here, "items.json"), "utf8")).map((i) => [i.id, i]));
const order = JSON.parse(fs.readFileSync(path.join(here, "order.json"), "utf8")).filter((c) => c.phase === split);
const outFile = path.join(here, "raw", outName);
fs.mkdirSync(path.dirname(outFile), { recursive: true });
if (fs.existsSync(outFile)) throw new Error(`${outFile} exists; raw outputs are never overwritten`);

const price = params.assumed_price_usd_per_million_tokens;
const cost = (u) => ((u?.prompt_tokens || 0) * price.input + (u?.completion_tokens || 0) * price.output) / 1e6;
console.log(`split=${split} calls=${order.length} manifest=${v.manifestHash.slice(0, 12)} model=${params.model}`);
if (dry) { console.log("dry run: no API calls"); process.exit(0); }

const client = new OpenAI();
let spent = 0, done = 0, stop = false;
const stream = fs.createWriteStream(outFile, { flags: "wx" });
const request = (arm, text) => ({
	model: params.model,
	messages: buildMessages(arm, text),
	response_format: params.response_format,
	max_completion_tokens: params.max_completion_tokens,
});

async function one(c) {
	const body = request(c.arm, items[c.item].prompt);
	for (let attempt = 1; attempt <= 3; attempt++) {
		try {
			const r = await client.chat.completions.create(body);
			const u = r.usage;
			spent += cost(u);
			const line = {
				item: c.item, arm: c.arm, repeat: c.repeat, seq: c.seq,
				raw: r.choices[0].message.content, finish_reason: r.choices[0].finish_reason,
				model: r.model, accepted_params: { response_format: body.response_format, max_completion_tokens: body.max_completion_tokens },
				usage: u, ts: new Date().toISOString(), attempts: attempt,
			};
			stream.write(JSON.stringify(line) + "\n");
			return;
		} catch (e) {
			if (attempt === 3 || !(e.status === 429 || e.status >= 500 || !e.status)) {
				stream.write(JSON.stringify({ item: c.item, arm: c.arm, repeat: c.repeat, seq: c.seq, raw: null, error: String(e.message).slice(0, 300), ts: new Date().toISOString() }) + "\n");
				return;
			}
			await new Promise((r) => setTimeout(r, 1500 * attempt));
		}
	}
}

let next = 0;
async function worker() {
	while (!stop) {
		const i = next++;
		if (i >= order.length) return;
		await one(order[i]);
		done++;
		if (spent > params.cost_ceiling_usd) { stop = true; console.error(`EMERGENCY STOP: spend ${spent.toFixed(4)} exceeded ceiling`); }
		if (done % 20 === 0) console.log(`${done}/${order.length} spent~$${spent.toFixed(4)}`);
	}
}
await Promise.all(Array.from({ length: concurrency }, worker));
await new Promise((r) => stream.end(r));
console.log(`finished ${done}/${order.length}; estimated spend $${spent.toFixed(4)} (assumed prices); output ${outFile}`);
