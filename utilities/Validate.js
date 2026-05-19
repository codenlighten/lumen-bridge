import Ajv from "ajv";

const ajv = new Ajv({ allErrors: true, removeAdditional: "failing" });

const compiled = new WeakMap();

function getValidator(schema) {
	let v = compiled.get(schema);
	if (!v) {
		v = ajv.compile(schema);
		compiled.set(schema, v);
	}
	return v;
}

export function validateBody(schema) {
	const validate = getValidator(schema);
	return (req, res, next) => {
		const ok = validate(req.body);
		if (!ok) {
			return res.status(400).json({
				success: false,
				error: {
					code: "VALIDATION_ERROR",
					message: "Invalid request body",
					details: validate.errors?.map((e) => ({
						path: e.instancePath || "/",
						message: e.message,
					})),
				},
			});
		}
		next();
	};
}

// Reusable schemas
export const HEX_PUBKEY = {
	type: "string",
	pattern: "^[0-9a-fA-F]{66}$",
	minLength: 66,
	maxLength: 66,
};

export const schemas = {
	challenge: {
		type: "object",
		required: ["publicKey"],
		additionalProperties: false,
		properties: {
			publicKey: { type: "string", minLength: 1, maxLength: 200 },
		},
	},
	verify: {
		type: "object",
		required: ["challenge", "signature", "publicKey"],
		additionalProperties: false,
		properties: {
			challenge: { type: "string", minLength: 1, maxLength: 200 },
			signature: { type: "string", minLength: 1, maxLength: 500 },
			publicKey: { type: "string", minLength: 1, maxLength: 200 },
		},
	},
	register: {
		type: "object",
		required: ["email", "publicKey", "password"],
		additionalProperties: false,
		properties: {
			email: { type: "string", minLength: 3, maxLength: 254 },
			publicKey: { type: "string", minLength: 1, maxLength: 200 },
			password: { type: "string", minLength: 8, maxLength: 256 },
		},
	},
	login: {
		type: "object",
		required: ["email", "password"],
		additionalProperties: false,
		properties: {
			email: { type: "string", minLength: 3, maxLength: 254 },
			password: { type: "string", minLength: 1, maxLength: 256 },
		},
	},
	metaCreateAgent: {
		type: "object",
		required: ["prompt"],
		additionalProperties: true,
		properties: {
			prompt: { type: "string", minLength: 1, maxLength: 8000 },
			options: { type: "object" },
		},
	},
};
