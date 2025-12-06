import { signedStructuredResponse } from '../structured-json.js';
import { createAgentKeys } from '../tools/signature.js';
import { PerformanceMonitor } from '../utilities/PerformanceMonitor.js';

/**
 * CodeGenerator - Natural Language to Code Agent
 * 
 * Transforms natural language descriptions into functional code with:
 * - Proper documentation and comments
 * - Error handling
 * - Type definitions
 * - Best practices
 * 
 * Key Features:
 * 1. Context-aware code generation
 * 2. Missing context detection
 * 3. Reasoning transparency
 * 4. Memory integration for conversation continuity
 * 5. Multiple language support
 * 
 * Use Cases:
 * - Quick function/class scaffolding
 * - Code snippet generation
 * - API endpoint creation
 * - Test generation
 * - Documentation code examples
 */

export class CodeGenerator {
  constructor(name = 'CodeGenerator', options = {}) {
    this.name = name;
    this.keys = createAgentKeys(name, { role: 'Code Generation' });
    
    this.defaultLanguage = options.defaultLanguage || 'javascript';
    this.includeTests = options.includeTests !== false; // Default: true
    this.includeDocumentation = options.includeDocumentation !== false; // Default: true
    this.styleGuide = options.styleGuide || 'standard'; // standard, airbnb, google, etc.
  }

  /**
   * Core code generation schema
   */
  getCodeGenerationSchema() {
    return {
      type: "object",
      properties: {
        code: { 
          type: "string",
          description: "The generated code with proper formatting, comments, and documentation"
        },
        missingContext: {
          type: "array",
          items: { type: "string" },
          description: "List of missing information that would improve the generated code. Empty array if complete."
        },
        reasoning: {
          type: "string",
          description: "Explanation of design decisions, trade-offs, and implementation approach"
        },
        language: {
          type: "string",
          description: "Programming language of the generated code"
        },
        imports: {
          type: "array",
          items: { type: "string" },
          description: "Required imports or dependencies"
        },
        usage: {
          type: "object",
          properties: {
            description: { type: "string" },
            exampleCode: { type: "string" }
          },
          description: "How to use the generated code"
        },
        tests: {
          type: "string",
          description: "Unit tests for the generated code (if applicable)"
        },
        complexity: {
          type: "string",
          enum: ["low", "medium", "high", "very-high"],
          description: "Estimated complexity of the generated code"
        },
        edgeCases: {
          type: "array",
          items: { type: "string" },
          description: "Edge cases handled or that should be considered"
        },
        improvements: {
          type: "array",
          items: { type: "string" },
          description: "Potential improvements or alternative approaches"
        }
      },
      required: ["code", "missingContext", "reasoning"]
    };
  }

  /**
   * Generate code from natural language query
   * @param {string} query - Natural language description of what to generate
   * @param {Object} context - Optional context object with additional info
   * @param {Array} memory - Optional conversation memory for continuity
   * @returns {Object} Generated code with metadata
   */
  async generate(query, context = {}, memory = null) {
    const perf = new PerformanceMonitor('CodeGenerator.generate');
    console.log(`\n💻 Generating code for: "${query.substring(0, 60)}${query.length > 60 ? '...' : ''}"`);
    
    // Build comprehensive prompt
    perf.checkpoint('start');
    const prompt = this.buildPrompt(query, context);
    perf.checkpoint('build-prompt');
    
    // Prepare context for LLM
    const llmContext = this.prepareContext(context, memory);
    perf.checkpoint('prepare-context');
    
    // Generate code with structured response
    const result = await signedStructuredResponse({
      query: prompt,
      schema: this.getCodeGenerationSchema(),
      context: llmContext,
      temperature: 1.0, // Standard temperature for code generation
      agentKey: this.keys,
      systemPrompt: this.getSystemPrompt()
    });
    perf.checkpoint('llm-generation', { tokens: result._llm?.usage?.totalTokens });

    // Post-process and enhance
    const enhanced = this.enhanceResult(result, context);
    perf.checkpoint('post-process');
    
    // Log summary
    this.logGenerationSummary(enhanced);
    perf.print();
    
    return enhanced;
  }

