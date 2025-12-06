/**
 * BuilderAgent - Self-iterating code/reason agent
 * 
 * Executes a single task through iterative reason ↔ code loops:
 * - Reasons about what to build
 * - Generates code
 * - Receives execution feedback
 * - Refines based on errors
 * - Continues until task complete
 * 
 * This is Layer 3 of the builder workflow - the actual execution primitive.
 */

import BaseMetaAgent from './BaseMetaAgent.js';
import { ExecutionPrimitiveSchema } from '../schemas/BuilderWorkflowSchemas.js';
import { signedStructuredResponse } from '../structured-json.js';

export class BuilderAgent extends BaseMetaAgent {
  constructor(options = {}) {
    super({
      agentName: 'BuilderAgent',
      systemPrompt: `You are a BuilderAgent - a self-iterating coder that alternates between reasoning and code generation.

You work on ONE task at a time through a loop:
1. REASON mode: Plan what to build, identify issues, explain changes
2. CODE mode: Generate actual implementation
3. Receive feedback (test results, errors, etc.)
4. Iterate until task complete

CRITICAL RULES:

MODE DISCIPLINE:
- mode="reason" → response MUST be non-null, code MUST be null
- mode="code" → code MUST be non-null, response SHOULD be null or very brief

WHEN TO USE EACH MODE:
- Start with "reason" to plan approach
- Switch to "code" once plan is clear
- Return to "reason" if errors occur or tests fail
- Use "reason" to explain why changes are needed

MISSING CONTEXT:
- Always populate missingContext array if you need information
- Be explicit about what's missing (file contents, API docs, test results, etc.)
- If missingContext.length > 0, set continue=true

CONTINUE LOGIC:
- continue=true → "I need another iteration (more work to do)"
- continue=false → "Task complete from my perspective"

NEXT PIPE:
- "self" → stay in this agent, reason/code loop
- "executor" → code needs to be run/tested
- "tester" → code needs explicit testing
- null → "I'm done, hand back to orchestrator"

BE HONEST:
- If stuck after 3 tries, say so in missingContext
- If task is complete, set continue=false
- If you can't proceed without info, be explicit`,
      ...options
    });
    
    this.taskHistory = [];
    this.iterationCount = 0;
  }

  /**
   * Execute a single iteration of the task
   */
  async step({ task, context = {}, previousResult = null, feedback = null }) {
    this.iterationCount++;
    
    console.log(`\n🔨 [BuilderAgent] Step ${this.iterationCount} - Task: ${task.id}`);
    console.log(`   Mode: ${previousResult?.mode || 'initial'}`);

    // Build the prompt based on where we are in the loop
    const prompt = this._buildPrompt(task, context, previousResult, feedback);

    const result = await signedStructuredResponse({
      query: prompt,
      schema: ExecutionPrimitiveSchema,
      context: {
        task,
        projectContext: context.projectState || {},
        executionHistory: this.taskHistory.slice(-3), // Last 3 steps
        iterationCount: this.iterationCount
      },
      temperature: 1.0,
      agentKey: this.keys,
      systemPrompt: this.systemPrompt
    });

    const primitive = result.data || result;

    // Validate mode discipline
    this._validateModeDiscipline(primitive);

    // Record in history
    this.taskHistory.push({
      iteration: this.iterationCount,
      mode: primitive.mode,
      summary: primitive.mode === 'reason' ? primitive.response?.substring(0, 100) : `Code: ${primitive.code?.filename || 'snippet'}`,
      hasMissingContext: primitive.missingContext && primitive.missingContext.length > 0,
      timestamp: new Date().toISOString()
    });

    console.log(`   Result: ${primitive.mode} mode`);
    if (primitive.mode === 'reason') {
      console.log(`   📝 ${primitive.response?.substring(0, 80)}...`);
    } else {
      console.log(`   💻 Code: ${primitive.code?.filename || 'snippet'} (${primitive.code?.language})`);
    }
    if (primitive.missingContext && primitive.missingContext.length > 0) {
      console.log(`   ⚠️  Missing: ${primitive.missingContext.length} items`);
    }
    console.log(`   Continue: ${primitive.continue}, Next: ${primitive.nextPipe}`);

    return primitive;
  }

