/**
 * LUMEN BRIDGE - Self-Aware Agent API Server
 *
 * Exposes the complete agent system via REST API:
 * - Individual agents (SearchAgent, TerminalAgent, CodeGenerator, etc.)
 * - Intelligent ToolRouter for autonomous routing
 * - BaseMetaAgent for custom agent creation
 * - Schema generation and registry
 * - Memory and cryptographic signatures
 *
 * Users can:
 * 1. Use individual specialized agents
 * 2. Use the intelligent router for full autonomy
 * 3. Create custom agents extending BaseMetaAgent
 * 4. Build their own AI applications on top
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import validator from "validator";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { marked } from "marked";

// Import agents
import BaseMetaAgent from "./agents/BaseMetaAgent.js";
import MetaAgent from "./agents/MetaAgent.js";
import SearchAgent from "./agents/SearchAgent.js";
import TerminalAgent from "./agents/TerminalAgent.js";
import CodeGenerator from "./agents/CodeGenerator.js";
import { CodeImprover } from "./agents/CodeImprover.js";
import SchemaAgent from "./agents/SchemaGenerator.js";
import { SchemaMediatorAgent } from "./agents/SchemaMediatorAgent.js";

// Import utilities
import { SchemaRegistry } from "./utilities/SchemaRegistry.js";
import { MemoryManager } from "./utilities/MemoryManager.js";
import { sessionMemoryManager } from "./utilities/SessionMemoryManager.js";
import { agentRegistry } from "./utilities/AgentRegistry.js";
import { dbService } from "./utilities/MongoDBService.js";
import SignatureVerifier from "./utilities/SignatureVerifier.js";
import UserService from "./utilities/UserService.js";
import { globalCache } from "./utilities/ResponseCache.js";
import {
	requireAuth,
	optionalAuth,
	asyncHandler,
	errorHandler,
	AppError,
} from "./utilities/AuthMiddleware.js";
import { CACHE, META_AGENT } from "./config/constants.js";
import { validateBody, schemas } from "./utilities/Validate.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PROD = NODE_ENV === "production";

// Fail-fast: refuse to start in prod with default/missing secrets
const DEFAULT_JWT_SECRET = "lumenbridge-secret-key-change-in-production";
const DEFAULT_ADMIN_KEY = "your-admin-key-change-this";
if (IS_PROD) {
	const problems = [];
	if (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_JWT_SECRET)
		problems.push("JWT_SECRET is unset or default");
	if (!process.env.ADMIN_KEY || process.env.ADMIN_KEY === DEFAULT_ADMIN_KEY)
		problems.push("ADMIN_KEY is unset or default");
	if (!process.env.CORS_ORIGINS) problems.push("CORS_ORIGINS is unset");
	if (!process.env.OPENAI_API_KEY) problems.push("OPENAI_API_KEY is unset");
	if (problems.length) {
		console.error("FATAL: refusing to start in production:");
		problems.forEach((p) => console.error("  -", p));
		process.exit(1);
	}
}

// Trust proxy (needed for correct IPs behind CapRover/nginx for rate limiting)
app.set("trust proxy", 1);

// Security headers
app.use(helmet());

// CORS allowlist
const corsOrigins = (process.env.CORS_ORIGINS || "")
	.split(",")
	.map((s) => s.trim())
	.filter(Boolean);
const corsOptions = {
	origin: (origin, cb) => {
		// allow same-origin / curl / server-to-server (no Origin header)
		if (!origin) return cb(null, true);
		if (!IS_PROD && corsOrigins.length === 0) return cb(null, true); // permissive in dev
		if (corsOrigins.includes(origin)) return cb(null, true);
		return cb(new AppError("CORS_REJECTED", 403, "Origin not allowed"));
	},
	credentials: true,
};
app.use(cors(corsOptions));

// Body limit
app.use(express.json({ limit: process.env.BODY_LIMIT || "256kb" }));

// Rate limiters
const globalLimiter = rateLimit({
	windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
	max: Number(process.env.RATE_LIMIT_MAX) || 200,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		success: false,
		error: { code: "RATE_LIMITED", message: "Too many requests" },
	},
});
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		success: false,
		error: { code: "RATE_LIMITED", message: "Too many auth requests" },
	},
});
app.use(globalLimiter);
app.use("/api/auth/", authLimiter);
app.use("/api/users/login", authLimiter);
app.use("/api/users/register", authLimiter);

app.use(express.static(path.join(__dirname, "public")));

// Optional signature verification middleware (all requests, still allows through)
app.use(SignatureVerifier.middleware());

// Session memory middleware - attaches session memory to each request
app.use(sessionMemoryManager.middleware());

// Populate req.user from Bearer token when present (non-blocking, global)
app.use(optionalAuth);

// Initialize agents (singleton instances)
const agents = {
	search: new SearchAgent({ maxResults: 10 }),
	searchFast: new SearchAgent({ maxResults: 10, skipStrategyPlanning: true }),
	terminal: new TerminalAgent("API-Terminal"),
	code: new CodeGenerator("API-CodeGen"),
	codeImprover: new CodeImprover("API-CodeImprover"),
	schema: new SchemaAgent(),
	schemaMediator: new SchemaMediatorAgent({
		cacheMaxSize: CACHE.MAX_SIZE,
		cacheTTL: CACHE.TTL_MS,
	}),
};

// Initialize schema registry
const schemaRegistry = new SchemaRegistry();

// Initialize user service
const userService = new UserService(dbService);

// Initialize database connection and load user agents
(async () => {
	await dbService.connect();
	
	// Initialize UserService collections after DB connection
	userService.initCollections();
	console.log("   ✅ UserService initialized");
	
	await agentRegistry.loadUserAgentsFromDB();
	console.log("   ✅ User agents loaded from database");
})();

// ============================================================================
// HEALTH & INFO
// ============================================================================

// Serve landing page
app.get("/", (req, res) => {
	res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Serve API documentation
app.get("/api-doc", (req, res) => {
	const mdPath = path.join(__dirname, "public", "api-doc.md");
	const mdContent = fs.readFileSync(mdPath, "utf-8");
	const htmlContent = marked(mdContent);

	const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lumen Bridge API Documentation</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #667eea;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        }
        h2 {
            color: #764ba2;
            margin-top: 30px;
            border-bottom: 2px solid #eee;
            padding-bottom: 8px;
        }
        h3 {
            color: #667eea;
            margin-top: 20px;
        }
        code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            color: #764ba2;
        }
        pre {
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
        }
        pre code {
            background: transparent;
            color: #d4d4d4;
            padding: 0;
        }
        a {
            color: #667eea;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        .back-link {
            display: inline-block;
            margin-bottom: 20px;
            padding: 10px 20px;
            background: #667eea;
            color: white;
            border-radius: 5px;
            text-decoration: none;
        }
        .back-link:hover {
            background: #5568d3;
            text-decoration: none;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        th {
            background: #667eea;
            color: white;
        }
        tr:nth-child(even) {
            background: #f9f9f9;
        }
        ul {
            padding-left: 20px;
        }
        li {
            margin: 8px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <a href="/" class="back-link">← Back to Home</a>
        ${htmlContent}
    </div>
</body>
</html>
  `;

	res.send(html);
});

// API info endpoint
app.get("/api", (req, res) => {
	res.json({
		name: "Lumen Bridge - Self-Aware Agent API",
		version: "1.0.0",
		description: "Self-evolving agent system with cryptographic signatures",
		architecture: "Future Self Bridge Pattern",
		features: [
			"Individual specialized agents",
			"Intelligent routing system",
			"Schema-driven responses",
			"Cryptographic signatures (BSV-ECDSA-DER)",
			"Memory with signed history",
			"Self-reflective planning",
			"Missing context detection",
		],
		endpoints: {
			agents: "/api/agents",
			router: "/api/router",
			schema: "/api/schema",
			memory: "/api/memory",
			docs: "/api/docs",
		},
	});
});

app.get("/api/docs", (req, res) => {
	res.json({
		description: "Lumen Bridge API Documentation",
		endpoints: [
			{
				path: "/api/auth/challenge",
				method: "POST",
				description: "Request a challenge to sign for authentication",
				body: {
					publicKey: "string (required) - Your public key in hex format",
				},
				response: {
					challenge: "string - Random nonce to sign",
					message: "string - Message format to sign",
					expiresIn: "number - Seconds until expiry",
					timestamp: "number - Challenge creation time",
				},
			},
			{
				path: "/api/auth/verify",
				method: "POST",
				description:
					"Verify signed challenge and receive JWT token (valid for 1 hour)",
				body: {
					challenge: "string (required) - The challenge nonce received",
					signature: "string (required) - DER-encoded signature in hex",
					publicKey: "string (required) - Your public key in hex format",
				},
				response: {
					success: "boolean",
					token: "string - JWT token for authenticated requests",
					expiresIn: "string - Token expiry duration",
					publicKey: "string - Authenticated public key",
					issuedAt: "string - ISO timestamp",
				},
			},
			{
				path: "/api/agents",
				method: "GET",
				description: "List all available agents and their capabilities",
			},
			{
				path: "/api/agents/search",
				method: "POST",
				description: "Execute web search with intelligent planning",
				body: {
					userQuery: "string (required)",
					maxResults: "number (optional, default: 10)",
					refinedQuery: "string (optional, skip planning)",
				},
			},
			{
				path: "/api/agents/terminal",
				method: "POST",
				description: "Generate terminal commands",
				body: {
					task: "string (required)",
					context: "object (optional)",
				},
			},
			{
				path: "/api/agents/code",
				method: "POST",
				description: "Generate code from natural language",
				body: {
					prompt: "string (required)",
					context: "object (optional)",
				},
			},
			{
				path: "/api/agents/schema",
				method: "POST",
				description: "Generate JSON Schema from natural language",
				body: {
					userPrompt: "string (required)",
					context: "string (optional)",
					extraConstraints: "string (optional)",
				},
			},
			{
				path: "/api/router",
				method: "POST",
				description: "Intelligent router - automatically selects best agent",
				body: {
					userPrompt: "string (required)",
					context: "object (optional)",
				},
			},
			{
				path: "/api/schema/register",
				method: "POST",
				description: "Register a schema in the cryptographic registry",
				body: {
					schemaName: "string (required)",
					schema: "object (required)",
					description: "string (optional)",
					tags: "array (optional)",
				},
			},
			{
				path: "/api/schema/:name",
				method: "GET",
				description: "Retrieve a schema by name",
			},
			{
				path: "/api/schema/search",
				method: "POST",
				description: "Search schemas by tags or name",
				body: {
					query: "string (required)",
				},
			},
		],
	});
});

// ============================================================================
// AUTHENTICATION API
// ============================================================================

/**
 * Request a challenge to sign for authentication
 * POST /api/auth/challenge
 * Body: { publicKey: string }
 */