  /**
   * Build comprehensive prompt for code generation
   */
  buildPrompt(query, context) {
    let prompt = `Generate code for the following request:\n\n${query}\n\n`;
    
    // Add language specification
    const targetLanguage = context.language || this.defaultLanguage;
    prompt += `Target Language: ${targetLanguage}\n\n`;
    
    // Add style guide if specified
    if (context.styleGuide || this.styleGuide) {
      prompt += `Style Guide: ${context.styleGuide || this.styleGuide}\n\n`;
    }
    
    // Add framework/library context
    if (context.framework) {
      prompt += `Framework/Library: ${context.framework}\n\n`;
    }
    
    // Add project context
    if (context.projectType) {
      prompt += `Project Type: ${context.projectType}\n\n`;
    }
    
    // Add specific requirements
    if (context.requirements) {
      prompt += `Requirements:\n`;
      if (Array.isArray(context.requirements)) {
        context.requirements.forEach(req => prompt += `- ${req}\n`);
      } else {
        prompt += `${context.requirements}\n`;
      }
      prompt += '\n';
    }
    
    // Add constraints
    if (context.constraints) {
      prompt += `Constraints:\n`;
      if (Array.isArray(context.constraints)) {
        context.constraints.forEach(con => prompt += `- ${con}\n`);
      } else {
        prompt += `${context.constraints}\n`;
      }
      prompt += '\n';
    }
    
    // Add existing code context
    if (context.existingCode) {
      prompt += `Existing Code to Build Upon:\n\`\`\`${targetLanguage}\n${context.existingCode}\n\`\`\`\n\n`;
    }
    
    // Add signature/interface requirements
    if (context.signature) {
      prompt += `Function Signature:\n${context.signature}\n\n`;
    }
    
    prompt += `Generate complete, production-ready code with:\n`;
    prompt += `- Proper error handling\n`;
    prompt += `- Clear documentation/comments\n`;
    prompt += `- Type definitions (if applicable)\n`;
    prompt += `- Input validation\n`;
    prompt += `- Best practices for ${targetLanguage}\n`;
    
    if (this.includeTests && !context.skipTests) {
      prompt += `- Unit tests\n`;
    }
    
    return prompt;
  }

  /**
   * Prepare context for LLM (handle memory)
   */
  prepareContext(context, memory) {
    const llmContext = { ...context };
    
    // If memory is provided, it should be an array of conversation messages
    if (memory && Array.isArray(memory)) {
      return memory; // Return memory array directly for conversation context
    }
    
    return llmContext;
  }

  /**
   * Get system prompt for code generation
   */
  getSystemPrompt() {
    return `You are an expert software engineer and code generator.
    
Your role is to:
1. Generate clean, idiomatic, production-ready code
2. Follow best practices and design patterns
3. Include comprehensive error handling
4. Write clear documentation and comments
5. Consider edge cases and validate inputs
6. Provide reasoning for design decisions
7. Identify missing context that would improve the code

Code Quality Standards:
- Readable and maintainable
- Well-commented but not over-commented
- Proper naming conventions
- DRY (Don't Repeat Yourself)
- SOLID principles where applicable
- Security-conscious
- Performance-aware

Always be explicit about:
- What the code does
- Why you made specific design choices
- What context is missing (if any)
- Potential improvements or alternatives`;
  }

  /**
   * Enhance the generated result with additional metadata
   */
  enhanceResult(result, context) {
    return {
      ...result,
      metadata: {
        generator: this.name,
        timestamp: new Date().toISOString(),
        language: result.language || context.language || this.defaultLanguage,
        contextProvided: Object.keys(context).length > 0,
        hasMemory: context.hasMemory || false,
        signature: result._signature,
        llm: result._llm
      },
      isComplete: result.missingContext.length === 0
    };
  }

  /**
   * Log generation summary
   */
  logGenerationSummary(result) {
    console.log(`   ✅ Code generated successfully`);
    console.log(`   Language: ${result.language || result.metadata.language}`);
    console.log(`   Complexity: ${result.complexity || 'unknown'}`);
    
    if (result.missingContext && result.missingContext.length > 0) {
      console.log(`   ⚠️  Missing context (${result.missingContext.length} items):`);
      result.missingContext.forEach(item => console.log(`      - ${item}`));
    } else {
      console.log(`   ✓ Complete (no missing context)`);
    }
    
    if (result.imports && result.imports.length > 0) {
      console.log(`   📦 Dependencies: ${result.imports.length}`);
    }
  }

