# 🏗️ Self-Iterating Builder Workflow

**A three-layer architecture for AI-driven software development with dependency-aware task scheduling and self-iterating reason/code loops.**

---

## 🎯 Core Concept

Instead of monolithic "build everything" prompts, this system implements a **true builder's mental model**:

1. **Vision** - What's the final state? (architecture, modules, APIs)
2. **Plan** - What must exist before what? (dependency DAG)
3. **Execute** - Build each piece through reason ↔ code iteration

This matches how experienced developers actually work: understand the whole, break it down causally, execute the critical path efficiently.

---

## 🏛️ Architecture

### Layer 1: Vision → Final State Specification

**VisionAgent** takes a project description and produces a structured `VisionSpec`:

```javascript
{
  projectName: "blog-api",
  summary: "RESTful blog with posts and comments",
  modules: [
    {
      id: "post-service",
      summary: "Post CRUD operations",
      files: ["src/services/postService.js"],
      dependsOnModules: ["post-model", "storage"],
      apis: [
        { name: "createPost", type: "function", signature: "(data) => Post" }
      ]
    },
    // ... more modules
  ],
  constraints: {
    language: "javascript",
    moduleSystem: "ESM",
    runtime: "Node.js",
    framework: "Express"
  }
}
```

**Key insight**: This is architecture as data - not prose, but structured dependencies and contracts.

---

### Layer 2: Vision → Task Graph (Dependency DAG)

**TaskPlannerAgent** converts the vision into executable tasks:

```javascript
{
  projectName: "blog-api",
  tasks: [
    {
      id: "create-post-model",
      kind: "code",
      target: "src/models/post.js",
      dependsOn: [],  // No dependencies = can start immediately
      description: "Define Post interface with validation",
      status: "runnable",
      estimatedComplexity: "simple"
    },
    {
      id: "create-post-service",
      kind: "code",
      target: "src/services/postService.js",
      dependsOn: ["create-post-model", "create-storage"],
      description: "Implement CRUD using Post model",
      status: "pending",  // Blocked until dependencies complete
      estimatedComplexity: "moderate"
    }
  ],
  buildOrder: ["create-post-model", "create-storage", "create-post-service", ...],
  runnableTasks: ["create-post-model", "create-storage"]  // No dependencies
}
```

**Key insight**: This is a DAG scheduler - tasks unlock as dependencies complete, enabling parallelism.

---

### Layer 3: Task → Self-Iterating Execution

**BuilderAgent** executes a single task through a **reason ↔ code loop**:

```javascript
// Iteration 1: REASON mode
{
  mode: "reason",
  response: "I'll implement Post model with title, content, author, createdAt. Need validation for required fields.",
  missingContext: [],
  code: null,
  continue: true,
  nextPipe: "self"
}

// Iteration 2: CODE mode
{
  mode: "code",
  response: null,
  missingContext: [],
  code: {
    language: "javascript",
    filename: "src/models/post.js",
    body: "export class Post { ... }",
    note: "First implementation"
  },
  continue: true,
  nextPipe: "executor"
}

// Iteration 3: After execution feedback
{
  mode: "reason",
  response: "Tests failed: missing validation. I'll add input sanitization.",
  missingContext: [],
  code: null,
  continue: true,
  nextPipe: "self"
}

// ... continues until task complete
{
  mode: "reason",
  response: "All tests passing. Task complete.",
  missingContext: [],
  code: null,
  continue: false,
  nextPipe: null
}
```

**Key insight**: The agent alternates between planning (reason) and doing (code), just like a human developer debugging a feature.

---

## 🔄 The Complete Flow

```
User Request
    ↓
┌─────────────────────────────────────────┐
│ VisionAgent                             │
│ "What's the final system?"              │
│ → VisionSpec (modules, APIs, deps)      │
└─────────────┬───────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ TaskPlannerAgent                        │
│ "What must exist before what?"          │
│ → TaskGraph (DAG of tasks)              │
└─────────────┬───────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Orchestrator (Scheduler)                │
│ 1. Find runnable tasks (no deps)        │
│ 2. Spawn BuilderAgents in parallel      │
│ 3. Wait for completions                 │
│ 4. Unlock new tasks                     │
│ 5. Repeat until done                    │
└─────────────┬───────────────────────────┘
              ↓
     Multiple BuilderAgents
     (reason ↔ code loops)
              ↓
      Complete Project
```

---

## 🎨 Mode Discipline

The **ExecutionPrimitive** has strict rules:

### When `mode = "reason"`:
- `response` **MUST** be non-null (reasoning text)
- `code` **MUST** be null
- Use for: planning, explaining, analyzing errors, deciding next steps

### When `mode = "code"`:
- `code` **MUST** be non-null (actual implementation)
- `response` **SHOULD** be null or very brief
- Use for: generating files, writing implementations

### `missingContext` (always allowed):
- Array of explicit "I need this information" items
- If `length > 0`, agent is telling you "I'm partial"
- Examples: `["test results", "API documentation", "file contents of auth.js"]`

### `continue` (boolean):
- `true` = "Run me again with updated context"
- `false` = "I consider this task done"

### `nextPipe` (routing):
- `"self"` = stay in BuilderAgent (reason/code loop)
- `"executor"` = code needs to be run/written
- `"tester"` = run tests on the code
- `null` = "I'm done, hand back to orchestrator"

---

## 🚀 Usage