app.post("/api/auth/challenge", validateBody(schemas.challenge), (req, res) => {
	try {
		const { publicKey } = req.body;

		if (!publicKey) {
			return res.status(400).json({
				success: false,
				error: "Public key is required",
			});
		}

		const challengeData = SignatureVerifier.generateChallenge(publicKey);

		res.json({
			success: true,
			...challengeData,
		});
	} catch (error) {
		console.error("Challenge generation error:", error);
		res.status(500).json({
			success: false,
			error: "Failed to generate challenge",
		});
	}
});

/**
 * Verify signed challenge and receive JWT token
 * POST /api/auth/verify
 * Body: { challenge: string, signature: string, publicKey: string }
 */
app.post("/api/auth/verify", validateBody(schemas.verify), (req, res) => {
	try {
		const { challenge, signature, publicKey } = req.body;

		if (!challenge || !signature || !publicKey) {
			return res.status(400).json({
				success: false,
				error: "Challenge, signature, and publicKey are required",
			});
		}

		const result = SignatureVerifier.verifyChallenge(
			challenge,
			signature,
			publicKey
		);

		if (!result.success) {
			return res.status(401).json(result);
		}

		res.json(result);
	} catch (error) {
		console.error("Challenge verification error:", error);
		res.status(500).json({
			success: false,
			error: "Failed to verify challenge",
		});
	}
});

// ============================================================================
// USER REGISTRATION & MANAGEMENT
// ============================================================================

/**
 * Register a new user
 * POST /api/users/register
 * Body: { email: string, publicKey: string, password: string }
 */
app.post("/api/users/register", validateBody(schemas.register), async (req, res) => {
	try {
		const { email, publicKey, password } = req.body;

		if (!email || !publicKey || !password) {
			return res.status(400).json({
				success: false,
				error: "Email, publicKey, and password are required"
			});
		}

		// Email validation (RFC-compliant via `validator`, no localhost)
		if (
			typeof email !== "string" ||
			!validator.isEmail(email, { require_tld: true })
		) {
			return res.status(400).json({
				success: false,
				error: "Invalid email format"
			});
		}

		// Password strength check
		if (password.length < 8) {
			return res.status(400).json({
				success: false,
				error: "Password must be at least 8 characters"
			});
		}

		const result = await userService.registerUser({ email, publicKey, password });
		res.json(result);
	} catch (error) {
		console.error("Registration error:", error);
		res.status(400).json({
			success: false,
			error: IS_PROD ? "Internal server error" : error.message
		});
	}
});

/**
 * Verify email with token
 * GET /api/users/verify?token=xxx
 */
