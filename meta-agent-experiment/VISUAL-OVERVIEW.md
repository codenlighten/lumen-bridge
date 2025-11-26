# Meta-Agent Experiment - Visual Overview

## The Holy Grail Pattern: AI That Builds AI

```
┌─────────────────────────────────────────────────────────────────┐
│                        META-AGENT                               │
│  "The Agent Factory" - Creates new agents on-demand            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   6-PHASE LIFECYCLE           │
              └───────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼

┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Phase 1-2  │      │  Phase 3-4  │      │  Phase 5-6  │
│   DESIGN    │      │    BUILD    │      │  INTEGRATE  │
├─────────────┤      ├─────────────┤      ├─────────────┤
│ • Intent    │      │ • Code      │      │ • Identity  │
│ • Spec      │      │ • Docker    │      │ • Register  │
│ • Schemas   │      │ • Deploy    │      │ • Verify    │
└─────────────┘      └─────────────┘      └─────────────┘
```

## The 12 Primitives: The Instruction Set

```
╔═══════════════════════════════════════════════════════════════╗
║              PRIMITIVE KERNEL (12 OPCODES)                    ║
╚═══════════════════════════════════════════════════════════════╝

  1. QUERY              ─┐
  2. REASON              ├─── Core Intelligence
  3. PLAN_SCHEMA         │
  4. VALIDATE_OUTPUT    ─┘

  5. EXECUTE_COMMAND    ─┐
  6. GENERATE_CODE       ├─── Creation Powers
  7. SPAWN_AGENT        ─┘

  8. CAPTURE_REASONING  ─┐
  9. SHARE_CONTEXT       ├─── Memory & Communication
 10. DETECT_MISSING_CTX ─┘

 11. SIGN_DATA          ─┐
 12. COMPOSE_OPERATIONS ─┘─── Security & Composition
```

## Phase-by-Phase Primitive Usage

```
┌──────────────────────────────────────────────────────────────┐
│ PHASE 1: TRIGGER (Intent → Specification)                   │
├──────────────────────────────────────────────────────────────┤
│ User: "I need an agent that analyzes PDF contracts"         │
│                                                              │
│ Primitives Used:                                            │
│   detectMissingContext() ───→ "No PDF analyzer exists"      │
│   planSchema() ─────────────→ Create AgentSpecification     │
│   query() ──────────────────→ Fill spec from user prompt    │
│                                                              │
│ Output: AgentSpecification {                                │
│   name: "ContractAnalyzerAgent"                             │
│   inputs: ["base64_pdf"]                                    │
│   outputs: ["risk_score", "clauses"]                        │
│ }                                                            │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ PHASE 2: INTERFACE (Schema Design)                          │
├──────────────────────────────────────────────────────────────┤
│ "Before code exists, the contract must exist"               │
│                                                              │
│ Primitives Used:                                            │
│   planSchema() ─────────────→ Design input schema           │
│   planSchema() ─────────────→ Design output schema          │
│   validateOutput() ─────────→ Ensure schemas valid          │
│                                                              │
│ Output: Type signatures (JSON Schemas)                      │
│   ContractAnalysisRequest.schema.json                       │
│   RiskAssessment.schema.json                                │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ PHASE 3: IMPLEMENTATION (Code Genesis)                      │
├──────────────────────────────────────────────────────────────┤
│ "Write the actual agent class"                              │
│                                                              │
│ Primitives Used:                                            │
│   generateCode() ───────────→ Create TypeScript class       │
│   validateOutput() ─────────→ Ensure extends PrimitiveKernel│
│                                                              │
│ Output: ContractAnalyzerAgent.ts                            │
│   class ContractAnalyzerAgent extends PrimitiveKernel {     │
│     async process(input) { ... }                            │
│   }                                                          │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ PHASE 4: BODY (Infrastructure)                              │
├──────────────────────────────────────────────────────────────┤
│ "Code needs a container to live in"                         │
│                                                              │
│ Primitives Used:                                            │
│   reason() ─────────────────→ Plan dependencies             │
│   generateCode() ───────────→ Create Dockerfile             │
│   executeCommand() ─────────→ docker build & push           │
│   validateOutput() ─────────→ Verify node-spec valid        │
│                                                              │
│ Output:                                                      │
│   Dockerfile                                                 │
│   node-spec.json (deployment manifest)                      │
│   lumenbridge/contractanalyzer:latest (image)               │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ PHASE 5: SOUL (Identity & Registration)                     │
├──────────────────────────────────────────────────────────────┤
│ "Grant the agent an identity and birth certificate"         │
│                                                              │
│ Primitives Used:                                            │
│   spawnAgent() ─────────────→ Generate keys, register       │
│   signData() ───────────────→ Sign all artifacts            │
│   shareContext() ───────────→ Notify ToolRouter             │
│                                                              │
│ Output:                                                      │
│   publicKey: "03a3a09594cf3d..."                            │
│   privateKey: "L1y4QuPXpD6..."                              │
│   Registry entry with capabilities                          │
│   Signature over {spec, schemas, code, keys}                │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ PHASE 6: HANDSHAKE (Verification)                           │
├──────────────────────────────────────────────────────────────┤
│ "Prove the agent actually works"                            │
│                                                              │
│ Primitives Used:                                            │
│   query() ──────────────────→ Generate test input           │
│   query() ──────────────────→ Call new agent                │
│   validateOutput() ─────────→ Check against output schema   │
│   signData() ───────────────→ Sign test result              │
│   captureReasoning() ───────→ Log entire genesis event      │
│   composeOperations() ──────→ Create workflows with it      │
│                                                              │
│ Output:                                                      │
│   Test passed ✓                                             │
│   Agent is live and registered                              │
│   Available via ToolRouter                                  │
└──────────────────────────────────────────────────────────────┘
```

