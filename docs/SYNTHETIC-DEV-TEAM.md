# Synthetic Dev Team 🤖👨‍💻

> **Self-aware AI agents that plan, build, test, and integrate code in parallel**

The Synthetic Dev Team extends the "future self bridge" pattern to create a **"future team bridge"** - where a single architect agent decomposes a project into cryptographically-signed task tickets (BoxSpecs), then spawns multiple worker agents that execute in parallel, each returning a signed black box of completed work.

## 🎯 The Vision

Instead of one AI agent doing everything sequentially, imagine a **morning standup** where:

1. **Product Owner** (you) describes the project
2. **Architect** (ProjectPlannerAgent) creates a contract and task tickets
3. **Dev Team** (N × CodeWorkerAgents) work in parallel on different tickets
4. **Tech Lead** (IntegrationAgent) verifies everything fits together
5. **CTO** (SyntheticDevTeam) orchestrates the entire operation

Each agent operates autonomously, signs its work cryptographically, and communicates via schemas - **just like a real distributed team**.

---

## 🏗️ Architecture

### The Team Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    SYNTHETIC DEV TEAM                        │
│                   (SyntheticDevTeam.js)                      │
│                                                              │
│  Orchestrates: planning → parallel execution → integration  │
└──────────────────────┬───────────────────────────────────────┘
                       │
           ┌───────────┴───────────┐
           │                       │
           ▼                       ▼
┌─────────────────────┐  ┌─────────────────────┐
│ ProjectPlannerAgent │  │  IntegrationAgent   │
│                     │  │                     │
│ • createContract()  │  │ • verifySchemas()   │
│ • decomposeBoxes()  │  │ • checkContracts()  │
│ • planProject()     │  │ • generateGlue()    │
└──────────┬──────────┘  └─────────────────────┘
           │
           │ creates N BoxSpecs
           │
           ▼
┌─────────────────────────────────────────────┐
│        N × CodeWorkerAgents                 │
│                                             │
│  Each executes ONE BoxSpec:                 │
│  1. Generate code                           │
│  2. Analyze (lint/types)                    │
│  3. Run tests                               │
│  4. Refine (max 5 iterations)               │
│  5. Return signed black box                 │
│                                             │
│  All running IN PARALLEL                    │
└─────────────────────────────────────────────┘
```

### The Data Flow

```
User Input (natural language)
       │
       ▼
ProjectContract (signed constitution)
  ├─ language: "JavaScript" | "TypeScript"
  ├─ moduleSystem: "ESM" | "CommonJS"
  ├─ runtime: "Node.js" | "Browser" | "Deno"
  ├─ framework: "Express" | "React" | ...
  ├─ testing: { framework, coverage }
  ├─ codingStandards: { eslint, prettier }
  └─ _meta: { contractHash, signature }
       │
       ▼
BoxSpec[] (signed task tickets)
  Each BoxSpec:
  ├─ boxName: "userController"
  ├─ sourceFilePath: "src/controllers/user.js"
  ├─ responsibility: "Handle user CRUD operations"
  ├─ inputSchema: { type: "object", ... }
  ├─ outputSchema: { type: "object", ... }
  ├─ dependsOnBoxes: ["userModel", "validator"]
  ├─ acceptanceTests: ["should create user", ...]
  └─ _meta: { boxHash, signature }
       │
       ▼
BlackBox[] (signed completed work)
  Each BlackBox:
  ├─ boxName: "userController"
  ├─ code: "export function createUser() { ... }"
  ├─ testResults: { passed: 5, failed: 0 }
  ├─ metadata: { iterations: 2, linesOfCode: 87 }
  └─ signature: "304502..."
