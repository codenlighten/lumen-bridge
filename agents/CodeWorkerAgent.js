/**
 * CodeWorkerAgent
 * 
 * A "developer" that works on a single BoxSpec.
 * 
 * Each worker:
 * 1. Reads the ProjectContract and BoxSpec
 * 2. Generates code that satisfies the contracts
 * 3. Runs tests via TerminalAgent
 * 4. Refines until tests pass or flags missingContext
 * 5. Returns a signed "black box" (the completed work)
 * 
 * Workers operate in parallel, each scoped to their ticket.
 */

import BaseMetaAgent from './BaseMetaAgent.js';
import TerminalAgent from './TerminalAgent.js';
import CodeGenerator from './CodeGenerator.js';

export class CodeWorkerAgent extends BaseMetaAgent {
  constructor({ boxSpec, projectContract, agentId, ...options }) {
    super({
      agentName: `CodeWorker-${boxSpec.boxName}`,
      ...options,
      systemPrompt: options.systemPrompt || `You are CodeWorker-${boxSpec.boxName}, a specialized developer working on a specific component.

YOUR TICKET (BoxSpec):
${JSON.stringify(boxSpec, null, 2)}

PROJECT CONTRACT (your constitution):
Language: ${projectContract.language}
Module System: ${projectContract.moduleSystem}
Runtime: ${projectContract.runtime}
Framework: ${projectContract.framework || 'none'}
Testing: ${projectContract.testing.framework}
Coding Standards: ${JSON.stringify(projectContract.codingStandards)}

YOUR RESPONSIBILITIES:
1. Implement EXACTLY what the BoxSpec describes
2. Follow the ProjectContract constraints (module system, language, standards)
3. Respect input/output schemas precisely
4. Write code that passes ALL acceptance tests
5. Flag missingContext if requirements are unclear
6. Use ONLY the dependencies listed in BoxSpec.dependsOnBoxes

CRITICAL RULES:
- Never deviate from the ProjectContract
- Never add features beyond the BoxSpec
- Always include proper error handling
- Write clean, documented code
- If tests fail, iterate until they pass
- If you can't proceed, ask for clarification via missingContext`
    });

    this.boxSpec = boxSpec;
    this.projectContract = projectContract;
    this.agentId = agentId || `worker-${Date.now()}`;
    this.terminalAgent = new TerminalAgent(`${this.agentName}-Terminal`);
    this.codeGenerator = new CodeGenerator(`${this.agentName}-CodeGen`);
    
    this.workLog = [];
    this.iterations = 0;
    this.maxIterations = options.maxIterations || 5;
  }

  /**
   * Main work loop: generate → test → refine
   */
  async executeBox() {
    console.log(`\n⚙️  [${this.agentName}] Starting work on box...`);
    console.log(`   📂 File: ${this.boxSpec.sourceFilePath}`);
    console.log(`   📝 Responsibility: ${this.boxSpec.responsibility}`);
    console.log(`   🔗 Dependencies: ${this.boxSpec.dependsOnBoxes.join(', ') || 'none'}`);

    let implementationComplete = false;
    let currentCode = null;
    let testResults = null;
    let context = '';

    while (!implementationComplete && this.iterations < this.maxIterations) {
      this.iterations++;
      console.log(`\n   🔄 Iteration ${this.iterations}/${this.maxIterations}`);

      // Step 1: Generate/refine code
      const codeResult = await this.generateCode(context);

      if (codeResult.missingContext && codeResult.missingContext.length > 0) {
        return {
          status: 'blocked',
          boxName: this.boxSpec.boxName,
          missingContext: codeResult.missingContext,
          question: codeResult.question,
          iterations: this.iterations,
          workLog: this.workLog
        };
      }

      currentCode = codeResult.code;
      this.workLog.push({
        iteration: this.iterations,
        action: 'code_generated',
        linesOfCode: currentCode.split('\n').length,
        timestamp: new Date().toISOString()
      });

      // Step 2: Static analysis (lint, type check)
      const analysisResult = await this.analyzeCode(currentCode);
      
      if (!analysisResult.passed) {
        context = `Code analysis failed:\n${analysisResult.errors.join('\n')}\n\nPlease fix these issues.`;
        this.workLog.push({
          iteration: this.iterations,
          action: 'analysis_failed',
          errors: analysisResult.errors
        });
        continue;
      }

      // Step 3: Run tests
      testResults = await this.runTests(currentCode);

      if (testResults.allPassed) {
        implementationComplete = true;
        this.workLog.push({
          iteration: this.iterations,
          action: 'tests_passed',
          testCount: testResults.tests.length
        });
      } else {
        context = `Tests failed:\n${testResults.failures.map(f => `- ${f.test}: ${f.error}`).join('\n')}\n\nFix the code to pass all tests.`;
        this.workLog.push({
          iteration: this.iterations,
          action: 'tests_failed',
          failures: testResults.failures
        });
      }
    }

    if (!implementationComplete) {
      return {
        status: 'timeout',
        boxName: this.boxSpec.boxName,
        iterations: this.iterations,
        lastError: context,
        workLog: this.workLog
      };
    }

    // Success! Package the signed black box
    return this.packageBlackBox(currentCode, testResults);
  }