  /**
   * Build the prompt based on current state
   */
  _buildPrompt(task, context, previousResult, feedback) {
    let prompt = '';

    // Initial iteration
    if (!previousResult) {
      prompt = `You are starting work on this task:

TASK: ${task.id}
${task.description}

TARGET: ${task.target || 'N/A'}
KIND: ${task.kind}
COMPLEXITY: ${task.estimatedComplexity || 'unknown'}

PROJECT CONTEXT:
${JSON.stringify(context.projectState || {}, null, 2)}

DEPENDENCIES COMPLETED:
${task.dependsOn && task.dependsOn.length > 0 ? task.dependsOn.join(', ') : 'none'}

Start by reasoning about your approach. What needs to be built? What's the plan?`;
    }
    // Continuation after reason
    else if (previousResult.mode === 'reason' && !feedback) {
      prompt = `You reasoned:
"${previousResult.response}"

Now generate the code to implement this. Use mode="code" and provide the actual implementation.`;
    }
    // Continuation after code with feedback
    else if (previousResult.mode === 'code' && feedback) {
      prompt = `You generated code for ${previousResult.code?.filename}:

FEEDBACK/RESULTS:
${JSON.stringify(feedback, null, 2)}

${feedback.success ? 'Tests passed! Is the task complete, or is there more to do?' : 'Tests failed. Analyze the errors and decide: reason about the fix, or generate corrected code.'}`;
    }
    // Generic continuation
    else {
      prompt = `Continue working on task "${task.id}".

PREVIOUS STEP: mode=${previousResult.mode}
${previousResult.response ? `REASONING: ${previousResult.response}` : ''}
${previousResult.code ? `CODE: ${previousResult.code.filename}` : ''}

${feedback ? `FEEDBACK: ${JSON.stringify(feedback, null, 2)}` : ''}

What's the next step?`;
    }

    return prompt;
  }

  /**
   * Validate mode discipline rules
   */
  _validateModeDiscipline(primitive) {
    if (primitive.mode === 'reason') {
      if (!primitive.response) {
        throw new Error('Mode is "reason" but response is null - invariant violated');
      }
      if (primitive.code !== null) {
        console.warn('⚠️  Mode is "reason" but code is not null - should be null');
      }
    } else if (primitive.mode === 'code') {
      if (!primitive.code) {
        throw new Error('Mode is "code" but code object is null - invariant violated');
      }
      if (primitive.response && primitive.response.length > 200) {
        console.warn('⚠️  Mode is "code" but response is long - should be brief or null');
      }
    }
  }

  /**
   * Auto-execute task through complete loop
   */
  async executeTask({ task, context = {}, maxIterations = 20 }) {
    console.log(`\n🚀 [BuilderAgent] Auto-executing task: ${task.id}`);
    console.log(`   Max iterations: ${maxIterations}`);

    this.iterationCount = 0;
    this.taskHistory = [];

    let currentResult = null;
    let feedback = null;

    while (this.iterationCount < maxIterations) {
      // Execute one step
      const primitive = await this.step({ task, context, previousResult: currentResult, feedback });

      // Check if we should stop
      if (!primitive.continue && primitive.nextPipe === null) {
        console.log(`\n✅ Task complete after ${this.iterationCount} iterations`);
        return {
          success: true,
          task,
          iterations: this.iterationCount,
          finalResult: primitive,
          history: this.taskHistory
        };
      }

      // Handle next pipe
      if (primitive.nextPipe === 'executor' && primitive.code) {
        console.log(`\n⚙️  Executing code...`);
        feedback = await this._mockExecute(primitive.code);
      } else if (primitive.nextPipe === 'tester' && primitive.code) {
        console.log(`\n🧪 Running tests...`);
        feedback = await this._mockTest(primitive.code);
      } else if (primitive.nextPipe === 'self') {
        // Continue loop, no external action
        feedback = null;
      }

      currentResult = primitive;

      // Safety check for infinite loops
      if (primitive.missingContext && primitive.missingContext.length > 0 && this.iterationCount > 3) {
        console.log(`\n⚠️  Still missing context after ${this.iterationCount} iterations`);
        console.log(`   Missing: ${primitive.missingContext.join(', ')}`);
      }
    }

    console.log(`\n⚠️  Max iterations (${maxIterations}) reached`);
    return {
      success: false,
      task,
      iterations: this.iterationCount,
      finalResult: currentResult,
      history: this.taskHistory,
      reason: 'max_iterations_exceeded'
    };
  }

  /**
   * Mock code execution (in real system, this would actually run/write files)
   */
  async _mockExecute(code) {
    // Simulate execution
    return {
      success: true,
      output: 'Code executed successfully',
      errors: []
    };
  }

  /**
   * Mock testing (in real system, this would run actual tests)
   */
  async _mockTest(code) {
    // Simulate testing
    const hasTests = code.body.includes('test') || code.body.includes('expect');
    return {
      success: hasTests ? Math.random() > 0.3 : true, // 70% pass rate for code with tests
      testsRun: hasTests ? 5 : 0,
      testsPassed: hasTests ? 4 : 0,
      testsFailed: hasTests ? 1 : 0,
      errors: hasTests && Math.random() > 0.7 ? ['Mock test failure: assertion error'] : []
    };
  }

  /**
   * Reset agent state for new task
   */
  reset() {
    this.iterationCount = 0;
    this.taskHistory = [];
  }
}

export default BuilderAgent;
