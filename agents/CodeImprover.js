import { signedStructuredResponse } from '../structured-json.js';
import { createAgentKeys } from '../tools/signature.js';
import { PerformanceMonitor } from '../utilities/PerformanceMonitor.js';

/**
 * CodeImprover - Enhance Existing Code Without Breaking Changes
 * 
 * Improves code quality, performance, and maintainability while preserving functionality.
 * Focuses on non-breaking enhancements and best practices.
 * 
 * Key Features:
 * 1. Maintains backward compatibility
 * 2. Improves readability and documentation
 * 3. Enhances error handling
 * 4. Optimizes performance
 * 5. Applies best practices
 * 6. Adds type safety (where applicable)
 * 7. Identifies missing context
 * 
 * Use Cases:
 * - Code review improvements
 * - Technical debt reduction
 * - Performance optimization
 * - Documentation enhancement
 * - Error handling improvements
 * - Code modernization (ES5 → ES6+, etc.)
 * - Security hardening
 */

export class CodeImprover {
  constructor(name = 'CodeImprover', options = {}) {
    this.name = name;
    this.keys = createAgentKeys(name, { role: 'Code Improvement' });
    
    this.preserveStyle = options.preserveStyle !== false; // Default: true
    this.addComments = options.addComments !== false; // Default: true
    this.modernize = options.modernize !== false; // Default: true
    this.optimizePerformance = options.optimizePerformance !== false; // Default: true
  }

