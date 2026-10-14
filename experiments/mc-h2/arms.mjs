// Request builders for mc-h2. Arm codes stay E, P, N; here P means P2 and N means N2.
// E reuses the repo's own envelope builder (unchanged from mc-h1). P2/N2 describe the output shape in prose plus a
// one-line example, because mc-h1's schema-style description made the model echo the schema in 10/180 outputs.
import "./env.mjs";
import { buildEnvelopeMessages } from "../../structured-json.js";

export const P2_SYSTEM =
	'You are an AI that outputs ONLY valid JSON. If you lack information needed, list what is missing in gaps.\n' +
	'Respond with one JSON object with exactly two keys: "answer" (a string) and "gaps" (an array of strings, empty if nothing is missing). ' +
	'Examples of the shape: {"answer":"...","gaps":[]} or {"answer":"...","gaps":["what is missing"]}. Output the object itself, not a schema, and no other text.';
export const N2_SYSTEM =
	'You are an AI that outputs ONLY valid JSON.\n' +
	'Respond with one JSON object with exactly one key: "answer" (a string). ' +
	'Example of the shape: {"answer":"..."}. Output the object itself, not a schema, and no other text.';

export function buildMessages(arm, userText) {
	if (arm === "E") return buildEnvelopeMessages({ query: userText, schema: null }).messages;
	if (arm === "P") return [{ role: "system", content: P2_SYSTEM }, { role: "user", content: userText }];
	if (arm === "N") return [{ role: "system", content: N2_SYSTEM }, { role: "user", content: userText }];
	throw new Error(`unknown arm ${arm}`);
}
export const ARMS = ["E", "P", "N"];
