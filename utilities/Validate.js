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
	search: {
		type: "object",
		required: ["userQuery"],
		additionalProperties: true,
		properties: {
			userQuery: { type: "string", minLength: 1, maxLength: 4000 },
			refinedQuery: { type: "string", maxLength: 4000 },
			maxResults: { type: "integer", minimum: 1, maximum: 50 },
		},
	},
	terminal: {
		type: "object",
		required: ["task"],
		additionalProperties: true,
		properties: {
			task: { type: "string", minLength: 1, maxLength: 4000 },
			context: { type: "object" },
		},
	},
	codeGenerate: {
		type: "object",
		required: ["prompt"],
		additionalProperties: true,
		properties: {
			prompt: { type: "string", minLength: 1, maxLength: 8000 },
			context: { type: "object" },
		},
	},
	codeImprove: {
		type: "object",
		required: ["code"],
		additionalProperties: true,
		properties: {
			code: { type: "string", minLength: 1, maxLength: 50000 },
			context: { type: "object" },
		},
	},
	schemaGen: {
		type: "object",
		required: ["userPrompt"],
		additionalProperties: true,
		properties: {
			userPrompt: { type: "string", minLength: 1, maxLength: 8000 },
			context: { type: ["string", "object"] },
			extraConstraints: { type: "string", maxLength: 4000 },
		},
	},
	router: {
		type: "object",
		required: ["userPrompt"],
		additionalProperties: true,
		properties: {
			userPrompt: { type: "string", minLength: 1, maxLength: 8000 },
			context: { type: "object" },
		},
	},
	customAgent: {
		type: "object",
		required: ["agentName", "userPrompt"],
		additionalProperties: true,
		properties: {
			agentName: { type: "string", minLength: 1, maxLength: 100 },
			systemPrompt: { type: "string", maxLength: 8000 },
			userPrompt: { type: "string", minLength: 1, maxLength: 8000 },
			schema: { type: "object" },
		},
	},
	agentRegister: {
		type: "object",
		required: ["name", "prompt"],
		additionalProperties: true,
		properties: {
			name: { type: "string", minLength: 1, maxLength: 100 },
			description: { type: "string", maxLength: 1000 },
			prompt: { type: "string", minLength: 1, maxLength: 8000 },
			schema: { type: "object" },
			metadata: { type: "object" },
		},
	},
	agentUpdate: {
		type: "object",
		required: ["agentName", "updates"],
		additionalProperties: true,
		properties: {
			agentName: { type: "string", minLength: 1, maxLength: 100 },
			updates: { type: "object" },
		},
	},
	agentDelete: {
		type: "object",
		required: ["agentName"],
		additionalProperties: true,
		properties: {
			agentName: { type: "string", minLength: 1, maxLength: 100 },
		},
	},
	agentInvoke: {
		type: "object",
		required: ["agentName", "context"],
		additionalProperties: true,
		properties: {
			agentName: { type: "string", minLength: 1, maxLength: 100 },
			context: { type: "object" },
		},
	},
};