## The Boundary: Static → Generative

```
         BEFORE META-AGENT              AFTER META-AGENT
    ┌─────────────────────┐        ┌─────────────────────┐
    │  Static Intelligence│        │Generative Intelligence│
    ├─────────────────────┤        ├─────────────────────┤
    │ • Use given tools   │   →    │ • Build needed tools│
    │ • Fixed capabilities│        │ • Dynamic expansion │
    │ • Human bottleneck  │        │ • Self-evolution    │
    │ • Orchestrator only │        │ • General contractor│
    └─────────────────────┘        └─────────────────────┘
```

## Forth Analogy: Self-Hosting

```
Traditional System:         Meta-Agent System:
┌──────────────┐           ┌──────────────┐
│ Pre-compiled │           │ Dictionary   │
│ Word Library │           │ (Dynamic)    │
├──────────────┤           ├──────────────┤
│ • DUP        │           │ • DUP        │
│ • SWAP       │           │ • SWAP       │
│ • +          │           │ • +          │
│ • *          │           │ • *          │
│              │           │ • : NEW_WORD │ ← System writes this
│              │           │ • : ANOTHER  │ ← And this
│              │           │ ...          │
└──────────────┘           └──────────────┘

   You call             System compiles new words
   existing words       and uses them like they
                       were always there
```

## Safety Boundaries

```
╔═══════════════════════════════════════════════════════════╗
║  Meta-Agent is TIGHTLY CONSTRAINED                        ║
╚═══════════════════════════════════════════════════════════╝

  1. Schema-Governed
     └─→ All artifacts must conform to JSON Schemas
  
  2. Cryptographically Signed
     └─→ Every agent + artifact has signature
  
  3. Containerized
     └─→ New agents run in isolated Docker containers
  
  4. Verified
     └─→ Must pass handshake test before registration
  
  5. Logged
     └─→ Full genesis event captured in memory
  
  6. Primitive-Only
     └─→ Can ONLY use the 12 primitives (no escape hatches)
```

## Real-World Example

```
User Request:
  "I need to analyze PDF contracts for liability clauses"

Meta-Agent Process:
  [1 sec]  detectMissingContext() → "No PDF analyzer"
  [2 sec]  planSchema() → Create AgentSpecification
  [3 sec]  planSchema() × 2 → Input/Output schemas
  [5 sec]  generateCode() → TypeScript class
  [3 sec]  generateCode() → Dockerfile
  [10 sec] executeCommand() → docker build & push
  [1 sec]  spawnAgent() → Keys + registration
  [2 sec]  query() → Test handshake
  [1 sec]  signData() → Final signature

Total: ~30 seconds

Result:
  ContractAnalyzerAgent is now:
    ✓ Deployed in container
    ✓ Registered with keys
    ✓ Available via ToolRouter
    ✓ Tested and verified
    ✓ Cryptographically signed
```

## What This Means

**This isn't just "code generation"**

This is:
> A cognitive OS that notices its own limitations, designs missing 
> capabilities, implements and deploys them, and absorbs them into 
> its routing mesh.

**Key Insight:**
The Meta-Agent uses the exact same 12 primitives as every other agent.
It's not "special" - it's just composing the primitives in a way that
produces new agents instead of producing analysis or code.

**Forth Self-Hosting → LumenBridge Self-Evolution**
