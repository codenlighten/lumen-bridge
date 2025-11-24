import { signedStructuredResponse } from '../structured-json.js';
import { createAgentKeys } from '../tools/signature.js';

/**
 * TerminalAgent - Natural Language to Terminal Commands
 * 
 * Transforms natural language descriptions into safe, executable terminal commands with:
 * - Platform-specific command generation (bash, powershell, cmd, zsh)
 * - Safety warnings and sudo requirements detection
 * - Command explanation and reasoning
 * - Alternative approaches
 * - Risk assessment
 * 
 * Key Features:
 * 1. Cross-platform command generation
 * 2. Safety and security warnings
 * 3. Sudo/elevation requirement detection
 * 4. Missing context identification
 * 5. Reasoning and explanation
 * 6. Alternative command suggestions
 * 7. Prerequisite detection
 * 
 * Use Cases:
 * - Quick command lookup
 * - Cross-platform script generation
 * - Safe command execution planning
 * - Learning terminal commands
 * - Automation script creation
 */

export class TerminalAgent {
  constructor(name = 'TerminalAgent', options = {}) {
    this.name = name;
    this.keys = createAgentKeys(name, { role: 'Terminal Command Generation' });
    
    this.defaultShell = options.defaultShell || 'bash';
    this.safetyChecks = options.safetyChecks !== false; // Default: true
    this.explainCommands = options.explainCommands !== false; // Default: true
    this.includeAlternatives = options.includeAlternatives !== false; // Default: true
  }

  /**
   * Core terminal command generation schema
   */
  getTerminalCommandSchema() {
    return {
      type: "object",
      properties: {
        terminalCommand: { 
          type: "string",
          description: "The complete terminal command to execute"
        },
        missingContext: {
          type: "array",
          items: { type: "string" },
          description: "List of missing information that would make the command more specific. Empty array if complete."
        },
        reasoning: {
          type: "string",
          description: "Explanation of what the command does and why this approach was chosen"
        },
        shell: {
          type: "string",
          enum: ["bash", "zsh", "powershell", "cmd", "sh", "fish"],
          description: "Target shell/platform for the command"
        },
        requiresSudo: {
          type: "boolean",
          description: "Whether the command requires sudo/administrator privileges"
        },
        isDestructive: {
          type: "boolean",
          description: "Whether the command modifies, deletes, or changes system state"
        },
        riskLevel: {
          type: "string",
          enum: ["safe", "low", "medium", "high", "critical"],
          description: "Risk level of executing this command"
        },
        safetyWarnings: {
          type: "array",
          items: { type: "string" },
          description: "Important warnings about executing this command"
        },
        prerequisites: {
          type: "array",
          items: { type: "string" },
          description: "Tools, packages, or conditions required before running the command"
        },
        expectedOutput: {
          type: "string",
          description: "What output or result to expect when running the command"
        },
        alternatives: {
          type: "array",
          items: {
            type: "object",
            properties: {
              command: { type: "string" },
              description: { type: "string" },
              pros: { type: "string" },
              cons: { type: "string" }
            }
          },
          description: "Alternative ways to accomplish the same task"
        },
        breakdown: {
          type: "array",
          items: {
            type: "object",
            properties: {
              part: { type: "string" },
              explanation: { type: "string" }
            }
          },
          description: "Step-by-step breakdown of the command components"
        },
        rollback: {
          type: "string",
          description: "Command to undo or rollback the operation (if applicable)"
        },
        estimatedTime: {
          type: "string",
          description: "Estimated execution time (e.g., 'instant', '1-2 seconds', '5-10 minutes')"
        }
      },
      required: ["terminalCommand", "missingContext", "reasoning", "shell", "requiresSudo", "isDestructive", "riskLevel"]
    };
  }

  /**
   * Generate terminal command from natural language query
   * @param {string} query - Natural language description of what to do
   * @param {Object} context - Optional context object with additional info
   * @param {Array} memory - Optional conversation memory for continuity
   * @returns {Object} Generated command with metadata
   */
  async generate(query, context = {}, memory = null) {
    console.log(`\n💻 Generating terminal command for: "${query.substring(0, 60)}${query.length > 60 ? '...' : ''}"`);
    
    // Build comprehensive prompt
    const prompt = this.buildPrompt(query, context);
    
    // Prepare context for LLM
    const llmContext = this.prepareContext(context, memory);
    
    // Generate command with structured response
    const result = await signedStructuredResponse({
      query: prompt,
      schema: this.getTerminalCommandSchema(),
      context: llmContext,
      temperature: 0.2, // Lower for more deterministic commands
      agentKey: this.keys,
      systemPrompt: this.getSystemPrompt()
    });

    // Post-process and enhance
    const enhanced = this.enhanceResult(result, context);
    
    // Log summary
    this.logGenerationSummary(enhanced);
    
    return enhanced;
  }