app.get("/api/users/verify", async (req, res) => {
	try {
		const { token } = req.query;

		if (!token) {
			return res.status(400).json({
				success: false,
				error: "Verification token is required"
			});
		}

		const result = await userService.verifyEmail(token);
		
		// Redirect to success page or send HTML response
		res.send(`
			<!DOCTYPE html>
			<html>
			<head>
				<title>Email Verified</title>
				<style>
					body {
						font-family: Arial, sans-serif;
						display: flex;
						justify-content: center;
						align-items: center;
						min-height: 100vh;
						margin: 0;
						background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
					}
					.container {
						background: white;
						padding: 40px;
						border-radius: 20px;
						text-align: center;
						box-shadow: 0 20px 60px rgba(0,0,0,0.3);
						max-width: 500px;
					}
					h1 { color: #667eea; margin-bottom: 20px; }
					p { color: #666; margin-bottom: 30px; }
					.success { font-size: 64px; margin-bottom: 20px; }
					.btn {
						background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
						color: white;
						padding: 15px 30px;
						text-decoration: none;
						border-radius: 8px;
						display: inline-block;
						font-weight: bold;
					}
				</style>
			</head>
			<body>
				<div class="container">
					<div class="success">✅</div>
					<h1>Email Verified!</h1>
					<p>Your account has been successfully verified. You can now use the API with your registered public key.</p>
					<p><strong>Tier:</strong> ${result.user.tier} (${result.user.monthlyLimit} requests/month)</p>
					<a href="/" class="btn">Return to Home</a>
				</div>
			</body>
			</html>
		`);
	} catch (error) {
		console.error("Verification error:", error);
		res.status(400).send(`
			<!DOCTYPE html>
			<html>
			<head>
				<title>Verification Failed</title>
				<style>
					body {
						font-family: Arial, sans-serif;
						display: flex;
						justify-content: center;
						align-items: center;
						min-height: 100vh;
						margin: 0;
						background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
					}
					.container {
						background: white;
						padding: 40px;
						border-radius: 20px;
						text-align: center;
						box-shadow: 0 20px 60px rgba(0,0,0,0.3);
						max-width: 500px;
					}
					h1 { color: #ef4444; margin-bottom: 20px; }
					p { color: #666; }
					.error { font-size: 64px; margin-bottom: 20px; }
				</style>
			</head>
			<body>
				<div class="container">
					<div class="error">❌</div>
					<h1>Verification Failed</h1>
					<p>${error.message}</p>
				</div>
			</body>
			</html>
		`);
	}
});

/**
 * Login with email and password
 * POST /api/users/login
 * Body: { email: string, password: string }
 */
app.post("/api/users/login", validateBody(schemas.login), async (req, res) => {
	try {
		const { email, password } = req.body;

		if (!email || !password) {
			return res.status(400).json({
				success: false,
				error: "Email and password are required"
			});
		}

		const result = await userService.authenticateUser(email, password);
		res.json(result);
	} catch (error) {
		console.error("Login error:", error);
		res.status(401).json({
			success: false,
			error: IS_PROD ? "Internal server error" : error.message
		});
	}
});

/**
 * Get user stats/profile
 * GET /api/users/stats?publicKey=xxx
 */
app.get("/api/users/stats", async (req, res) => {
	try {
		const { publicKey } = req.query;

		if (!publicKey) {
			return res.status(400).json({
				success: false,
				error: "Public key is required"
			});
		}

		const stats = await userService.getUserStats(publicKey);
		res.json({
			success: true,
			stats
		});
	} catch (error) {
		console.error("Stats error:", error);
		res.status(404).json({
			success: false,
			error: IS_PROD ? "Internal server error" : error.message
		});
	}
});

// ============================================================================
// META-AGENT API - Agent Creation Factory
// ============================================================================

// Initialize Meta-Agent
const metaAgent = new MetaAgent({
	model: "gpt-5-nano",
	temperature: 1.0
});

/**
 * Create a new agent on-demand
 * POST /api/meta/create-agent
 * Body: { prompt: string, options?: object }
 */
app.post("/api/meta/create-agent", requireAuth, validateBody(schemas.metaCreateAgent), async (req, res) => {
	try {
		const { prompt, options = {} } = req.body;

		if (!prompt) {
			return res.status(400).json({
				success: false,
				error: "Prompt is required"
			});
		}

		// Authenticated user — enforce tier/usage
		let userId = null;
		if (req.user?.publicKey) {
			const user = await userService.getUserByPublicKey(req.user.publicKey);
			if (user) {
				userId = user.email;
				// Agent creation counts as META_AGENT.REQUEST_COST requests
				if (user.requestCount + META_AGENT.REQUEST_COST > user.monthlyLimit) {
					return res.status(429).json({
						success: false,
						error: `Monthly limit exceeded. Agent creation costs ${META_AGENT.REQUEST_COST} requests.`,
						currentUsage: user.requestCount,
						limit: user.monthlyLimit
					});
				}
			}
		}

		console.log(`[Meta-Agent] Creating agent from prompt: "${prompt}"`);

		// Create the agent
		const result = await metaAgent.createNewAgent(prompt, {
			withInfrastructure: options.withInfrastructure || false,
			autoTest: options.autoTest !== false,
			returnCode: options.returnCode !== false
		});

		if (result.success) {
			// Store in MongoDB
			const agentRecord = {
				name: result.agentSpec.name,
				purpose: result.agentSpec.purpose,
				inputs: result.agentSpec.inputs,
				outputs: result.agentSpec.outputs,
				publicKey: result.keys.publicKey,
				address: result.keys.address,
				schemas: result.schemas,
				code: result.code,
				infra: result.infra,
				testResult: result.testResult,
				createdBy: userId || 'anonymous',
				createdAt: new Date(),
				signature: result._signature,
				prompt: prompt
			};

			await dbService.db.collection('generated_agents').insertOne(agentRecord);

			// Increment user request count (META_AGENT.REQUEST_COST per creation)
			if (req.user?.publicKey) {
				for (let i = 0; i < META_AGENT.REQUEST_COST; i++) {
					await userService.incrementRequestCount(req.user.publicKey);
				}
			}

			console.log(`[Meta-Agent] Successfully created ${result.agentSpec.name}`);
		}

		res.json(result);
	} catch (error) {
		console.error("[Meta-Agent] Creation error:", error);
		const message = IS_PROD ? "Failed to create agent" : error.message;
		res.status(500).json({
			success: false,
			error: { code: "META_CREATE_FAILED", message }
		});
	}
});

/**
 * Get all generated agents
 * GET /api/meta/agents?limit=20&skip=0
 */
app.get("/api/meta/agents", async (req, res) => {
	try {
		const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
		const skip = Math.min(Math.max(parseInt(req.query.skip) || 0, 0), 10000);
		const createdBy = req.query.createdBy;

		const query = createdBy ? { createdBy } : {};

		const agents = await dbService.db
			.collection('generated_agents')
			.find(query)
			.sort({ createdAt: -1 })
			.limit(limit)
			.skip(skip)
			.project({
				name: 1,
				purpose: 1,
				inputs: 1,
				outputs: 1,
				publicKey: 1,
				address: 1,
				createdBy: 1,
				createdAt: 1,
				prompt: 1
			})
			.toArray();

		const total = await dbService.db.collection('generated_agents').countDocuments(query);

		res.json({
			success: true,
			agents,
			total,
			limit,
			skip
		});
	} catch (error) {
		console.error("[Meta-Agent] List error:", error);
		res.status(500).json({
			success: false,
			error: IS_PROD ? "Internal server error" : error.message
		});
	}
});

/**
 * Get a specific generated agent by name or ID
 * GET /api/meta/agents/:id
 */
app.get("/api/meta/agents/:id", async (req, res) => {
	try {
		const { id } = req.params;

		// Try to find by name first, then by _id
		let agent = await dbService.db.collection('generated_agents').findOne({ name: id });
		
		if (!agent) {
			try {
				const { ObjectId } = await import('mongodb');
				agent = await dbService.db.collection('generated_agents').findOne({ _id: new ObjectId(id) });
			} catch (e) {
				// Invalid ObjectId, agent not found
			}
		}

		if (!agent) {
			return res.status(404).json({
				success: false,
				error: "Agent not found"
			});
		}

		res.json({
			success: true,
			agent
		});
	} catch (error) {
		console.error("[Meta-Agent] Get agent error:", error);
		res.status(500).json({
			success: false,
			error: IS_PROD ? "Internal server error" : error.message
		});
	}
});

