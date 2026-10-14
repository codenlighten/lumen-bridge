// labels.json (mc-h2) = labels_h1_terms.json (mc-h1's frozen terms) + terms_additions.json (pair id -> added terms, U items only).
import fs from "node:fs";
const base = JSON.parse(fs.readFileSync("labels_h1_terms.json", "utf8"));
const add = JSON.parse(fs.readFileSync("terms_additions.json", "utf8"));
const out = JSON.parse(JSON.stringify(base));
let added = 0;
for (const [pair, terms] of Object.entries(add)) {
	const id = `${pair}-U`;
	if (!out[id]) throw new Error(`unknown pair ${pair}`);
	if (terms.length > 3) throw new Error(`${pair}: more than 3 added terms`);
	for (const t of terms) {
		const lt = t.toLowerCase();
		if (!out[id].terms.includes(lt)) { out[id].terms.push(lt); added++; }
	}
}
fs.writeFileSync("labels.json", JSON.stringify(out, null, 1));
console.log(`labels.json written; ${added} terms added across ${Object.keys(add).length} pairs`);
