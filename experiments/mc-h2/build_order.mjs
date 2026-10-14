// mc-h2 call order: phase "noise" (arm P only, main items) and phase "main" (E, P, N, main items), one fixed seeded shuffle each.
import fs from "node:fs";
import { shuffle } from "./seed.mjs";
const params = JSON.parse(fs.readFileSync("params.json", "utf8"));
const items = JSON.parse(fs.readFileSync("items.json", "utf8")).filter((i) => i.split === "main");
const noise = [], main = [];
for (const it of items) for (let repeat = 1; repeat <= params.repeats; repeat++) {
	noise.push({ phase: "noise", item: it.id, arm: "P", repeat });
	for (const arm of ["E", "P", "N"]) main.push({ phase: "main", item: it.id, arm, repeat });
}
const order = [
	...shuffle(noise, params.order_seed).map((c, seq) => ({ ...c, seq })),
	...shuffle(main, params.order_seed + 1).map((c, seq) => ({ ...c, seq })),
];
fs.writeFileSync("order.json", JSON.stringify(order));
console.log(`noise=${noise.length} main=${main.length} items=${items.length}`);