/**
 * Detect capability gaps and suggest agent creation
 * POST /api/meta/analyze-gap
 * Body: { task: string, availableContext: object }
 */
app.post("/api/meta/analyze-gap", async (req, res) => {
	try {
		const { task, availableContext = {} } = req.body;

		if (!task) {
			return res.status(400).json({
				success: false,
				error: "Task is required"
			});
		}

		const gapAnalysis = await metaAgent.handleCapabilityGap(task, availableContext);

		res.json({
			success: true,
			...gapAnalysis
		});
	} catch (error) {
		console.error("[Meta-Agent] Gap analysis error:", error);
		res.status(500).json({
			success: false,
			error: IS_PROD ? "Internal server error" : error.message
		});
	}
});

/**
 * Invoke a generated agent
 * POST /api/meta/agents/:id/invoke
 * Body: { input: object }
 */
app.post("/api/meta/agents/:id/invoke", async (req, res) => {
	try {
		const { id } = req.params;
		const { input } = req.body;

		if (!input || typeof input !== 'object') {
			return res.status(400).json({
				success: false,
				error: "Input object is required"
			});
		}

		// Find the agent
		let agent = await dbService.db.collection('generated_agents').findOne({ name: id });
		
		if (!agent) {
			try {
				const { ObjectId } = await import('mongodb');
				agent = await dbService.db.collection('generated_agents').findOne({ _id: new ObjectId(id) });
			} catch (e) {
				// Invalid ObjectId
			}
		}

		if (!agent) {
			return res.status(404).json({
				success: false,
				error: "Agent not found"
			});
		}

		// Validate input against schema
		const Ajv = (await import('ajv')).default;
		const ajv = new Ajv();
		const validate = ajv.compile(agent.schemas.inputSchema);
		
		if (!validate(input)) {
			return res.status(400).json({
				success: false,
				error: "Input validation failed",
				errors: validate.errors
			});
		}

		// For now, we return a simulated result based on the test case
		// In a full implementation, you would dynamically execute the agent code
		console.log(`[Meta-Agent] Invoking ${agent.name} with input:`, input);

		// Return the test expected output structure as a demonstration
		res.json({
			success: true,
			agent: agent.name,
			input,
			message: "Agent invocation simulated. In production, this would execute the generated code.",
			note: "To fully execute, save the agent code to a file and import it dynamically.",
			testCase: agent.testResult?.testCase
		});

	} catch (error) {
		console.error("[Meta-Agent] Invoke agent error:", error);
		res.status(500).json({
			success: false,
			error: IS_PROD ? "Internal server error" : error.message
		});
	}
});

// ============================================================================
// AGENTS API
// ============================================================================

app.get("/api/agents", (req, res) => {
	res.json({
		agents: [
			{
				id: "search",
				name: "SearchAgent",
				description: "Web search with intelligent planning and result analysis",
				capabilities: [
					"Strategy planning",
					"Missing context detection",
					"Google Custom Search integration",
					"Result structuring",
					"Answer quality assessment",
					"Follow-up suggestions",
				],
				endpoint: "/api/agents/search",
			},
			{
				id: "terminal",
				name: "TerminalAgent",
				description: "Generate safe, executable terminal commands",
				capabilities: [
					"Command generation",
					"Risk assessment",
					"Safety checks",
					"Multi-shell support",
					"Parameter validation",
				],
				endpoint: "/api/agents/terminal",
			},
			{
				id: "code",
				name: "CodeGenerator",
				description: "Generate code from natural language descriptions",
				capabilities: [
					"Multi-language support",
					"Context-aware generation",
					"Best practices",
					"Documentation included",
				],
				endpoint: "/api/agents/code",
			},
			{
				id: "schema",
				name: "SchemaAgent",
				description: "Generate JSON Schemas from natural language",
				capabilities: [
					"Natural language to schema",
					"Design rationale",
					"Constraint handling",
					"Schema validation",
				],
				endpoint: "/api/agents/schema",
			},
			{
				id: "router",
				name: "IntelligentRouter",
				description: "Automatically routes to the best agent for the task",
				capabilities: [
					"Autonomous decision making",
					"Missing context detection",
					"Confidence scoring",
					"Multi-agent coordination",
				],
				endpoint: "/api/router",
			},
		],
	});
});