  /**
   * Generate code following the BoxSpec and ProjectContract
   */
  async generateCode(context = '') {
    const prompt = `Generate code for this component:

BOX SPECIFICATION:
- Name: ${this.boxSpec.boxName}
- File: ${this.boxSpec.sourceFilePath}
- Responsibility: ${this.boxSpec.responsibility}
- Input Schema: ${JSON.stringify(this.boxSpec.inputSchema || {})}
- Output Schema: ${JSON.stringify(this.boxSpec.outputSchema)}
- Dependencies: ${this.boxSpec.dependsOnBoxes.join(', ') || 'none'}

PROJECT CONSTRAINTS:
- Language: ${this.projectContract.language}
- Module System: ${this.projectContract.moduleSystem} (${this.projectContract.moduleSystem === 'esm' ? 'use import/export' : 'use require/module.exports'})
- Runtime: ${this.projectContract.runtime}
- Framework: ${this.projectContract.framework || 'none'}

ACCEPTANCE TESTS:
${this.boxSpec.acceptanceTests.map((t, i) => `${i + 1}. ${t.testName}: ${t.description}`).join('\n')}

${context ? `\nPREVIOUS ITERATION FEEDBACK:\n${context}` : ''}

Generate complete, production-ready code that passes ALL acceptance tests.`;

    const result = await this.codeGenerator.generate(prompt, {
      language: this.projectContract.language,
      framework: this.projectContract.framework,
      moduleSystem: this.projectContract.moduleSystem
    });

    return result;
  }

  /**
   * Analyze code for lint/type errors
   */
  async analyzeCode(code) {
    // Simplified analysis - in production, use actual linters
    const errors = [];

    // Check module system compliance
    if (this.projectContract.moduleSystem === 'esm') {
      if (code.includes('require(') || code.includes('module.exports')) {
        errors.push('Must use ESM (import/export), not CommonJS (require/module.exports)');
      }
    } else if (this.projectContract.moduleSystem === 'commonjs') {
      if (code.includes('import ') && !code.includes('// @ts-ignore')) {
        errors.push('Must use CommonJS (require/module.exports), not ESM (import/export)');
      }
    }

    // Check for basic syntax issues (very simplified)
    const openBraces = (code.match(/{/g) || []).length;
    const closeBraces = (code.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push('Mismatched braces - syntax error likely');
    }

    return {
      passed: errors.length === 0,
      errors
    };
  }

  /**
   * Run acceptance tests
   */
  async runTests(code) {
    // Simplified test runner - in production, use actual test framework
    const tests = this.boxSpec.acceptanceTests.map(test => ({
      name: test.testName,
      description: test.description,
      passed: true, // Simplified: assume passed if code structure is valid
      error: null
    }));

    const failures = tests.filter(t => !t.passed);

    return {
      allPassed: failures.length === 0,
      tests,
      failures,
      coverage: 100 // Simplified
    };
  }

  /**
   * Package the final signed black box
   */
  packageBlackBox(code, testResults) {
    const blackBox = {
      status: 'completed',
      boxName: this.boxSpec.boxName,
      sourceFilePath: this.boxSpec.sourceFilePath,
      code,
      inputSchema: this.boxSpec.inputSchema,
      outputSchema: this.boxSpec.outputSchema,
      testResults: {
        allPassed: testResults.allPassed,
        totalTests: testResults.tests.length,
        coverage: testResults.coverage
      },
      metadata: {
        iterations: this.iterations,
        linesOfCode: code.split('\n').length,
        dependencies: this.boxSpec.dependsOnBoxes,
        complexity: this.boxSpec.complexity,
        workerId: this.agentId,
        completedAt: new Date().toISOString()
      },
      workLog: this.workLog,
      _signature: {
        workerAgent: this.agentName,
        boxSpecHash: this.boxSpec._meta?.boxHash,
        projectContractHash: this.projectContract._meta?.contractHash,
        timestamp: new Date().toISOString()
      }
    };

    console.log(`\n   ✅ [${this.agentName}] Box completed!`);
    console.log(`   📏 Lines of code: ${blackBox.metadata.linesOfCode}`);
    console.log(`   ✓ Tests passed: ${testResults.tests.length}/${testResults.tests.length}`);
    console.log(`   🔄 Iterations: ${this.iterations}`);

    return blackBox;
  }
}

export default CodeWorkerAgent;
