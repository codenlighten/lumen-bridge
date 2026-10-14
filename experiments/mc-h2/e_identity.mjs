// The E arm must be byte-identical to mc-h1. Compares E's code hash and E's full request payload with mc-h1's frozen values.
import fs from "node:fs";
import crypto from "node:crypto";
import { buildMessages as buildH2 } from "./arms.mjs";
import { buildMessages as buildH1 } from "../mc-h1/arms.mjs";
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const h1Manifest = JSON.parse(fs.readFileSync("../mc-h1/manifest.json", "utf8"));
const codeNow = sha(fs.readFileSync("../../structured-json.js"));
const probe = "<ITEM PROMPT>";
const pNow = JSON.stringify(buildH2("E", probe)), p1 = JSON.stringify(buildH1("E", probe));
const out = {
	e_code_sha256_now: codeNow,
	e_code_sha256_mc_h1_manifest: h1Manifest["../../structured-json.js"],
	e_code_identical: codeNow === h1Manifest["../../structured-json.js"],
	e_payload_sha256_now: sha(pNow),
	e_payload_sha256_mc_h1: sha(p1),
	e_payload_identical: pNow === p1,
};
out.ok = out.e_code_identical && out.e_payload_identical;
fs.writeFileSync("e_identity.json", JSON.stringify({ ...out, e_payload: JSON.parse(pNow) }, null, 1));
console.log(JSON.stringify(out, null, 1));
process.exit(out.ok ? 0 : 1);
