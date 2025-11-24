/**
 * ProjectContract Schema
 * 
 * Single source of truth for all project nuances:
 * - Language, module system, runtime
 * - Framework, package manager
 * - Coding standards, testing framework
 * - Build tools, environment constraints
 * 
 * This schema is cryptographically signed and becomes the
 * constitution that all agents must follow.
 */

export const ProjectContractSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    projectName: { 
      type: "string",
      description: "Unique project identifier"
    },
    description: { 
      type: "string",
      description: "High-level project description"
    },
    language: { 
      type: "string", 
      enum: ["javascript", "typescript"],
      description: "Primary programming language"
    },
    moduleSystem: { 
      type: "string", 
      enum: ["esm", "commonjs"],
      description: "Module system (ES6 modules vs CommonJS)"
    },
    runtime: { 
      type: "string", 
      enum: ["node", "browser", "deno", "bun"],
      description: "Target runtime environment"
    },
    nodeVersion: { 
      type: "string",
      description: "Node.js version (e.g., '20.0.0', '18.0.0')",
      pattern: "^\\d+\\.\\d+\\.\\d+$"
    },
    framework: { 
      type: "string",
      description: "Primary framework (express, nextjs, fastify, etc.)",
      examples: ["express", "nextjs", "fastify", "koa", "hono"]
    },
    packageManager: { 
      type: "string", 
      enum: ["npm", "yarn", "pnpm", "bun"],
      description: "Package manager to use"
    },
    codingStandards: {
      type: "object",
      additionalProperties: false,
      properties: {
        eslintConfig: { 
          type: "string",
          description: "ESLint configuration (airbnb, standard, google, etc.)"
        },
        prettier: { 
          type: "boolean",
          description: "Whether to use Prettier for formatting"
        },
        styleGuide: { 
          type: "string",
          description: "Code style guide reference",
          examples: ["airbnb", "standard", "google"]
        },
        strictMode: {
          type: "boolean",
          description: "TypeScript strict mode (if using TS)"
        }
      },
      required: ["eslintConfig"]
    },
    testing: {
      type: "object",
      additionalProperties: false,
      properties: {
        framework: { 
          type: "string", 
          enum: ["jest", "vitest", "mocha", "ava", "tap"],
          description: "Testing framework"
        },
        coverageRequired: { 
          type: "boolean",
          description: "Whether code coverage is required"
        },
        coverageThreshold: {
          type: "number",
          minimum: 0,
          maximum: 100,
          description: "Minimum coverage percentage required"
        }
      },
      required: ["framework"]
    },
    buildTool: { 
      type: "string",
      description: "Build/bundler tool",
      examples: ["vite", "webpack", "tsup", "esbuild", "rollup"]
    },
    envConstraints: {
      type: "object",
      additionalProperties: true,
      description: "Additional environment-specific constraints"
    },
    deployment: {
      type: "object",
      properties: {
        platform: {
          type: "string",
          examples: ["caprover", "docker", "vercel", "aws", "digitalocean"]
        },
        containerized: {
          type: "boolean"
        }
      }
    }
  },
  required: [
    "projectName",
    "description",
    "language",
    "moduleSystem",
    "runtime",
    "packageManager"
  ]
};

export default ProjectContractSchema;