  /**
   * Generate multiple code variants for comparison
   */
  async generateVariants(query, context = {}, variantCount = 3) {
    console.log(`\n🔀 Generating ${variantCount} code variants...\n`);
    
    const variants = [];
    
    for (let i = 0; i < variantCount; i++) {
      const variantContext = {
        ...context,
        approach: context.approaches ? context.approaches[i] : `Variant ${i + 1}`
      };
      
      const variant = await this.generate(query, variantContext);
      variants.push(variant);
    }
    
    // Compare variants
    const comparison = await this.compareVariants(variants);
    
    return {
      variants,
      comparison,
      recommended: comparison.recommendedIndex
    };
  }

  /**
   * Compare multiple code variants
   */
  async compareVariants(variants) {
    const comparisonSchema = {
      type: "object",
      properties: {
        comparison: {
          type: "array",
          items: {
            type: "object",
            properties: {
              variantIndex: { type: "number" },
              pros: { type: "array", items: { type: "string" } },
              cons: { type: "array", items: { type: "string" } },
              bestFor: { type: "string" }
            }
          }
        },
        recommendedIndex: { type: "number" },
        reasoning: { type: "string" }
      },
      required: ["comparison", "recommendedIndex", "reasoning"]
    };

    const result = await signedStructuredResponse({
      query: `Compare these code variants and recommend the best one:

${variants.map((v, i) => `
VARIANT ${i + 1}:
${v.code}

Reasoning: ${v.reasoning}
Complexity: ${v.complexity}
`).join('\n---\n')}

Consider: readability, performance, maintainability, error handling, and best practices.`,
      schema: comparisonSchema,
      temperature: 1.0,
      agentKey: this.keys
    });

    return result;
  }

  /**
   * Refactor existing code
   */
  async refactor(code, refactoringGoals, context = {}) {
    console.log(`\n♻️  Refactoring code...`);
    
    const refactorContext = {
      ...context,
      existingCode: code,
      refactoringGoals: Array.isArray(refactoringGoals) 
        ? refactoringGoals 
        : [refactoringGoals]
    };

    const query = `Refactor the provided code to achieve these goals:
${refactorContext.refactoringGoals.map(g => `- ${g}`).join('\n')}

Maintain functionality while improving code quality.`;

    return await this.generate(query, refactorContext);
  }

  /**
   * Generate code from a schema or specification
   */
  async generateFromSchema(schema, context = {}) {
    console.log(`\n📋 Generating code from schema...`);
    
    const schemaContext = {
      ...context,
      schema: typeof schema === 'string' ? schema : JSON.stringify(schema, null, 2)
    };

    const query = `Generate code implementation for the following schema/specification:

${schemaContext.schema}

Create a complete implementation with all necessary methods and properties.`;

    return await this.generate(query, schemaContext);
  }

  /**
   * Get agent capabilities
   */
  getCapabilities() {
    return [
      'Generate code from natural language',
      'Support multiple programming languages',
      'Include error handling and validation',
      'Generate unit tests',
      'Provide usage examples',
      'Identify missing context',
      'Explain design decisions',
      'Generate code variants for comparison',
      'Refactor existing code',
      'Generate from schemas/specifications',
      'Cryptographic signing of generated code',
      'Context-aware generation with memory'
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
      role: 'Code Generation',
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

    const { action, query, context, memory, code, goals, schema } = message.payload;

    switch (action) {
      case 'generate':
        return await this.generate(query, context || {}, memory);
      
      case 'generateVariants':
        return await this.generateVariants(
          query, 
          context || {}, 
          message.payload.variantCount || 3
        );
      
      case 'refactor':
        return await this.refactor(code, goals, context || {});
      
      case 'generateFromSchema':
        return await this.generateFromSchema(schema, context || {});
      
      case 'getCapabilities':
        return this.getCapabilities();
      
      case 'getIdentity':
        return this.getIdentity();
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
}

export default CodeGenerator;