// SearchAgent endpoint
app.post("/api/agents/search", async (req, res) => {
	try {
		const { userQuery, maxResults, refinedQuery } = req.body;

		if (!userQuery) {
			return res.status(400).json({
				error: "userQuery is required",
			});
		}

		const result = await agents.search.search({
			userQuery,
			maxResults: maxResults || 10,
			refinedQuery,
		});

		res.json({
			success: true,
			agent: "SearchAgent",
			result,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		res.status(500).json({
			error: IS_PROD ? "Internal server error" : error.message,
			agent: "SearchAgent",
		});
	}
});

// SearchAgent FAST endpoint (skips strategy planning)
app.post("/api/agents/search/fast", async (req, res) => {
	try {
		const { userQuery, maxResults, refinedQuery } = req.body;

		if (!userQuery) {
			return res.status(400).json({
				error: "userQuery is required",
			});
		}

		const result = await agents.searchFast.search({
			userQuery,
			maxResults: maxResults || 10,
			refinedQuery,
		});

		res.set('X-Performance-Mode', 'fast');
		res.json({
			success: true,
			agent: "SearchAgent",
			mode: "fast",
			result,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		res.status(500).json({
			error: IS_PROD ? "Internal server error" : error.message,
			agent: "SearchAgent",
		});
	}
});

// SearchAgent EXPRESS endpoint (cached responses)
app.post("/api/agents/search/express", async (req, res) => {
	try {
		const { userQuery, maxResults, refinedQuery } = req.body;

		if (!userQuery) {
			return res.status(400).json({
				error: "userQuery is required",
			});
		}

		const cacheContext = { maxResults: maxResults || 10, refinedQuery };
		
		// Check cache first
		if (globalCache.has(userQuery, cacheContext)) {
			const cached = globalCache.get(userQuery, cacheContext);
			res.set('X-Cache-Status', 'HIT');
			res.set('X-Cache-Age', cached._cache.age + 'ms');
			return res.json({
				success: true,
				agent: "SearchAgent",
				mode: "express",
				cached: true,
				result: cached,
				timestamp: new Date().toISOString(),
			});
		}

		// Cache miss - perform search with fast agent
		const startTime = Date.now();
		const result = await agents.searchFast.search({
			userQuery,
			maxResults: maxResults || 10,
			refinedQuery,
		});
		const responseTime = Date.now() - startTime;

		// Store in cache
		globalCache.set(userQuery, cacheContext, result);

		res.set('X-Cache-Status', 'MISS');
		res.set('X-Response-Time', responseTime + 'ms');
		res.set('X-Performance-Mode', 'express');
		res.json({
			success: true,
			agent: "SearchAgent",
			mode: "express",
			cached: false,
			result,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		res.status(500).json({
			error: IS_PROD ? "Internal server error" : error.message,
			agent: "SearchAgent",
		});
	}
});

// TerminalAgent endpoint
app.post("/api/agents/terminal", async (req, res) => {
	try {
		const { task, context } = req.body;

		if (!task) {
			return res.status(400).json({
				error: "task is required",
			});
		}

		const startTime = Date.now();
		const result = await agents.terminal.generate(task, context || {});
		const responseTime = Date.now() - startTime;

		res.set('X-Response-Time', responseTime + 'ms');
		res.json({
			success: true,
			agent: "TerminalAgent",
			result,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		res.status(500).json({
			error: IS_PROD ? "Internal server error" : error.message,
			agent: "TerminalAgent",
		});
	}
});

// TerminalAgent EXPRESS endpoint (with caching)
app.post("/api/agents/terminal/express", async (req, res) => {
	try {
		const { task, context } = req.body;

		if (!task) {
			return res.status(400).json({
				error: "task is required",
			});
		}

		const cacheContext = { context: context || {} };
		
		// Check cache first
		if (globalCache.has(task, cacheContext)) {
			const cached = globalCache.get(task, cacheContext);
			res.set('X-Cache-Status', 'HIT');
			res.set('X-Cache-Age', cached._cache.age + 'ms');
			res.set('X-Performance-Mode', 'express');
			return res.json({
				success: true,
				agent: "TerminalAgent",
				mode: "express",
				cached: true,
				result: cached,
				timestamp: new Date().toISOString(),
			});
		}

		// Cache miss - generate terminal commands
		const startTime = Date.now();
		const result = await agents.terminal.generate(task, context || {});
		const responseTime = Date.now() - startTime;

		// Store in cache
		globalCache.set(task, cacheContext, result);

		res.set('X-Cache-Status', 'MISS');
		res.set('X-Response-Time', responseTime + 'ms');
		res.set('X-Performance-Mode', 'express');
		res.json({
			success: true,
			agent: "TerminalAgent",
			mode: "express",
			cached: false,
			result,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		res.status(500).json({
			error: IS_PROD ? "Internal server error" : error.message,
			agent: "TerminalAgent",
		});
	}
});

// CodeGenerator endpoint
app.post("/api/agents/code", async (req, res) => {
	try {
		const { prompt, context } = req.body;

		if (!prompt) {
			return res.status(400).json({
				error: "prompt is required",
			});
		}

		const startTime = Date.now();
		const result = await agents.code.generate(prompt, context || {});
		const responseTime = Date.now() - startTime;

		res.set('X-Response-Time', responseTime + 'ms');
		res.json({
			success: true,
			agent: "CodeGenerator",
			result,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		res.status(500).json({
			error: IS_PROD ? "Internal server error" : error.message,
			agent: "CodeGenerator",
		});
	}
});

// CodeGenerator EXPRESS endpoint (with caching)
app.post("/api/agents/code/express", async (req, res) => {
	try {
		const { prompt, context } = req.body;

		if (!prompt) {
			return res.status(400).json({
				error: "prompt is required",
			});
		}

		const cacheContext = { context: context || {} };
		
		// Check cache first
		if (globalCache.has(prompt, cacheContext)) {
			const cached = globalCache.get(prompt, cacheContext);
			res.set('X-Cache-Status', 'HIT');
			res.set('X-Cache-Age', cached._cache.age + 'ms');
			res.set('X-Performance-Mode', 'express');
			return res.json({
				success: true,
				agent: "CodeGenerator",
				mode: "express",
				cached: true,
				result: cached,
				timestamp: new Date().toISOString(),
			});
		}

		// Cache miss - generate code
		const startTime = Date.now();
		const result = await agents.code.generate(prompt, context || {});
		const responseTime = Date.now() - startTime;

		// Store in cache
		globalCache.set(prompt, cacheContext, result);

		res.set('X-Cache-Status', 'MISS');
		res.set('X-Response-Time', responseTime + 'ms');
		res.set('X-Performance-Mode', 'express');
		res.json({
			success: true,
			agent: "CodeGenerator",
			mode: "express",
			cached: false,
			result,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		res.status(500).json({
			error: IS_PROD ? "Internal server error" : error.message,
			agent: "CodeGenerator",
		});
	}
});

// CodeImprover endpoint
app.post("/api/agents/code/improve", async (req, res) => {
	try {
		const { code, context } = req.body;

		if (!code) {
			return res.status(400).json({
				error: "code is required",
			});
		}

		const startTime = Date.now();
		const result = await agents.codeImprover.improve(code, context || {});
		const responseTime = Date.now() - startTime;

		res.set('X-Response-Time', responseTime + 'ms');
		res.json({
			success: true,
			agent: "CodeImprover",
			result,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		res.status(500).json({
			error: IS_PROD ? "Internal server error" : error.message,
			agent: "CodeImprover",
		});
	}
});

// CodeImprover EXPRESS endpoint (with caching)
app.post("/api/agents/code/improve/express", async (req, res) => {
	try {
		const { code, context } = req.body;

		if (!code) {
			return res.status(400).json({
				error: "code is required",
			});
		}

		const cacheContext = { context: context || {} };
		
		// Check cache first
		if (globalCache.has(code, cacheContext)) {
			const cached = globalCache.get(code, cacheContext);
			res.set('X-Cache-Status', 'HIT');
			res.set('X-Cache-Age', cached._cache.age + 'ms');
			res.set('X-Performance-Mode', 'express');
			return res.json({
				success: true,
				agent: "CodeImprover",
				mode: "express",
				cached: true,
				result: cached,
				timestamp: new Date().toISOString(),
			});
		}

		// Cache miss - improve code
		const startTime = Date.now();
		const result = await agents.codeImprover.improve(code, context || {});
		const responseTime = Date.now() - startTime;

		// Store in cache
		globalCache.set(code, cacheContext, result);

		res.set('X-Cache-Status', 'MISS');
		res.set('X-Response-Time', responseTime + 'ms');
		res.set('X-Performance-Mode', 'express');
		res.json({
			success: true,
			agent: "CodeImprover",
			mode: "express",
			cached: false,
			result,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		res.status(500).json({
			error: IS_PROD ? "Internal server error" : error.message,
			agent: "CodeImprover",
		});
	}
});

// SchemaAgent endpoint
app.post("/api/agents/schema", async (req, res) => {
	try {
		const { userPrompt, context, extraConstraints } = req.body;

		if (!userPrompt) {
			return res.status(400).json({
				error: "userPrompt is required",
			});
		}

		const result = await agents.schema.generateSchema({
			userPrompt,
			context,
			extraConstraints,
		});

		res.json({
			success: true,
			agent: "SchemaAgent",
			result,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		res.status(500).json({
			error: IS_PROD ? "Internal server error" : error.message,
			agent: "SchemaAgent",
		});
	}
});

// ============================================================================
// INTELLIGENT ROUTER API
// ============================================================================

app.post("/api/router", async (req, res) => {
	try {
		const { userPrompt, context } = req.body;

		if (!userPrompt) {
			return res.status(400).json({
				error: "userPrompt is required",
			});
		}

		// Create a simple routing agent
		const router = new BaseMetaAgent({
			agentName: "APIRouter",
			systemPrompt: `You are an intelligent routing agent. Analyze user requests and decide which specialized agent to use:

- SearchAgent: Web search, current information, research
- TerminalAgent: System commands, file operations
- CodeGenerator: Programming, code generation
- SchemaAgent: Data structure design, JSON schemas
- Direct: Simple questions you can answer directly

Respond with your routing decision and reasoning.`,
		});

		const decision = await router.step({
			userPrompt: `Route this user request: "${userPrompt}"`,
			explicitSchema: {
				type: "object",
				properties: {
					selectedAgent: {
						type: "string",
						enum: ["search", "terminal", "code", "schema", "direct"],
					},
					reasoning: { type: "string" },
					confidence: { type: "number", minimum: 0, maximum: 1 },
					parameters: { type: "object" },
				},
				required: ["selectedAgent", "reasoning", "confidence"],
			},
		});

		// Execute the routed request
		let result = null;

		switch (decision.selectedAgent) {
			case "search":
				result = await agents.search.search({
					userQuery: userPrompt,
					maxResults: 5,
				});
				break;

			case "terminal":
				result = await agents.terminal.generate(userPrompt, context || {});
				break;

			case "code":
				result = await agents.code.generate(userPrompt, context || {});
				break;

			case "schema":
				result = await agents.schema.generateSchema({
					userPrompt,
					context: JSON.stringify(context || {}),
				});
				break;

			case "direct":
				result = await router.step({
					userPrompt,
				});
				break;
		}

		res.json({
			success: true,
			routing: {
				selectedAgent: decision.selectedAgent,
				reasoning: decision.reasoning,
				confidence: decision.confidence,
			},
			result,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		res.status(500).json({
			error: IS_PROD ? "Internal server error" : error.message,
			service: "IntelligentRouter",
		});
	}
});

// ============================================================================
// SCHEMA REGISTRY API
// ============================================================================

app.post("/api/schema/register", async (req, res) => {
	try {
		const { schemaName, schema, description, tags } = req.body;

		if (!schemaName || !schema) {
			return res.status(400).json({
				error: "schemaName and schema are required",
			});
		}

		const registered = await schemaRegistry.registerSchema({
			schemaName,
			schema,
			description,
			tags,
		});

		res.json({
			success: true,
			schema: registered,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		res.status(500).json({
			error: IS_PROD ? "Internal server error" : error.message,
			service: "SchemaRegistry",
		});
	}
});

app.get("/api/schema/:name", (req, res) => {
	try {
		const schema = schemaRegistry.getSchema(req.params.name);

		if (!schema) {
			return res.status(404).json({
				error: "Schema not found",
				schemaName: req.params.name,
			});
		}

		res.json({
			success: true,
			schema,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		res.status(500).json({
			error: IS_PROD ? "Internal server error" : error.message,
			service: "SchemaRegistry",
		});
	}
});

app.post("/api/schema/search", (req, res) => {
	try {
		const { query } = req.body;

		if (!query) {
			return res.status(400).json({
				error: "query is required",
			});
		}

		const results = schemaRegistry.searchSchemas(query);

		res.json({
			success: true,
			query,
			results,
			count: results.length,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		res.status(500).json({
			error: IS_PROD ? "Internal server error" : error.message,
			service: "SchemaRegistry",
		});
	}
});

app.get("/api/schema", (req, res) => {
	try {
		const allSchemas = schemaRegistry.listSchemas();

		res.json({
			success: true,
			schemas: allSchemas,
			count: allSchemas.length,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		res.status(500).json({
			error: IS_PROD ? "Internal server error" : error.message,
			service: "SchemaRegistry",
		});
	}
});

// ============================================================================
// SCHEMA MEDIATOR API - Universal Schema Translation
// ============================================================================

/**
 * Translate data from one schema to another
 * POST /api/schema/translate
 *
 * Body:
 * {
 *   data: { ... },              // Source data to transform
 *   sourceSchema: { ... },      // JSON Schema of source
 *   targetSchema: { ... },      // JSON Schema of target
 *   sourceSchemaName: "string", // Name for caching (optional)
 *   targetSchemaName: "string", // Name for caching (optional)
 *   context: { ... },           // Mapping hints, rules (optional)
 *   enforceValidation: boolean  // Throw on validation failure (optional)
 * }
 */
app.post("/api/schema/translate", async (req, res) => {
	try {
		const {
			data,
			sourceSchema,
			targetSchema,
			sourceSchemaName,
			targetSchemaName,
			context,
			enforceValidation,
		} = req.body;

		if (!data || !sourceSchema || !targetSchema) {
			return res.status(400).json({
				error: "data, sourceSchema, and targetSchema are required",
			});
		}

		const result = await agents.schemaMediator.translate({
			data,
			sourceSchema,
			targetSchema,
			sourceSchemaName,
			targetSchemaName,
			context,
			enforceValidation,
		});

		res.json(result);
	} catch (error) {
		res.status(500).json({
			success: false,
			error: IS_PROD ? "Internal server error" : error.message,
			service: "SchemaMediatorAgent",
		});
	}
});

/**
 * Infer a schema from example data
 * POST /api/schema/infer
 *
 * Body:
 * {
 *   data: { ... },              // Example data
 *   schemaName: "string"        // Optional name for the schema
 * }
 */
app.post("/api/schema/infer", async (req, res) => {
	try {
		const { data, schemaName } = req.body;

		if (!data) {
			return res.status(400).json({
				error: "data is required",
			});
		}

		const result = await agents.schemaMediator.inferSchema(data, schemaName);

		res.json({
			success: true,
			...result,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: IS_PROD ? "Internal server error" : error.message,
			service: "SchemaMediatorAgent",
		});
	}
});

/**
 * Create bidirectional mapping between two schemas
 * POST /api/schema/mapping/bidirectional
 *
 * Body:
 * {
 *   schemaA: { ... },          // First schema
 *   schemaB: { ... },          // Second schema
 *   schemaNameA: "string",     // Name for schema A (optional)
 *   schemaNameB: "string"      // Name for schema B (optional)
 * }
 */
app.post("/api/schema/mapping/bidirectional", async (req, res) => {
	try {
		const { schemaA, schemaB, schemaNameA, schemaNameB } = req.body;

		if (!schemaA || !schemaB) {
			return res.status(400).json({
				error: "schemaA and schemaB are required",
			});
		}

		const result = await agents.schemaMediator.createBidirectionalMapping(
			schemaA,
			schemaB,
			schemaNameA,
			schemaNameB
		);

		res.json({
			success: true,
			forward: result.forward,
			reverse: result.reverse,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: IS_PROD ? "Internal server error" : error.message,
			service: "SchemaMediatorAgent",
		});
	}
});

/**
 * Retry translation with additional context
 * POST /api/schema/translate/retry
 *
 * Body:
 * {
 *   data: { ... },
 *   sourceSchema: { ... },
 *   targetSchema: { ... },
 *   sourceSchemaName: "string",
 *   targetSchemaName: "string",
 *   previousMissingContext: [...],
 *   additionalContext: { ... }
 * }
 */
app.post("/api/schema/translate/retry", async (req, res) => {
	try {
		const {
			data,
			sourceSchema,
			targetSchema,
			sourceSchemaName,
			targetSchemaName,
			previousMissingContext,
			additionalContext,
		} = req.body;

		if (!data || !sourceSchema || !targetSchema) {
			return res.status(400).json({
				error: "data, sourceSchema, and targetSchema are required",
			});
		}

		const result = await agents.schemaMediator.retryWithContext({
			data,
			sourceSchema,
			targetSchema,
			sourceSchemaName,
			targetSchemaName,
			previousMissingContext,
			additionalContext,
		});

		res.json(result);
	} catch (error) {
		res.status(500).json({
			success: false,
			error: IS_PROD ? "Internal server error" : error.message,
			service: "SchemaMediatorAgent",
		});
	}
});

/**
 * Get Schema Mediator statistics
 * GET /api/schema/mediator/stats
 */
app.get("/api/schema/mediator/stats", (req, res) => {
	try {
		const stats = agents.schemaMediator.getStats();

		res.json({
			success: true,
			stats,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: IS_PROD ? "Internal server error" : error.message,
			service: "SchemaMediatorAgent",
		});
	}
});

/**
 * Clear Schema Mediator cache
 * POST /api/schema/mediator/cache/clear
 */
app.post("/api/schema/mediator/cache/clear", (req, res) => {
	try {
		agents.schemaMediator.clearCache();

		res.json({
			success: true,
			message: "Cache cleared successfully",
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: IS_PROD ? "Internal server error" : error.message,
			service: "SchemaMediatorAgent",
		});
	}
});

// ============================================================================
// CUSTOM AGENT CREATION API
// ============================================================================

app.post("/api/custom-agent", async (req, res) => {
	try {
		const { agentName, systemPrompt, userPrompt, schema } = req.body;

		if (!agentName || !userPrompt) {
			return res.status(400).json({
				error: "agentName and userPrompt are required",
			});
		}

		// Create a custom agent on-the-fly
		const customAgent = new BaseMetaAgent({
			agentName,
			systemPrompt:
				systemPrompt || `You are ${agentName}, a helpful AI assistant.`,
		});

		const result = await customAgent.step({
			userPrompt,
			explicitSchema: schema,
		});

		res.json({
			success: true,
			agent: agentName,
			result,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		res.status(500).json({
			error: IS_PROD ? "Internal server error" : error.message,
			service: "CustomAgent",
		});
	}
});

// ============================================================================
// USER AGENT MANAGEMENT
// ============================================================================

/**
 * POST /api/agents/register
 * Register a new user-created agent
 *
 * Body:
 * {
 *   "userId": "user123",
 *   "name": "MyCustomAgent",
 *   "description": "My custom agent for X",
 *   "prompt": "You are a helpful assistant specialized in X...",
 *   "metadata": { ... }
 * }
 */
app.post("/api/agents/register", async (req, res) => {
	try {
		const { userId, name, description, prompt, schema, metadata } = req.body;

		if (!userId || !name) {
			return res.status(400).json({
				error: "userId and name are required",
			});
		}

		if (!prompt) {
			return res.status(400).json({
				error: "prompt is required - this defines how your agent behaves",
			});
		}

		const registeredAgent = await agentRegistry.registerUserAgent(userId, {
			name,
			description,
			prompt,
			schema,
			metadata,
		});

		res.json({
			success: true,
			message: `Agent '${name}' registered successfully`,
			agent: registeredAgent,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		res.status(400).json({
			error: IS_PROD ? "Internal server error" : error.message,
			service: "AgentRegistration",
		});
	}
});

/**
 * PUT /api/agents/update
 * Update an existing user-created agent
 *
 * Body:
 * {
 *   "userId": "user123",
 *   "agentName": "MyCustomAgent",
 *   "updates": {
 *     "description": "Updated description",
 *     "prompt": "Updated prompt...",
 *     "metadata": { ... }
 *   }
 * }
 */
app.put("/api/agents/update", async (req, res) => {
	try {
		const { userId, agentName, updates } = req.body;

		if (!userId || !agentName || !updates) {
			return res.status(400).json({
				error: "userId, agentName, and updates are required",
			});
		}

		const updatedAgent = await agentRegistry.updateUserAgent(
			userId,
			agentName,
			updates
		);

		res.json({
			success: true,
			message: `Agent '${agentName}' updated successfully`,
			agent: updatedAgent,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		res.status(400).json({
			error: IS_PROD ? "Internal server error" : error.message,
			service: "AgentUpdate",
		});
	}
});

/**
 * DELETE /api/agents/delete
 * Delete a user-created agent
 *
 * Body:
 * {
 *   "userId": "user123",
 *   "agentName": "MyCustomAgent"
 * }
 */
app.delete("/api/agents/delete", async (req, res) => {
	try {
		const { userId, agentName } = req.body;

		if (!userId || !agentName) {
			return res.status(400).json({
				error: "userId and agentName are required",
			});
		}

		const deleted = await agentRegistry.deleteUserAgent(userId, agentName);

		if (!deleted) {
			return res.status(404).json({
				error: `Agent '${agentName}' not found`,
				service: "AgentDeletion",
			});
		}

		res.json({
			success: true,
			message: `Agent '${agentName}' deleted successfully`,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		res.status(400).json({
			error: IS_PROD ? "Internal server error" : error.message,
			service: "AgentDeletion",
		});
	}
});

/**
 * GET /api/agents/my-agents/:userId
 * Get all agents for a specific user
 */
app.get("/api/agents/my-agents/:userId", async (req, res) => {
	try {
		const { userId } = req.params;

		if (!userId) {
			return res.status(400).json({
				error: "userId is required",
			});
		}

		const userAgents = agentRegistry.getUserAgents(userId);

		res.json({
			success: true,
			userId,
			count: userAgents.length,
			agents: userAgents,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		res.status(500).json({
			error: IS_PROD ? "Internal server error" : error.message,
			service: "UserAgentRetrieval",
		});
	}
});

/**
 * GET /api/agents/my-agents/:userId/:agentName
 * Get a specific user agent
 */
app.get("/api/agents/my-agents/:userId/:agentName", async (req, res) => {
	try {
		const { userId, agentName } = req.params;

		const agent = agentRegistry.getUserAgent(userId, agentName);

		if (!agent) {
			return res.status(404).json({
				error: `Agent '${agentName}' not found for user ${userId}`,
				service: "UserAgentRetrieval",
			});
		}

		res.json({
			success: true,
			agent,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		res.status(500).json({
			error: IS_PROD ? "Internal server error" : error.message,
			service: "UserAgentRetrieval",
		});
	}
});

/**
 * POST /api/agents/invoke-user-agent
 * Invoke a user-created agent
 *
 * Body:
 * {
 *   "userId": "user123",
 *   "agentName": "MyCustomAgent",
 *   "context": {
 *     "userPrompt": "What can you help me with?",
 *     ...additional context
 *   }
 * }
 */
app.post("/api/agents/invoke-user-agent", async (req, res) => {
	try {
		const { userId, agentName, context } = req.body;

		if (!userId || !agentName || !context) {
			return res.status(400).json({
				error: "userId, agentName, and context are required",
			});
		}

		const result = await agentRegistry.invokeUserAgent(
			userId,
			agentName,
			context
		);

		res.json({
			success: true,
			result,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		res.status(400).json({
			error: IS_PROD ? "Internal server error" : error.message,
			service: "UserAgentInvocation",
		});
	}
});

/**
 * GET /api/admin/agents
 * Get all user-created agents (admin only)
 *
 * Query params:
 * - adminKey: Secret admin key for authentication
 */
app.get("/api/admin/agents", async (req, res) => {
	try {
		const { adminKey } = req.query;

		// Simple admin key check (in production, use proper auth)
		if (adminKey !== process.env.ADMIN_KEY) {
			return res.status(403).json({
				error: "Forbidden: Invalid admin credentials",
				service: "AdminAgentRetrieval",
			});
		}

		const allUserAgents = agentRegistry.getAllUserAgents();
		const stats = agentRegistry.getStats();

		res.json({
			success: true,
			stats,
			count: allUserAgents.length,
			agents: allUserAgents,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		res.status(500).json({
			error: IS_PROD ? "Internal server error" : error.message,
			service: "AdminAgentRetrieval",
		});
	}
});

// ============================================================================
// START SERVER
// ============================================================================

const server = app.listen(PORT, () => {
	console.log("\n" + "=".repeat(80));
	console.log("🌉 LUMEN BRIDGE - Self-Aware Agent API Server");
	console.log("=".repeat(80));
	console.log(`\n✅ Server running on http://localhost:${PORT}`);
	console.log("\n📚 Available Services:");
	console.log(`   • SearchAgent: http://localhost:${PORT}/api/agents/search`);
	console.log(`   • SearchAgent (Fast): http://localhost:${PORT}/api/agents/search/fast`);
	console.log(`   • SearchAgent (Express): http://localhost:${PORT}/api/agents/search/express`);
	console.log(
		`   • TerminalAgent: http://localhost:${PORT}/api/agents/terminal`
	);
	console.log(
		`   • TerminalAgent (Express): http://localhost:${PORT}/api/agents/terminal/express`
	);
	console.log(`   • CodeGenerator: http://localhost:${PORT}/api/agents/code`);
	console.log(`   • CodeGenerator (Express): http://localhost:${PORT}/api/agents/code/express`);
	console.log(`   • CodeImprover: http://localhost:${PORT}/api/agents/code/improve`);
	console.log(`   • CodeImprover (Express): http://localhost:${PORT}/api/agents/code/improve/express`);
	console.log(`   • SchemaAgent: http://localhost:${PORT}/api/agents/schema`);
	console.log(
		`   • SchemaMediatorAgent: http://localhost:${PORT}/api/schema/translate`
	);
	console.log(`   • IntelligentRouter: http://localhost:${PORT}/api/router`);
	console.log(`   • SchemaRegistry: http://localhost:${PORT}/api/schema`);
	console.log(`   • CustomAgents: http://localhost:${PORT}/api/custom-agent`);
	console.log("\n⚡ Performance Features:");
	console.log(`   • Cache Statistics: GET http://localhost:${PORT}/api/cache/stats`);
	console.log(`   • Clear Cache: POST http://localhost:${PORT}/api/cache/clear?adminKey=KEY`);
	console.log(`   • Fast Mode: Skip strategy planning for 50% speed improvement`);
	console.log(`   • Express Mode: Cached responses (<1ms for cache hits)`);
	console.log(`   • Response Time Headers: X-Response-Time, X-Cache-Status`);
	console.log("\n💾 Session Memory:");
	console.log(`   • Current Session Stats: GET http://localhost:${PORT}/api/session/stats`);
	console.log(`   • Session History: GET http://localhost:${PORT}/api/session/history`);
	console.log(`   • Clear Session: POST http://localhost:${PORT}/api/session/clear`);
	console.log(`   • All Sessions (admin): GET http://localhost:${PORT}/api/sessions/all?adminKey=KEY`);
	console.log("\n👤 User Agent Management:");
	console.log(
		`   • Register Agent: POST http://localhost:${PORT}/api/agents/register`
	);
	console.log(
		`   • Update Agent: PUT http://localhost:${PORT}/api/agents/update`
	);
	console.log(
		`   • Delete Agent: DELETE http://localhost:${PORT}/api/agents/delete`
	);
	console.log(
		`   • My Agents: GET http://localhost:${PORT}/api/agents/my-agents/:userId`
	);
	console.log(
		`   • Invoke User Agent: POST http://localhost:${PORT}/api/agents/invoke-user-agent`
	);
	console.log(
		`   • Admin View All: GET http://localhost:${PORT}/api/admin/agents?adminKey=XXX`
	);
	console.log(`\n📖 Documentation: http://localhost:${PORT}/api/docs`);
	console.log("\n🎯 Use Cases:");
	console.log("   1. Build AI chat applications");
	console.log("   2. Create custom agent workflows");
	console.log("   3. Integrate web search into apps");
	console.log("   4. Generate code and schemas programmatically");
	console.log("   5. Build autonomous AI assistants");
	console.log("\n🌉 Future Self Bridge Architecture - Ready to serve!\n");
});

// Cache statistics endpoint
app.get("/api/cache/stats", (req, res) => {
	res.json({
		success: true,
		stats: globalCache.getStats(),
		timestamp: new Date().toISOString(),
	});
});

// Clear cache endpoint (admin)
app.post("/api/cache/clear", (req, res) => {
	const { adminKey } = req.query;
	
	if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
		return res.status(403).json({
			error: "Admin key required",
		});
	}

	globalCache.clear();
	res.json({
		success: true,
		message: "Cache cleared",
		timestamp: new Date().toISOString(),
	});
});

// ============================================================================
// SESSION MEMORY ENDPOINTS
// ============================================================================

// Get session memory statistics for current user
app.get("/api/session/stats", (req, res) => {
	const stats = sessionMemoryManager.getStatsForRequest(req);
	res.json({
		success: true,
		session: stats,
		timestamp: new Date().toISOString(),
	});
});

// Get all session statistics (admin only)
app.get("/api/sessions/all", (req, res) => {
	const { adminKey } = req.query;
	
	if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
		return res.status(403).json({
			error: "Admin key required",
		});
	}

	const allStats = sessionMemoryManager.getAllStats();
	res.json({
		success: true,
		...allStats,
		timestamp: new Date().toISOString(),
	});
});

// Clear current session memory
app.post("/api/session/clear", (req, res) => {
	const cleared = sessionMemoryManager.clearSessionFromRequest(req);
	res.json({
		success: cleared,
		message: cleared ? "Session memory cleared" : "No session found",
		timestamp: new Date().toISOString(),
	});
});

// Get conversation history for current session
app.get("/api/session/history", (req, res) => {
	const context = sessionMemoryManager.getContextForRequest(req);
	const stats = sessionMemoryManager.getStatsForRequest(req);
	
	res.json({
		success: true,
		sessionId: req.sessionId,
		context,
		stats,
		timestamp: new Date().toISOString(),
	});
});

// 404 handler — must come after all routes
app.use((req, res) => {
	res.status(404).json({
		success: false,
		error: { code: "NOT_FOUND", message: "Route not found" },
	});
});

// Centralized error handler — must be last
app.use(errorHandler);

// Graceful shutdown
const shutdown = async (sig) => {
	console.log(`\n${sig} received, shutting down gracefully...`);
	server.close(async () => {
		try {
			if (dbService?.client?.close) await dbService.client.close();
			else if (dbService?.close) await dbService.close();
		} catch (err) {
			console.error("Error closing DB:", err.message);
		}
		console.log("Shutdown complete.");
		process.exit(0);
	});
	setTimeout(() => {
		console.error("Forced exit after 10s timeout");
		process.exit(1);
	}, 10_000).unref();
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default app;
