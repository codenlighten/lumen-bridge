/**
 * BoxSpec Schema
 * 
 * A "ticket" for a worker agent. Each BoxSpec defines:
 * - What to build (responsibility, file path)
 * - Input/output contracts (schemas)
 * - Dependencies on other boxes
 * - Acceptance criteria/tests
 * 
 * BoxSpecs are cryptographically signed, creating a
 * legal contract for each component.
 */

export const BoxSpecSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    boxName: {
      type: "string",
      description: "Unique identifier for this box/component",
      pattern: "^[a-zA-Z][a-zA-Z0-9_-]*$"
    },
    sourceFilePath: {
      type: "string",
      description: "Where this code should live (e.g., 'src/services/authService.ts')"
    },
    responsibility: {
      type: "string",
      description: "Clear, concise description of what this box does"
    },
    inputSchema: {
      type: "object",
      description: "JSON Schema defining expected inputs",
      properties: {
        type: { type: "string" },
        properties: { type: "object" },
        required: { type: "array" }
      }
    },
    outputSchema: {
      type: "object",
      description: "JSON Schema defining guaranteed outputs",
      properties: {
        type: { type: "string" },
        properties: { type: "object" },
        required: { type: "array" }
      }
    },
    dependsOnBoxes: {
      type: "array",
      items: { type: "string" },
      description: "Names of other boxes this depends on"
    },
    acceptanceTests: {
      type: "array",
      items: {
        type: "object",
        properties: {
          testName: { type: "string" },
          description: { type: "string" },
          given: { type: "string" },
          when: { type: "string" },
          then: { type: "string" }
        },
        required: ["testName", "description"]
      },
      description: "Structured test specifications"
    },
    codeStructure: {
      type: "object",
      properties: {
        isClass: { type: "boolean" },
        isFunction: { type: "boolean" },
        exports: {
          type: "array",
          items: { type: "string" },
          description: "What this module exports"
        },
        imports: {
          type: "array",
          items: {
            type: "object",
            properties: {
              module: { type: "string" },
              items: { type: "array", items: { type: "string" } }
            }
          },
          description: "Expected imports"
        }
      }
    },
    complexity: {
      type: "string",
      enum: ["trivial", "simple", "moderate", "complex", "critical"],
      description: "Estimated complexity level"
    },
    priority: {
      type: "number",
      minimum: 1,
      maximum: 10,
      description: "Priority level (1=low, 10=critical)"
    },
    estimatedLines: {
      type: "number",
      description: "Estimated lines of code"
    }
  },
  required: [
    "boxName",
    "sourceFilePath",
    "responsibility",
    "outputSchema",
    "dependsOnBoxes",
    "acceptanceTests"
  ]
};

export default BoxSpecSchema;