```

---

## 🧩 Core Components

### 1. ProjectContract (The Constitution)

**File**: `schemas/ProjectContractSchema.js`

The **single source of truth** for all project constraints. Prevents ES6/CommonJS/TypeScript/JavaScript drift.

```javascript
{
  projectName: "todo-api",
  language: "JavaScript",
  moduleSystem: "ESM",  // Forces import/export
  runtime: "Node.js",
  nodeVersion: "20.x",
  framework: "Express",
  packageManager: "npm",
  testing: {
    framework: "Jest",
    coverageRequired: 80
  },
  codingStandards: {
    eslintConfig: "airbnb-base",
    prettier: true
  }
}
```

**Why it matters**: When 5 worker agents are building different modules in parallel, they ALL must follow the same rules. No mixing `require()` and `import`, no mixing JS and TS, no framework conflicts.

### 2. BoxSpec (The Task Ticket)

**File**: `schemas/BoxSpecSchema.js`

A cryptographically-signed **task ticket** defining what ONE worker must build.

```javascript
{
  boxName: "userController",
  sourceFilePath: "src/controllers/user.js",
  responsibility: "Handle user CRUD operations via REST endpoints",
  
  inputSchema: {
    type: "object",
    properties: {
      userModel: { type: "function" },
      validator: { type: "function" }
    }
  },
  
  outputSchema: {
    type: "object",
    properties: {
      createUser: { type: "function" },
      getUser: { type: "function" },
      updateUser: { type: "function" },
      deleteUser: { type: "function" }
    }
  },
  
  dependsOnBoxes: ["userModel", "validator"],
  
  acceptanceTests: [
    "should create user with valid data",
    "should reject invalid email",
    "should return 404 for missing user"
  ],
  
  _meta: {
    boxHash: "a3f2...",
    signature: "3045..."
  }
}
```

**Why it matters**: The contract between architect and worker. The worker MUST satisfy the outputSchema, pass all acceptanceTests, and respect dependencies. The signature proves no tampering.

### 3. ProjectPlannerAgent (The Architect)

**File**: `agents/ProjectPlannerAgent.js`

Extends `BaseMetaAgent`. The **brain** that turns user specs into executable plans.

**Key Methods**:

- `createContract(projectSpec)` - Natural language → signed ProjectContract
- `decomposeIntoBoxes(contract, featureSpec)` - Project → array of BoxSpecs
- `planProject(projectSpec, featureSpec)` - Full workflow

**Example**:

```javascript
const planner = new ProjectPlannerAgent();

const plan = await planner.planProject(
  "Build a REST API with Express and Jest",
  "Create user CRUD endpoints with validation"
);

// Returns:
{
  contract: { projectName, language, moduleSystem, ... },
  decomposition: {
    boxes: [
      { boxName: "userModel", ... },
      { boxName: "validator", ... },
      { boxName: "userController", ... },
      { boxName: "routes", ... },
      { boxName: "server", ... }
    ],
    buildOrder: ["userModel", "validator", "userController", "routes", "server"]
  }
}
```

### 4. CodeWorkerAgent (The Developer)

**File**: `agents/CodeWorkerAgent.js`

Extends `BaseMetaAgent`. A **single developer** working on ONE BoxSpec.

**Work Loop**:

1. **Generate** code following BoxSpec and ProjectContract
2. **Analyze** code (lint, type check, module system validation)
3. **Test** code against acceptance tests
4. **Refine** if tests fail (max 5 iterations)
5. **Package** as signed black box

**Example**:

```javascript
const worker = new CodeWorkerAgent({
  boxSpec: boxSpecs[0],
  projectContract: contract
});

const result = await worker.executeBox();

// Returns:
{
  status: "completed",
  boxName: "userController",
  sourceFilePath: "src/controllers/user.js",
  code: "export function createUser() { ... }",
  testResults: { passed: 5, failed: 0, totalTests: 5 },
  metadata: {
    iterations: 2,
    linesOfCode: 87,
    analysisWarnings: []
  },
  signature: "304502..."
}
```

**Blocked state**: If worker encounters missing context, it returns:

```javascript
{
  status: "blocked",
  boxName: "userController",
  missingContext: [
    "What database should be used? (MongoDB, PostgreSQL, etc.)",
    "Should passwords be hashed? If so, which algorithm?"
  ]
}
```

### 5. SyntheticDevTeam (The CTO)

**File**: `utilities/SyntheticDevTeam.js`

The **orchestrator** that manages the entire operation.

**Workflow**:

```javascript
const team = new SyntheticDevTeam();

