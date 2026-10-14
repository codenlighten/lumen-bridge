// Request builders for the three arms. E reuses the repo's own envelope builder so the
import "./env.mjs";
// prompt cannot drift from what the API sends; P and N share E's wrapper wording.
import { buildEnvelopeMessages } from "../../structured-json.js";

export const BASE = "You are an AI that outputs ONLY valid JSON strictly conforming to the provided schema.";
export const P_LINE = "If you lack information needed, list what is missing in gaps.";
export const P_SCHEMA = {
	type: "object",
	properties: { answer: { type: "string" }, gaps: { type: "array", items: { type: "string" } } },
	required: ["answer", "gaps"],
};
export const N_SCHEMA = {
	type: "object",
	properties: { answer: { type: "string" } },
	required: ["answer"],
};
const schemaPrompt = (s) =>
	`You must respond with a JSON object that follows this JSON schema exactly: ${JSON.stringify(s)}. Do not include any additional commentary or explanations.`;

export function buildMessages(arm, userText) {
	if (arm === "E") return buildEnvelopeMessages({ query: userText, schema: null }).messages;
	if (arm === "P")
		return [
			{ role: "system", content: `${BASE} ${P_LINE}\n${schemaPrompt(P_SCHEMA)}` },
			{ role: "user", content: userText },
		];
	if (arm === "N")
		return [
			{ role: "system", content: `${BASE}\n${schemaPrompt(N_SCHEMA)}` },
			{ role: "user", content: userText },
		];
	throw new Error(`unknown arm ${arm}`);
}
export const ARMS = ["E", "P", "N"];
