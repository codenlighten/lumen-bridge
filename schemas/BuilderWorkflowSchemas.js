/**
 * Builder Workflow Schemas
 * 
 * Three-layer architecture for self-iterating builder agent:
 * 1. Vision - final state specification
 * 2. Task Graph - dependency-aware task DAG
 * 3. Execution Primitive - single step response
 */

export const ExecutionPrimitiveSchema = {
  type: "object",
  properties: {
    mode: {
      type: "string",
      enum: ["reason", "code"],
      description: "Whether this step is reasoning/planning or code generation"
    },
    response: {
      type: ["string", "null"],
      description: "Natural language reasoning/explanation (required if mode=reason)"
    },
    missingContext: {
      type: "array",
      items: { type: "string" },
      description: "Explicit list of what information is still needed"
    },
    code: {
      type: ["object", "null"],
      properties: {
        language: {
          type: "string",
          description: "Programming language (javascript, typescript, python, etc.)"
        },
        filename: {
          type: ["string", "null"],
          description: "Target file path relative to project root"
        },
        body: {
          type: "string",
          description: "The actual code content"
        },
        note: {
          type: ["string", "null"],
          description: "Brief note about this code change"
        }
      },
      required: ["language", "body"],
      additionalProperties: false,
      description: "Code payload (required if mode=code, must be null if mode=reason)"
    },
    continue: {
      type: "boolean",
      description: "Whether to loop another iteration (true) or consider this phase done (false)"
    },
    nextPipe: {
      type: ["string", "null"],
      enum: ["self", "executor", "tester", "other-agent", null],
      description: "Where the next token of work should go"
    }
  },
  required: ["mode", "response", "missingContext", "code", "continue", "nextPipe"],
  additionalProperties: false
};

export const TaskSchema = {
  type: "object",
  properties: {
    id: {
      type: "string",
      description: "Unique task identifier (kebab-case recommended)"
    },
    kind: {
      type: "string",
      enum: ["code", "test", "config", "docs", "infra"],
      description: "Type of work this task represents"
    },
    target: {
      type: ["string", "null"],
      description: "Target file path if applicable"
    },
    dependsOn: {
      type: "array",
      items: { type: "string" },
      description: "Array of task IDs that must complete before this can start"
    },
    description: {
      type: "string",
      description: "Clear description of what this task must accomplish"
    },
    status: {
      type: "string",
      enum: ["pending", "runnable", "running", "done", "blocked", "failed"],
      description: "Current execution status"
    },
    estimatedComplexity: {
      type: "string",
      enum: ["trivial", "simple", "moderate", "complex", "very-complex"],
      description: "Rough complexity estimate"
    },
    assignedWorker: {
      type: ["string", "null"],
      description: "Worker ID if task is assigned"
    }
  },
  required: ["id", "kind", "dependsOn", "description", "status"],
  additionalProperties: false
};

export const ModuleSchema = {
  type: "object",
  properties: {
    id: {
      type: "string",
      description: "Unique module identifier"
    },
    summary: {
      type: "string",
      description: "Brief description of module purpose"
    },
    files: {
      type: "array",
      items: { type: "string" },
      description: "List of file paths this module encompasses"
    },
    dependsOnModules: {
      type: "array",
      items: { type: "string" },
      description: "Module IDs this depends on"
    },
    apis: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          type: { type: "string", enum: ["function", "class", "endpoint", "event"] },
          signature: { type: "string" }
        }
      },
      description: "Public APIs this module exposes"
    }
  },
  required: ["id", "summary", "files", "dependsOnModules"],
  additionalProperties: false
};

export const VisionSpecSchema = {
  type: "object",
  properties: {
    projectName: {
      type: "string",
      description: "Name of the project being built"
    },
    summary: {
      type: "string",
      description: "High-level description of the final system"
    },
    modules: {
      type: "array",
      items: ModuleSchema,
      description: "Logical modules that make up the system"
    },
    constraints: {
      type: "object",
      properties: {
        language: { type: "string" },
        moduleSystem: { type: "string" },
        runtime: { type: "string" },
        framework: { type: ["string", "null"] },
        testing: { type: ["string", "null"] },
        targetEnv: { type: "string" }
      },
      description: "Technical constraints and decisions"
    },
    features: {
      type: "array",
      items: { type: "string" },
      description: "Key features the final system must have"
    }
  },
  required: ["projectName", "summary", "modules", "constraints"],
  additionalProperties: false
};

export const TaskGraphSchema = {
  type: "object",
  properties: {
    projectName: {
      type: "string",
      description: "Name of the project"
    },
    tasks: {
      type: "array",
      items: TaskSchema,
      description: "All tasks in dependency order"
    },
    buildOrder: {
      type: "array",
      items: { type: "string" },
      description: "Suggested execution order respecting dependencies"
    },
    runnableTasks: {
      type: "array",
      items: { type: "string" },
      description: "Task IDs that can be started immediately"
    }
  },
  required: ["projectName", "tasks", "buildOrder"],
  additionalProperties: false
};

export const SchedulerStateSchema = {
  type: "object",
  properties: {
    iteration: {
      type: "number",
      description: "Current iteration number"
    },
    tasksCompleted: {
      type: "array",
      items: { type: "string" },
      description: "Task IDs that are done"
    },
    tasksRunning: {
      type: "array",
      items: { type: "string" },
      description: "Task IDs currently executing"
    },
    tasksBlocked: {
      type: "array",
      items: { type: "string" },
      description: "Task IDs blocked by dependencies or errors"
    },
    tasksFailed: {
      type: "array",
      items: { type: "string" },
      description: "Task IDs that failed"
    },
    executionHistory: {
      type: "array",
      items: {
        type: "object",
        properties: {
          taskId: { type: "string" },
          mode: { type: "string" },
          summary: { type: "string" },
          timestamp: { type: "string" }
        }
      },
      description: "Log of recent executions"
    },
    tokensUsed: {
      type: "number",
      description: "Approximate token count used so far"
    },
    maxIterations: {
      type: "number",
      description: "Safety limit on total iterations"
    }
  },
  required: ["iteration", "tasksCompleted", "tasksRunning", "tasksBlocked", "tasksFailed"],
  additionalProperties: false
};

export default {
  ExecutionPrimitiveSchema,
  TaskSchema,
  ModuleSchema,
  VisionSpecSchema,
  TaskGraphSchema,
  SchedulerStateSchema
};