const deliverable = await team.buildProject({
  projectSpec: "Build Express REST API with Jest",
  featureSpec: "User CRUD with validation"
});

// Internally:
// 1. ProjectPlannerAgent creates contract + boxes
// 2. Organizes boxes into build levels (topological sort)
// 3. Spawns CodeWorkerAgents in parallel (Promise.all)
// 4. Monitors progress, collects black boxes
// 5. IntegrationAgent verifies schemas align
// 6. Assembles final deliverable
```

**Parallel Execution**:

```
Level 1: [userModel, validator] → Execute in parallel
  ↓
Level 2: [userController] → Waits for Level 1
  ↓
Level 3: [routes] → Waits for Level 2
  ↓
Level 4: [server] → Waits for Level 3
```

---

## 🚀 Usage

### Quick Start

```javascript
import SyntheticDevTeam from './utilities/SyntheticDevTeam.js';

const team = new SyntheticDevTeam();

const deliverable = await team.buildProject({
  projectSpec: `
    Build a Node.js REST API using:
    - ES6 modules
    - Express.js
    - Jest testing
    - In-memory storage
  `,
  
  featureSpec: `
    Create Todo API with:
    - GET /api/todos (list all)
    - POST /api/todos (create)
    - PUT /api/todos/:id (update)
    - DELETE /api/todos/:id (delete)
    
    Requirements:
    - Input validation
    - Error handling
    - 80% test coverage
  `
});

// Write files
deliverable.files.forEach(file => {
  fs.writeFileSync(file.path, file.content);
});
```

### Run the Demo

```bash
# Test individual components
node test-synthetic-team.js

# Run full synthetic dev team
node demo-synthetic-team.js
```

**Output**:

```
████████████████████████████████████████████████████████████████████████████████
█                    SYNTHETIC DEV TEAM DEMO                            █
████████████████████████████████████████████████████████████████████████████████

  👨‍💼 Product Owner: You (provides spec)
  🏗️  Architect: ProjectPlannerAgent (creates contract + boxes)
  👨‍💻 Developers: N × CodeWorkerAgents (work in parallel)
  🔗 Tech Lead: IntegrationAgent (verifies alignment)
  📦 CTO: SyntheticDevTeam (orchestrates everything)

================================================================================
🏗️  SYNTHETIC DEV TEAM - MORNING STANDUP
================================================================================

📋 Product Owner: "Build a production-ready Node.js REST API using..."
📝 Feature Request: "Create a Todo API with the following endpoints..."

================================================================================
📋 PHASE 1: PLANNING
================================================================================

✅ Project contract created: todo-api
   Contract hash: a3f2c8d9e4b5f1a7...

✅ Decomposed into 6 boxes:
   1. todoModel (src/models/todo.js)
   2. validator (src/middleware/validator.js)
   3. errorHandler (src/middleware/errorHandler.js)
   4. todoController (src/controllers/todo.js)
   5. routes (src/routes/todos.js)
   6. server (src/server.js)

📊 Build order: todoModel → validator, errorHandler → todoController → routes → server

================================================================================
⚙️  PHASE 2: PARALLEL EXECUTION
================================================================================

🚀 Spawning 6 CodeWorkerAgents...

📊 Build Strategy: 4 parallel stages
   Stage 1: todoModel
   Stage 2: validator, errorHandler
   Stage 3: todoController
   Stage 4: routes
   Stage 5: server

⚡ Executing Stage 1 (1 boxes in parallel)...
   ✅ Stage 1 complete: 1/1 succeeded

⚡ Executing Stage 2 (2 boxes in parallel)...
   ✅ Stage 2 complete: 2/2 succeeded