  /**
   * Build comprehensive prompt for command generation
   */
  buildPrompt(query, context) {
    let prompt = `Generate a terminal command for the following request:\n\n${query}\n\n`;
    
    // Add shell specification
    const targetShell = context.shell || this.defaultShell;
    prompt += `Target Shell: ${targetShell}\n\n`;
    
    // Add OS context
    if (context.os) {
      prompt += `Operating System: ${context.os}\n\n`;
    }
    
    // Add current working directory
    if (context.cwd) {
      prompt += `Current Working Directory: ${context.cwd}\n\n`;
    }
    
    // Add environment info
    if (context.environment) {
      prompt += `Environment: ${context.environment}\n\n`;
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
    
    // Add safety preferences
    if (context.preferSafe !== false) {
      prompt += `Prefer safe, non-destructive commands when possible.\n\n`;
    }
    
    // Add available tools info
    if (context.availableTools) {
      prompt += `Available Tools: ${context.availableTools.join(', ')}\n\n`;
    }
    
    prompt += `Generate a command that:\n`;
    prompt += `- Is safe and follows best practices\n`;
    prompt += `- Includes proper error handling (if applicable)\n`;
    prompt += `- Is idiomatic for ${targetShell}\n`;
    prompt += `- Clearly indicates if sudo/admin privileges are needed\n`;
    prompt += `- Warns about any destructive operations\n`;
    
    if (this.explainCommands) {
      prompt += `- Includes detailed explanation of each component\n`;
    }
    
    if (this.includeAlternatives) {
      prompt += `- Provides alternative approaches when relevant\n`;
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
   * Get system prompt for command generation
   */
  getSystemPrompt() {
    return `You are an expert systems administrator and terminal command specialist.
    
Your role is to:
1. Generate safe, correct terminal commands for any platform
2. Provide clear explanations of what commands do
3. Warn about potential dangers or destructive operations
4. Identify when sudo/admin privileges are required
5. Suggest alternatives when appropriate
6. Explain command components step-by-step
7. Identify missing context that would make the command better

Safety Principles:
- Always warn about destructive operations (rm, format, dd, etc.)
- Clearly mark commands that require elevated privileges
- Suggest --dry-run or preview options when available
- Recommend backups before destructive operations
- Prefer explicit flags over implicit behavior
- Validate inputs and paths when possible

Command Quality Standards:
- Use full flag names for clarity (--help instead of -h)
- Include error handling where applicable
- Follow platform-specific conventions
- Avoid deprecated commands or flags
- Consider portability across systems
- Quote variables and paths properly

Always be explicit about:
- What the command does
- Why you chose this approach
- What risks exist (if any)
- What context is missing (if any)
- What prerequisites are needed`;
  }

  /**
   * Enhance the generated result with additional metadata
   */
  enhanceResult(result, context) {
    return {
      ...result,
      metadata: {
        agent: this.name,
        timestamp: new Date().toISOString(),
        shell: result.shell || context.shell || this.defaultShell,
        contextProvided: Object.keys(context).length > 0,
        hasMemory: context.hasMemory || false,
        signature: result._signature,
        llm: result._llm
      },
      isComplete: result.missingContext.length === 0,
      canExecute: !result.missingContext.length && result.riskLevel !== 'critical'
    };
  }

  /**
   * Log generation summary
   */
  logGenerationSummary(result) {
    console.log(`   ✅ Command generated successfully`);
    console.log(`   Shell: ${result.shell}`);
    console.log(`   Risk Level: ${result.riskLevel}`);
    console.log(`   Requires Sudo: ${result.requiresSudo ? 'Yes' : 'No'}`);
    console.log(`   Destructive: ${result.isDestructive ? 'Yes' : 'No'}`);
    
    if (result.safetyWarnings && result.safetyWarnings.length > 0) {
      console.log(`   ⚠️  Safety Warnings (${result.safetyWarnings.length}):`);
      result.safetyWarnings.forEach(warning => console.log(`      - ${warning}`));
    }
    
    if (result.missingContext && result.missingContext.length > 0) {
      console.log(`   ⚠️  Missing context (${result.missingContext.length} items):`);
      result.missingContext.forEach(item => console.log(`      - ${item}`));
    } else {
      console.log(`   ✓ Complete (no missing context)`);
    }
    
    if (result.prerequisites && result.prerequisites.length > 0) {
      console.log(`   📋 Prerequisites: ${result.prerequisites.length}`);
    }
  }

  /**
   * Generate command sequence (multiple commands for complex task)
   */
  async generateSequence(query, context = {}, memory = null) {
    console.log(`\n🔗 Generating command sequence for: "${query.substring(0, 60)}${query.length > 60 ? '...' : ''}"`);
    
    const sequenceSchema = {
      type: "object",
      properties: {
        commands: {
          type: "array",
          items: {
            type: "object",
            properties: {
              step: { type: "number" },
              command: { type: "string" },
              description: { type: "string" },
              requiresSudo: { type: "boolean" },
              canRunInParallel: { type: "boolean" },
              dependsOn: { 
                type: "array",
                items: { type: "number" },
                description: "Step numbers this command depends on"
              }
            },
            required: ["step", "command", "description"]
          }
        },
        reasoning: { type: "string" },
        missingContext: { 
          type: "array",
          items: { type: "string" }
        },
        estimatedTotalTime: { type: "string" },
        riskLevel: {
          type: "string",
          enum: ["safe", "low", "medium", "high", "critical"]
        },
        safetyWarnings: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: ["commands", "reasoning", "missingContext"]
    };

    const result = await signedStructuredResponse({
      query: `Generate a sequence of terminal commands for: ${query}`,
      schema: sequenceSchema,
      context: this.prepareContext(context, memory),
      temperature: 0.2,
      agentKey: this.keys,
      systemPrompt: this.getSystemPrompt()
    });

    return {
      ...result,
      metadata: {
        agent: this.name,
        timestamp: new Date().toISOString(),
        commandCount: result.commands.length
      }
    };
  }

  /**
   * Convert command to different shell
   */
  async convertShell(command, fromShell, toShell, context = {}) {
    console.log(`\n🔄 Converting command from ${fromShell} to ${toShell}...`);
    
    const conversionContext = {
      ...context,
      originalCommand: command,
      fromShell,
      toShell
    };

    const query = `Convert this ${fromShell} command to ${toShell}:

${command}

Maintain the same functionality while using ${toShell} idioms and best practices.`;

    return await this.generate(query, conversionContext);
  }

  /**
   * Explain an existing command
   */
  async explain(command, context = {}) {
    console.log(`\n📖 Explaining command...`);
    
    const explainSchema = {
      type: "object",
      properties: {
        terminalCommand: { type: "string" },
        summary: { type: "string" },
        reasoning: { type: "string" },
        breakdown: {
          type: "array",
          items: {
            type: "object",
            properties: {
              part: { type: "string" },
              explanation: { type: "string" }
            }
          }
        },
        requiresSudo: { type: "boolean" },
        isDestructive: { type: "boolean" },
        riskLevel: {
          type: "string",
          enum: ["safe", "low", "medium", "high", "critical"]
        },
        safetyWarnings: {
          type: "array",
          items: { type: "string" }
        },
        potentialIssues: {
          type: "array",
          items: { type: "string" }
        },
        bestPractices: {
          type: "array",
          items: { type: "string" }
        },
        missingContext: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: ["terminalCommand", "summary", "reasoning", "breakdown", "missingContext"]
    };

    const result = await signedStructuredResponse({
      query: `Explain this terminal command in detail:

${command}

Provide a comprehensive breakdown of what each part does, any risks involved, and best practices.`,
      schema: explainSchema,
      context: context,
      temperature: 0.3,
      agentKey: this.keys,
      systemPrompt: this.getSystemPrompt()
    });

    return result;
  }

  /**
   * Generate safe version of a potentially dangerous command
   */
  async makeSafe(command, context = {}) {
    console.log(`\n🛡️  Generating safer version of command...`);
    
    const safeContext = {
      ...context,
      originalCommand: command,
      safetyPriority: true
    };

    const query = `Make this command safer while maintaining its core functionality:

${command}

Add appropriate safeguards, validation, and error handling. Suggest dry-run options if available.`;

    return await this.generate(query, safeContext);
  }

  /**
   * Get agent capabilities
   */
  getCapabilities() {
    return [
      'Generate terminal commands from natural language',
      'Support multiple shells (bash, zsh, powershell, cmd, fish)',
      'Cross-platform command generation',
      'Safety and security warnings',
      'Sudo/elevation requirement detection',
      'Risk level assessment',
      'Command explanation and breakdown',
      'Alternative approach suggestions',
      'Prerequisite detection',
      'Command sequence generation',
      'Shell-to-shell command conversion',
      'Command safety analysis',
      'Rollback command generation',
      'Cryptographic signing of commands',
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
      role: 'Terminal Command Generation',
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

    const { action, query, context, memory, command, fromShell, toShell } = message.payload;

    switch (action) {
      case 'generate':
        return await this.generate(query, context || {}, memory);
      
      case 'generateSequence':
        return await this.generateSequence(query, context || {}, memory);
      
      case 'convertShell':
        return await this.convertShell(command, fromShell, toShell, context || {});
      
      case 'explain':
        return await this.explain(command, context || {});
      
      case 'makeSafe':
        return await this.makeSafe(command, context || {});
      
      case 'getCapabilities':
        return this.getCapabilities();
      
      case 'getIdentity':
        return this.getIdentity();
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
}

export default TerminalAgent;
