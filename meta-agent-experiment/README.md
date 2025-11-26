# Meta-Agent Experiment

**WARNING: Experimental Code - Not Production Ready**

This folder contains experimental implementations of the Meta-Agent / Agent Factory pattern - the capability for LumenBridge to create new agents on-demand.

## What This Is

A Meta-Agent is an agent that can:
1. **Detect gaps** in system capabilities
2. **Design new agents** (with schemas, code, and infrastructure)
3. **Deploy them** (containerized, signed, registered)
4. **Verify they work** (test handshake)
5. **Integrate them** into the routing mesh

This moves LumenBridge from **Static Intelligence** (using pre-built tools) to **Generative Intelligence** (building tools as needed).

## Core Principle

The Meta-Agent uses **only the 12 primitives** from `PrimitiveKernel`. It's not magic - it's strict composition:

- `detectMissingContext` → notices capability gaps
- `planSchema` → designs agent specifications & I/O schemas
- `query` → fills in specs, generates plans
- `generateCode` → produces agent classes & infrastructure
- `executeCommand` → builds & deploys containers
- `spawnAgent` → registers new agent with keys
- `signData` → cryptographically verifies artifacts
- `validateOutput` → ensures conformance to schemas
- `captureReasoning` → logs the entire genesis event
- `shareContext` → makes new agent available to ToolRouter
- `composeOperations` → creates workflows using new agent

## The 6-Phase Lifecycle

### Phase 1: Trigger (Intent Definition)
User: *"I need an agent that analyzes PDF contracts and flags liability clauses"*

Meta-Agent creates an `AgentSpecification`:
```json
{
  "name": "ContractAnalyzerAgent",
  "purpose": "Analyze PDF contracts for risk",
  "inputs": ["base64_pdf"],
  "outputs": ["risk_score", "clauses_array"],
  "constraints": ["Must use pdf-parse library", "Max latency 5s"]
}
```

### Phase 2: Interface (Schema Design)
Meta-Agent designs:
- `ContractAnalysisRequest.schema.json` (input)
- `RiskAssessment.schema.json` (output)

This is the **type signature** before any code exists.

### Phase 3: Implementation (Code Genesis)
Meta-Agent generates `ContractAnalyzerAgent.ts`:
- Extends `BaseMetaAgent`
- Implements required methods
- Conforms to LumenBridge patterns

### Phase 4: Body (Infrastructure)
Meta-Agent creates:
- Dockerfile (minimal, secure, dependencies)
- Node spec (deployment manifest)
- Builds & pushes container image

### Phase 5: Soul (Identity & Registration)
Meta-Agent:
- Generates key pair for new agent
- Signs all artifacts (spec, schemas, code, node-spec)
- Registers in Agent Registry & Hub
- Makes discoverable via ToolRouter

### Phase 6: Handshake (Verification)
Meta-Agent:
- Sends real test request to new agent
- Validates response against output schema
- Verifies signature
- Logs entire genesis + test run
- Creates workflows using the new capability

## Files in This Experiment

- `MetaAgent.ts` - Main Meta-Agent implementation
- `PrimitiveKernel.ts` - The 12 primitives (copied from main system)
- `AgentSpecification.schema.json` - Schema for agent specifications
- `AgentClassSchema.schema.json` - Schema for generated agent code structure
- `DockerNodeSchema.schema.json` - Schema for container deployment specs
- `examples/` - Example generations
- `tests/` - Tests for Meta-Agent lifecycle

## Why This Matters

### Before Meta-Agent:
- System uses tools you give it
- Static capability set
- Human bottleneck for new features

### After Meta-Agent:
- System builds tools it needs
- Dynamic capability expansion
- Self-evolution (but governed by schemas + signatures)

This is **Forth's self-hosting**, but for AI agents:
- The system writes new "words" (agents)
- Compiles them into the "dictionary" (registry)
- Uses them like they were always there

## Safety Boundaries

Meta-Agent is **tightly constrained**:
1. **Schema-governed**: All artifacts must conform to schemas
2. **Cryptographically signed**: Every agent + artifact is signed
3. **Containerized**: New agents run in isolated containers
4. **Verified**: Must pass handshake test before registration
5. **Logged**: Full genesis event captured in memory

## Usage Example

```typescript
import { MetaAgent } from './MetaAgent.js';

const metaAgent = new MetaAgent({
  llmProvider: openAIProvider,
  memoryManager: memoryMgr,
  agentRegistry: registry
});

const result = await metaAgent.createNewAgent(
  "I need an agent that analyzes PDF contracts and flags liability clauses"
);

// result contains:
// - agentSpec
// - schemas (input + output)
// - code (TypeScript class)
// - infra (Dockerfile + node-spec)
// - keys (public/private pair)
// - testResult (proof it works)
// - _signature (cryptographic verification)
```

## Current Status

**EXPERIMENTAL** - This is a proof-of-concept. Do not use in production.

## Next Steps

1. Implement basic `MetaAgent.ts` skeleton
2. Create schema files for agent specs
3. Build example: PDF contract analyzer
4. Test full 6-phase lifecycle
5. Add safety constraints & validation
6. Integration tests with main LumenBridge

## Philosophy

This isn't just "code generation". This is:

> **A cognitive OS that notices its own limitations, designs missing capabilities, implements and deploys them, and absorbs them into its routing mesh.**

The Meta-Agent is the boundary between static and generative intelligence.