⚡ Executing Stage 3 (1 boxes in parallel)...
   ✅ Stage 3 complete: 1/1 succeeded

...

================================================================================
✅ SYNTHETIC DEV TEAM - END OF DAY REPORT
================================================================================

📊 Project: todo-api
   Contract Hash: a3f2c8d9e4b5f1a7...

📈 Statistics:
   Total Boxes: 6
   ✅ Completed: 6
   ⏸️  Blocked: 0
   ❌ Failed: 0
   Success Rate: 100.0%
   Total Lines: 487
   Total Iterations: 12

🔗 Integration:
   Status: ready
   Schemas Align: ✅
   Contracts Satisfied: ✅

📦 Deliverables: 6 files ready
   ✓ src/models/todo.js (todoModel)
   ✓ src/middleware/validator.js (validator)
   ✓ src/middleware/errorHandler.js (errorHandler)
   ✓ src/controllers/todo.js (todoController)
   ✓ src/routes/todos.js (routes)
   ✓ src/server.js (server)
```

---

## 🔐 Cryptographic Integrity

Every component is cryptographically signed:

### 1. ProjectContract Signature

```javascript
const contractHash = crypto
  .createHash('sha256')
  .update(JSON.stringify(contract))
  .digest('hex');

const signature = signer.sign(contractHash);

contract._meta = {
  contractHash,
  signature,
  timestamp: new Date().toISOString()
};
```

### 2. BoxSpec Signature

```javascript
const boxHash = crypto
  .createHash('sha256')
  .update(JSON.stringify(boxSpec))
  .digest('hex');

const signature = signer.sign(boxHash);

boxSpec._meta = {
  boxHash,
  signature,
  parentContractHash: contract._meta.contractHash
};
```

### 3. BlackBox Signature

```javascript
const workHash = crypto
  .createHash('sha256')
  .update(result.code + JSON.stringify(result.testResults))
  .digest('hex');

const signature = signer.sign(workHash);

result.signature = signature;
result._meta = {
  workHash,
  boxHash: boxSpec._meta.boxHash,
  contractHash: contract._meta.contractHash
};
```

**Chain of Trust**:

```
User Spec
  → ProjectContract (signed)
    → BoxSpec (signed, linked to contract)
      → BlackBox (signed, linked to box + contract)
```

---

## 📊 Real-World Example

### Input: Build a Todo API

```javascript
const projectSpec = `
Build a REST API with:
- Node.js 20+
- Express.js
- ES6 modules
- Jest testing (80% coverage)
- In-memory storage
`;

const featureSpec = `
Todo endpoints:
- GET /api/todos
- POST /api/todos
- PUT /api/todos/:id
- DELETE /api/todos/:id

Validation:
- Title required (max 200 chars)
- Proper HTTP status codes
- Error handling
`;
```

### Output: 6 Signed Files

```
✅ src/models/todo.js (87 lines, 5 tests)
✅ src/middleware/validator.js (62 lines, 4 tests)
✅ src/middleware/errorHandler.js (43 lines, 3 tests)
✅ src/controllers/todo.js (124 lines, 8 tests)
✅ src/routes/todos.js (58 lines, 6 tests)
✅ src/server.js (113 lines, 5 tests)

Total: 487 lines, 31 tests, 100% passing
```

### Integration Report

```json
{
  "schemasAlign": true,
  "contractsSatisfied": true,
  "issues": [],
  "glueCode": [],
  "integrationTests": [
    "Full API integration test",
    "End-to-end workflow test"
  ],
  "readyForDeployment": true
}
```

---

## 🎯 Key Benefits

### 1. **Parallel Execution**
- 5 boxes? 5 workers execute simultaneously
- Respects dependency graph (topological sort)
- Massive speed improvement over sequential

### 2. **Schema Negotiation**
- All workers follow same ProjectContract
- Input/output schemas verified
- No ES6/CommonJS/TS/JS drift

### 3. **Cryptographic Guarantees**
- Every contract, box, and deliverable is signed
- Tamper-proof chain of custody
- Verifiable lineage from spec → code

### 4. **Missing Context Detection**
- Workers pause when info is missing
- User prompted for specific decisions
- No hallucinated assumptions

### 5. **Test-Driven Development**
- Each box has acceptance tests
- Workers iterate until tests pass (max 5)
- Built-in quality assurance

### 6. **Self-Awareness**
- Future self bridge: plan schema → execute
- Each agent knows its constraints
- Autonomous but coordinated

---

## 🔮 Future Enhancements

### 1. **Job Queue Integration**

```javascript
// Instead of Promise.all, use Redis + Bull
const queue = new Queue('code-workers', { redis: { ... } });