  /**
   * Core code improvement schema
   */
  getCodeImprovementSchema() {
    return {
      type: "object",
      properties: {
        improvedCode: { 
          type: "string",
          description: "The complete improved code without breaking changes. All original functionality must be preserved."
        },
        missingContext: {
          type: "array",
          items: { type: "string" },
          description: "List of missing information that would enable better improvements. Empty array if complete."
        },
        reasoning: {
          type: "string",
          description: "Detailed explanation of what was improved, why, and how it maintains backward compatibility"
        },
        improvements: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: { 
                type: "string",
                enum: ["readability", "performance", "error-handling", "documentation", "security", "maintainability", "modernization", "type-safety"]
              },
              description: { type: "string" },
              impact: {
                type: "string",
                enum: ["low", "medium", "high"],
                description: "Impact level of this improvement"
              },
              lineNumbers: {
                type: "string",
                description: "Approximate line numbers affected (e.g., '15-20', '45')"
              }
            }
          },
          description: "List of specific improvements made to the code"
        },
        breakingChanges: {
          type: "array",
          items: { type: "string" },
          description: "Should ALWAYS be empty - improvements must not break existing functionality"
        },
        compatibilityNotes: {
          type: "string",
          description: "Notes on how backward compatibility is maintained"
        },
        furtherImprovements: {
          type: "array",
          items: { type: "string" },
          description: "Potential improvements that would require breaking changes or significant refactoring"
        },
        testSuggestions: {
          type: "array",
          items: { type: "string" },
          description: "Suggested tests to verify improvements don't break functionality"
        },
        performanceGains: {
          type: "string",
          description: "Expected performance improvements (if any)"
        },
        codeQualityScore: {
          type: "object",
          properties: {
            before: { type: "number", minimum: 0, maximum: 100 },
            after: { type: "number", minimum: 0, maximum: 100 },
            improvement: { type: "number" }
          },
          description: "Code quality assessment before and after"
        }
      },
      required: ["improvedCode", "missingContext", "reasoning"]
    };
  }

  /**
   * Improve code while maintaining backward compatibility
   * @param {string} code - The original code to improve
   * @param {Object} context - Optional context object with additional info
   * @param {Array} memory - Optional conversation memory for continuity
   * @returns {Object} Improved code with metadata
   */
  async improve(code, context = {}, memory = null) {
    const perf = new PerformanceMonitor('CodeImprover.improve');
    console.log(`\n🔧 Improving code (${code.split('\n').length} lines)...`);
    
    // Build comprehensive prompt
    perf.checkpoint('start');
    const prompt = this.buildPrompt(code, context);
    perf.checkpoint('build-prompt');
    
    // Prepare context for LLM
    const llmContext = this.prepareContext(context, memory);
    perf.checkpoint('prepare-context');
    
    // Generate improved code with structured response
    const result = await signedStructuredResponse({
      query: prompt,
      schema: this.getCodeImprovementSchema(),
      context: llmContext,
      temperature: 1.0, // Standard temperature for improvements
      agentKey: this.keys,
      systemPrompt: this.getSystemPrompt()
    });
    perf.checkpoint('llm-improvement', { tokens: result._llm?.usage?.totalTokens });

    // Validate no breaking changes
    if (result.breakingChanges && result.breakingChanges.length > 0) {
      console.warn('⚠️  Warning: Breaking changes detected but should be avoided!');
    }

    // Post-process and enhance
    const enhanced = this.enhanceResult(result, code, context);
    perf.checkpoint('post-process');
    
    // Log summary
    this.logImprovementSummary(enhanced);
    perf.print();
    
    return enhanced;
  }

  /**
   * Build comprehensive prompt for code improvement
   */
  buildPrompt(code, context) {
    let prompt = `Improve the following code WITHOUT introducing breaking changes. All existing functionality must be preserved.\n\n`;
    
    prompt += `ORIGINAL CODE:\n\`\`\`${context.language || 'javascript'}\n${code}\n\`\`\`\n\n`;
    
    // Add language specification
    if (context.language) {
      prompt += `Language: ${context.language}\n\n`;
    }
    
    // Add improvement goals
    if (context.improvementGoals) {
      prompt += `Improvement Goals:\n`;
      if (Array.isArray(context.improvementGoals)) {
        context.improvementGoals.forEach(goal => prompt += `- ${goal}\n`);
      } else {
        prompt += `${context.improvementGoals}\n`;
      }
      prompt += '\n';
    }
    
    // Add focus areas
    if (context.focusAreas) {
      prompt += `Focus Areas:\n`;
      if (Array.isArray(context.focusAreas)) {
        context.focusAreas.forEach(area => prompt += `- ${area}\n`);
      } else {
        prompt += `${context.focusAreas}\n`;
      }
      prompt += '\n';
    }
    
    // Add known issues
    if (context.knownIssues) {
      prompt += `Known Issues to Address:\n`;
      if (Array.isArray(context.knownIssues)) {
        context.knownIssues.forEach(issue => prompt += `- ${issue}\n`);
      } else {
        prompt += `${context.knownIssues}\n`;
      }
      prompt += '\n';
    }
    
    // Add code context
    if (context.codeContext) {
      prompt += `Code Context:\n${context.codeContext}\n\n`;
    }
    
    // Add usage examples if provided
    if (context.usageExamples) {
      prompt += `Current Usage Examples (must continue to work):\n${context.usageExamples}\n\n`;
    }
    
    prompt += `IMPROVEMENT REQUIREMENTS:\n`;
    prompt += `✓ Preserve all existing functionality\n`;
    prompt += `✓ Maintain backward compatibility\n`;
    prompt += `✓ Keep the same API/interface\n`;
    prompt += `✓ Improve code quality, readability, and maintainability\n`;
    
    if (this.addComments) {
      prompt += `✓ Add clear documentation and comments\n`;
    }
    
    if (this.modernize) {
      prompt += `✓ Use modern language features (if safe)\n`;
    }
    
    if (this.optimizePerformance) {
      prompt += `✓ Optimize performance without breaking behavior\n`;
    }
    
    prompt += `✓ Enhance error handling\n`;
    prompt += `✓ Apply best practices\n`;
    prompt += `✓ Improve type safety (if applicable)\n`;
    prompt += `\nIMPORTANT: NO BREAKING CHANGES ALLOWED.\n`;
    
    return prompt;
  }

  /**
   * Prepare context for LLM (handle memory)
   */
  prepareContext(context, memory) {
    const llmContext = { ...context };
    
    // If memory is provided, it should be an array of conversation messages
    if (memory && Array.isArray(memory)) {
      return memory;
    }
    
    return llmContext;
  }

  /**
   * Get system prompt for code improvement
   */
  getSystemPrompt() {
    return `You are an expert code reviewer and refactoring specialist.
    
Your role is to:
1. Improve code quality without breaking existing functionality
2. Maintain strict backward compatibility
3. Enhance readability and maintainability
4. Optimize performance safely
5. Add proper documentation and comments
6. Apply industry best practices
7. Identify what context is missing for better improvements

Core Principles:
- NEVER introduce breaking changes
- Preserve all existing behavior and APIs
- Keep the same function signatures and interfaces
- Maintain the same output for the same inputs
- Improve internal implementation, not external interface

Improvement Categories:
1. Readability: Better naming, formatting, structure
2. Documentation: Clear comments, JSDoc, type definitions
3. Error Handling: Validation, try-catch, meaningful errors
4. Performance: Algorithm improvements, caching, lazy loading
5. Security: Input validation, sanitization, safe defaults
6. Maintainability: DRY, SOLID, separation of concerns
7. Modernization: ES6+, async/await, modern APIs
8. Type Safety: TypeScript, JSDoc types, runtime checks

Always explain:
- What you improved and why
- How backward compatibility is maintained
- What impact each improvement has
- What additional context would help
- What further improvements would require breaking changes`;
  }

  /**
   * Enhance the generated result with additional metadata
   */
  enhanceResult(result, originalCode, context) {
    return {
      ...result,
      metadata: {
        improver: this.name,
        timestamp: new Date().toISOString(),
        originalLines: originalCode.split('\n').length,
        improvedLines: result.improvedCode.split('\n').length,
        improvementCount: result.improvements?.length || 0,
        language: context.language || 'javascript',
        signature: result._signature,
        llm: result._llm
      },
      isComplete: result.missingContext.length === 0,
      hasBreakingChanges: result.breakingChanges && result.breakingChanges.length > 0
    };
  }

  /**
   * Log improvement summary
   */
  logImprovementSummary(result) {
    console.log(`   ✅ Code improved successfully`);
    console.log(`   Original Lines: ${result.metadata.originalLines}`);
    console.log(`   Improved Lines: ${result.metadata.improvedLines}`);
    
    if (result.improvements && result.improvements.length > 0) {
      console.log(`   📊 Improvements Made: ${result.improvements.length}`);
      
      // Group by category
      const byCategory = {};
      result.improvements.forEach(imp => {
        if (!byCategory[imp.category]) byCategory[imp.category] = [];
        byCategory[imp.category].push(imp);
      });
      
      Object.keys(byCategory).forEach(category => {
        console.log(`      • ${category}: ${byCategory[category].length}`);
      });
    }
    
    if (result.codeQualityScore) {
      console.log(`   📈 Quality Score: ${result.codeQualityScore.before} → ${result.codeQualityScore.after} (+${result.codeQualityScore.improvement})`);
    }
    
    if (result.hasBreakingChanges) {
      console.log(`   ⚠️  WARNING: Breaking changes detected!`);
    } else {
      console.log(`   ✓ No breaking changes`);
    }
    
    if (result.missingContext && result.missingContext.length > 0) {
      console.log(`   ⚠️  Missing context (${result.missingContext.length} items):`);
      result.missingContext.forEach(item => console.log(`      - ${item}`));
    } else {
      console.log(`   ✓ Complete (no missing context)`);
    }
  }

  /**
   * Improve specific aspect of code
   */
  async improveAspect(code, aspect, context = {}) {
    console.log(`\n🎯 Focusing on: ${aspect}`);
    
    const aspectContext = {
      ...context,
      focusAreas: [aspect],
      improvementGoals: [`Specifically improve ${aspect}`]
    };

    return await this.improve(code, aspectContext);
  }

  /**
   * Compare original vs improved code
   */
  async compare(originalCode, improvedCode, context = {}) {
    console.log(`\n📊 Comparing original vs improved code...`);
    
    const comparisonSchema = {
      type: "object",
      properties: {
        missingContext: {
          type: "array",
          items: { type: "string" }
        },
        reasoning: { type: "string" },
        differences: {
          type: "array",
          items: {
            type: "object",
            properties: {
              aspect: { type: "string" },
              original: { type: "string" },
              improved: { type: "string" },
              benefit: { type: "string" }
            }
          }
        },
        behaviorChanges: {
          type: "array",
          items: { type: "string" },
          description: "Any changes in behavior (should be empty for non-breaking improvements)"
        },
        apiChanges: {
          type: "array",
          items: { type: "string" },
          description: "Any changes to API/interface (should be empty for backward compatibility)"
        },
        recommendation: {
          type: "string",
          enum: ["safe-to-deploy", "needs-testing", "requires-review", "not-recommended"],
          description: "Deployment recommendation"
        },
        riskAssessment: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "Risk level of deploying the improved code"
        }
      },
      required: ["differences", "behaviorChanges", "apiChanges", "recommendation", "riskAssessment", "missingContext", "reasoning"]
    };

    const result = await signedStructuredResponse({
      query: `Compare these two versions of the same code and identify all differences:

ORIGINAL CODE:
\`\`\`
${originalCode}
\`\`\`

IMPROVED CODE:
\`\`\`
${improvedCode}
\`\`\`

Analyze the differences and assess if the improved version maintains backward compatibility.`,
      schema: comparisonSchema,
      context: context,
      temperature: 1.0,
      agentKey: this.keys
    });

    return result;
  }

  /**
   * Iterative improvement (improve multiple times)
   */
  async iterativeImprovement(code, iterations = 3, context = {}) {
    console.log(`\n🔄 Starting iterative improvement (${iterations} iterations)...`);
    
    let currentCode = code;
    const history = [];
    
    for (let i = 0; i < iterations; i++) {
      console.log(`\n   Iteration ${i + 1}/${iterations}:`);
      
      const result = await this.improve(currentCode, {
        ...context,
        iteration: i + 1,
        previousImprovements: history.map(h => h.improvements).flat()
      });
      
      history.push({
        iteration: i + 1,
        code: result.improvedCode,
        improvements: result.improvements,
        qualityScore: result.codeQualityScore
      });
      
      currentCode = result.improvedCode;
      
      // Stop if no more improvements or high quality reached
      if (result.codeQualityScore?.after >= 95) {
        console.log(`   ✨ High quality achieved (${result.codeQualityScore.after}/100), stopping early`);
        break;
      }
    }
    
    return {
      originalCode: code,
      finalCode: currentCode,
      history,
      totalIterations: history.length,
      totalImprovements: history.reduce((sum, h) => sum + (h.improvements?.length || 0), 0)
    };
  }

  /**
   * Get improvement suggestions without modifying code
   */
  async suggestImprovements(code, context = {}) {
    console.log(`\n💡 Analyzing code for improvement suggestions...`);
    
    const suggestionSchema = {
      type: "object",
      properties: {
        suggestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: { type: "string" },
              issue: { type: "string" },
              suggestion: { type: "string" },
              priority: {
                type: "string",
                enum: ["low", "medium", "high", "critical"]
              },
              effort: {
                type: "string",
                enum: ["trivial", "small", "medium", "large"]
              },
              breaking: { type: "boolean" }
            }
          }
        },
        reasoning: { type: "string" },
        missingContext: {
          type: "array",
          items: { type: "string" }
        },
        overallAssessment: { type: "string" },
        quickWins: {
          type: "array",
          items: { type: "string" },
          description: "Easy improvements with high impact"
        }
      },
      required: ["suggestions", "reasoning", "missingContext", "overallAssessment"]
    };

    const result = await signedStructuredResponse({
      query: `Analyze this code and suggest improvements (without actually improving it):

\`\`\`${context.language || 'javascript'}
${code}
\`\`\`

List all potential improvements, categorize them, and assess priority and effort.`,
      schema: suggestionSchema,
      context: context,
      temperature: 1.0,
      agentKey: this.keys,
      systemPrompt: this.getSystemPrompt()
    });

    return result;
  }

  /**
   * Get agent capabilities
   */
  getCapabilities() {
    return [
      'Improve code without breaking changes',
      'Maintain backward compatibility',
      'Enhance readability and documentation',
      'Optimize performance safely',
      'Improve error handling',
      'Apply best practices',
      'Modernize code (ES5 → ES6+)',
      'Add type safety',
      'Security hardening',
      'Code quality assessment',
      'Iterative improvement',
      'Improvement comparison',
      'Suggestion generation',
      'Identify missing context',
      'Cryptographic signing',
      'Context-aware improvements with memory'
    ];
  }

  /**
   * Get agent identity
   */
  getIdentity() {
    return {
      name: this.name,
      publicKey: this.keys.publicKey,
      address: this.keys.address,
      role: 'Code Improvement',
      capabilities: this.getCapabilities()
    };
  }

  /**
   * Black-box message interface (Alan Kay style)
   */
  async send(message) {
    if (!message || !message.payload) {
      throw new Error('Invalid message format');
    }

    const { action, code, context, memory, aspect, originalCode, improvedCode, iterations } = message.payload;

    switch (action) {
      case 'improve':
        return await this.improve(code, context || {}, memory);
      
      case 'improveAspect':
        return await this.improveAspect(code, aspect, context || {});
      
      case 'compare':
        return await this.compare(originalCode, improvedCode, context || {});
      
      case 'iterativeImprovement':
        return await this.iterativeImprovement(code, iterations || 3, context || {});
      
      case 'suggestImprovements':
        return await this.suggestImprovements(code, context || {});
      
      case 'getCapabilities':
        return this.getCapabilities();
      
      case 'getIdentity':
        return this.getIdentity();
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
}

export default CodeImprover;