### Basic Example

```javascript
import { BuilderOrchestrator } from './utilities/BuilderOrchestrator.js';

const orchestrator = new BuilderOrchestrator({
  maxParallelTasks: 3,      // Run 3 tasks simultaneously
  maxIterationsPerTask: 20,  // Max 20 reason/code loops per task
  maxTotalIterations: 100    // Safety limit for entire build
});

const result = await orchestrator.build(
  // Project description
  "Build a RESTful API for task management with auth, CRUD, and search",
  
  // Technical constraints
  {
    language: "javascript",
    runtime: "Node.js",
    framework: "Express",
    testing: "Jest"
  }
);

console.log(result.vision);      // Final architecture
console.log(result.taskGraph);   // Dependency DAG
console.log(result.execution);   // Build results
```

### Component Testing

```javascript
// Test Vision creation
import { VisionAgent } from './agents/VisionAgent.js';
const visionAgent = new VisionAgent();
const vision = await visionAgent.createVision("Build a blog API");

// Test Task planning
import { TaskPlannerAgent } from './agents/TaskPlannerAgent.js';
const planner = new TaskPlannerAgent();
const taskGraph = await planner.planTasks(vision);

// Test single task execution
import { BuilderAgent } from './agents/BuilderAgent.js';
const builder = new BuilderAgent();
const result = await builder.executeTask({
  task: taskGraph.tasks[0],
  context: { projectState: vision },
  maxIterations: 10
});
```

---

## 📊 Schemas

All schemas follow Lumen Bridge conventions (JSON Schema format):

### ExecutionPrimitiveSchema
The agent's response format for each iteration.

### VisionSpecSchema
Final-state architecture specification.

### TaskGraphSchema
Dependency-aware task DAG.

### TaskSchema
Individual task definition.

### ModuleSchema
Logical module with dependencies.

### SchedulerStateSchema
Orchestrator state tracking.

See `schemas/BuilderWorkflowSchemas.js` for full definitions.

---

## 🎯 Why This Works

### 1. **Separates Concerns**
- Vision = what
- Planning = when (causality)
- Execution = how

### 2. **Enables Parallelism**
- DAG scheduler runs independent tasks simultaneously
- No artificial sequencing of unrelated work

### 3. **Self-Aware Iteration**
- Agent knows when it needs more info (`missingContext`)
- Agent knows when it's done (`continue: false`)
- Agent routes work explicitly (`nextPipe`)

### 4. **Matches Human Cognition**
- Architect thinks in modules and dependencies
- Planner thinks in critical path
- Coder iterates: plan → code → test → fix → done

### 5. **Scales Naturally**
- Small projects: simple DAG, quick execution
- Large projects: complex DAG, parallel workers
- Same primitives, different scale

---

## 🔒 Safety Guardrails

### Max Iterations Per Task
```javascript
maxIterationsPerTask: 20  // Prevent infinite reason/code loops
```

### Max Total Iterations
```javascript
maxTotalIterations: 100   // Prevent runaway builds
```

### Stuck Detection
If no runnable tasks and no running tasks, but work remains → build is stuck (blocked tasks).

### Failed Task Propagation
If task fails, all dependent tasks are marked as blocked.

---

## 🧪 Demo & Testing

```bash
# Run component tests
node test-builder-workflow.js

# Run full demo (builds a complete project)
node demo-builder-workflow.js
```

---

## 🔮 Future Extensions

### Multi-Agent Specialization
```javascript
nextPipe: "security-reviewer"  // Route to specialized agent
nextPipe: "performance-optimizer"
nextPipe: "documentation-writer"
```

### Dynamic Rescheduling
```javascript
// If task is taking too long, split it
planner.splitTask(taskId, strategy);

// If task failed, try alternative approach
planner.createAlternativeTask(taskId);
```

### Human-in-the-Loop
```javascript
// Agent requests human input
{
  mode: "reason",
  missingContext: ["user preference for auth strategy (JWT vs sessions)"],
  continue: false,
  nextPipe: "human"
}
```

---

## 📝 Key Files

```
schemas/
  BuilderWorkflowSchemas.js     # All JSON schemas

agents/
  VisionAgent.js                # Layer 1: Architecture
  TaskPlannerAgent.js           # Layer 2: Task DAG
  BuilderAgent.js               # Layer 3: Self-iterating executor

utilities/
  BuilderOrchestrator.js        # Main orchestrator with scheduler

test-builder-workflow.js        # Component tests
demo-builder-workflow.js        # Full demo
```

---

## 🎓 Design Philosophy

This system implements **causality-first scheduling** + **self-iterating primitives**:

1. **Vision** defines what exists at the end
2. **DAG** defines what must precede what (causality)
3. **Scheduler** finds the critical path (efficiency)
4. **Agent** executes with self-awareness (iteration)

It's not "prompt engineering" - it's **structured cognition for builders**.

---

## 🌟 The Real Innovation

Other AI coding systems give you:
- "Generate this file" (no awareness of dependencies)
- "Build this feature" (no iteration on errors)
- "Here's the whole codebase" (no incremental refinement)

This system gives you:
- **Architectural thinking** (vision as structured data)
- **Dependency awareness** (DAG scheduling)
- **Self-iteration** (reason until you understand, code until tests pass)
- **Parallelism** (multiple independent tasks simultaneously)

**It's the difference between a script and a builder brain.**