boxes.forEach(box => {
  queue.add('build-box', { boxSpec: box, contract });
});

// Workers in separate containers poll queue
```

### 2. **Container Deployment**

```yaml
# docker-compose.yml
services:
  planner:
    image: lumen-planner
    environment:
      - OPENAI_API_KEY
  
  worker:
    image: lumen-worker
    replicas: 5
    environment:
      - OPENAI_API_KEY
      - WORKER_ID
```

### 3. **CapRover Integration**

```bash
# Deploy to CapRover cluster
caprover deploy --appName lumen-workers --replicas 10

# Workers auto-scale based on queue depth
```

### 4. **Advanced Integration**

```javascript
// IntegrationAgent generates:
{
  glueCode: [
    {
      purpose: "Connect userController to routes",
      code: "import { createUser } from './controllers/user.js';\n..."
    }
  ],
  integrationTests: [
    "End-to-end user creation flow",
    "Error handling across modules"
  ]
}
```

### 5. **Memory & Learning**

```javascript
// Remember successful patterns
const memory = await memoryManager.recall({
  context: "Building Express REST API",
  type: "successful-decomposition"
});

// Reuse proven architectures
```

---

## 🧪 Testing

### Component Tests

```bash
# Test individual components
node test-synthetic-team.js
```

Output:
```
✓ ProjectPlannerAgent creates contracts
✓ ProjectPlannerAgent decomposes into boxes
✓ CodeWorkerAgent executes boxes
✓ Generated code compiles and passes tests
```

### Full System Demo

```bash
# Run complete synthetic dev team
node demo-synthetic-team.js
```

Output:
```
✅ 6/6 boxes completed
✅ Integration verified
✅ 487 lines of code
✅ 31 tests passing
📦 Ready for deployment
```

---

## 📚 Related Documentation

- **[Future Self Bridge](./FUTURE-SELF-BRIDGE.md)** - The core self-aware architecture
- **[BaseMetaAgent](./agents/BaseMetaAgent.js)** - Foundation for all agents
- **[API Documentation](./API-README.md)** - REST API for agents
- **[Build Summary](./BUILD-SUMMARY.md)** - Technical achievements

---

## 🎓 Mental Model

Think of it like a **real development team**:

1. **Morning Standup**: Architect presents contract + task tickets
2. **Work Day**: Developers work in parallel on their tickets
3. **Code Review**: Tech lead verifies everything integrates
4. **Deployment**: CTO assembles and ships

Except:
- ⚡ **Instant** standup (seconds)
- 🔄 **Parallel** execution (N workers)
- 🔐 **Cryptographically** signed work
- 🧪 **Test-driven** by default
- 🤖 **Autonomous** workers
- 📊 **Schema-based** communication

---

## 💡 Philosophy

> **"The future self bridge becomes a future team bridge"**

Instead of one agent executing sequentially, we create a **synthetic organization** where:

- Architect **plans** with schemas
- Workers **execute** in parallel
- Tech lead **verifies** alignment
- CTO **orchestrates** the whole operation

Each agent is **self-aware** (knows its constraints), **autonomous** (works independently), yet **coordinated** (follows the same contract).

This is the **evolution** of AI agents: from single actors to distributed teams.

---

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## 📄 License

MIT

---

**Built with Lumen Bridge** - Self-aware AI agents that build the future 🌉

