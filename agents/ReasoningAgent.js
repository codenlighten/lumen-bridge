// ReasoningAgent.js
import { signedStructuredResponse } from '../structured-json.js';
import { createAgentKeys } from '../tools/signature.js';

/**
 * ReasoningAgent - Reflection & Meta-Thought Agent
 *
 * Purpose:
 * - Reflect on a user's or another agent's natural language query
 * - Take optional context object and optional memory
 * - Act as a "second brain" that adds high-level thoughts, risks, and next steps
 * - Be used by other agents to get additional thoughts on the conversation
 *
 * Typical Uses:
 * - Meta-analysis of another agent's output
 * - High-level reflection on a complex user request
 * - Identifying assumptions, risks, and missing context
 * - Suggesting next questions or next steps
 */

export class ReasoningAgent {
  constructor(name = 'ReasoningAgent', options = {}) {
    this.name = name;
    this.keys = createAgentKeys(name, { role: 'Reasoning / Reflection' });

    this.defaultTone = options.defaultTone || 'neutral'; // neutral | optimistic | concerned | critical | supportive
    this.defaultMode = options.defaultMode || 'general'; // general | critique | brainstorm | summary | planning
  }

  /**
   * Core reasoning / reflection schema
   * (This will be merged with the base envelope schema in signedStructuredResponse)
   */
  getReasoningSchema() {
    return {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description: 'Short, high-level summary of the situation or content (1–3 sentences).'
        },
        keyPoints: {
          type: 'array',
          items: { type: 'string' },
          description: 'Most important points, insights, or observations.'
        },
        assumptions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Assumptions you are making that may not be explicitly stated.'
        },
        risksOrConcerns: {
          type: 'array',
          items: { type: 'string' },
          description: 'Potential risks, pitfalls, or failure modes to be aware of.'
        },
        opportunities: {
          type: 'array',
          items: { type: 'string' },
          description: 'Opportunities, advantages, or promising directions you see.'
        },
        questions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Clarifying or probing questions that would improve understanding.'
        },
        suggestedNextSteps: {
          type: 'array',
          items: { type: 'string' },
          description: 'Concrete, ordered next steps you recommend.'
        },
        confidence: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: 'Overall confidence in your analysis (0–1).'
        },
        tone: {
          type: 'string',
          enum: ['neutral', 'optimistic', 'concerned', 'critical', 'supportive'],
          description: 'Overall tone of the reasoning.'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Short tags/labels for the main themes (e.g. "architecture", "risk", "scope").'
        },
        reasoning: {
          type: 'string',
          description: 'Expanded explanation (short essay) of how you arrived at your conclusions.'
        },
        // Keep missingContext here so it’s explicit for this agent,
        // and it will be merged with the base envelope’s required field.
        missingContext: {
          type: 'array',
          items: { type: 'string' },
          description: 'What information would meaningfully improve this reasoning? Empty if nothing obvious is missing.'
        }
      },
      required: ['summary', 'reasoning', 'missingContext']
    };
  }

  /**
   * Build the core prompt for the reasoning agent.
   *
   * @param {string} query - Original natural language query or content
   * @param {object} context - Optional context object
   * @param {object} options - Additional control options (mode, source, agentName, agentOutput)
   */
  buildPrompt(query, context = {}, options = {}) {
    const {
      mode = this.defaultMode,
      source = 'user', // 'user' | 'agent'
      sourceAgentName = null,
      agentOutput = null
    } = options;

    let prompt = '';

    // Describe what we are doing
    prompt += `You are a dedicated reasoning and reflection agent.\n`;
    prompt += `Your job is NOT to re-do the work, but to think *about* the work.\n\n`;

    prompt += `Context of this reasoning request:\n`;
    prompt += `- Source: ${source === 'agent' ? 'Another agent' : 'Direct user message'}\n`;
    if (sourceAgentName) {
      prompt += `- Source Agent Name: ${sourceAgentName}\n`;
    }
    prompt += `- Mode: ${mode}\n\n`;

    // Base content
    if (source === 'agent' && agentOutput) {
      prompt += `ORIGINAL USER / SYSTEM REQUEST:\n`;
      prompt += `${query}\n\n`;

      prompt += `AGENT (${sourceAgentName || 'Unknown Agent'}) OUTPUT:\n`;
      prompt += `${typeof agentOutput === 'string' ? agentOutput : JSON.stringify(agentOutput, null, 2)}\n\n`;

      prompt += `Your job is to reflect ON this conversation and output, not to simply restate it.\n\n`;
    } else {
      prompt += `USER MESSAGE TO REFLECT ON:\n`;
      prompt += `${query}\n\n`;
    }

    // Add context object if present
    if (context && Object.keys(context).length > 0) {
      prompt += `ADDITIONAL CONTEXT OBJECT (JSON):\n`;
      prompt += `${JSON.stringify(context, null, 2)}\n\n`;
    }

    // Mode-specific guidance
    prompt += `Mode-specific guidance:\n`;
    switch (mode) {
      case 'critique':
        prompt += `- Focus on strengths, weaknesses, and potential issues.\n`;
        prompt += `- Identify logical gaps and risks.\n`;
        break;
      case 'brainstorm':
        prompt += `- Focus on generating opportunities and options.\n`;
        prompt += `- Be creative but still practical.\n`;
        break;
      case 'summary':
        prompt += `- Focus on clear, concise summarization and key points.\n`;
        break;
      case 'planning':
        prompt += `- Focus on next steps, ordering, and dependencies.\n`;
        break;
      default:
        prompt += `- Provide balanced high-level reflection, risks, opportunities, and next steps.\n`;
        break;
    }

    prompt += `\nUse the "response" field for your main narrative reflection (1–3 short paragraphs).\n`;
    prompt += `Populate all other fields in the JSON schema as completely and concisely as possible.\n`;

    return prompt;
  }

  /**
   * Prepare context for the LLM.
   * If memory is an array of messages, pass that as conversation context.
   * Otherwise, fall back to the plain context object.
   */
  prepareContext(context = {}, memory = null) {
    if (memory && Array.isArray(memory)) {
      return memory; // used as prior messages
    }
    return context; // used as additional JSON context
  }

  /**
   * System prompt for the ReasoningAgent
   */
  getSystemPrompt() {
    return `You are an expert meta-reasoning and reflection agent.

Your role:
1. Think about the *meaning* and *implications* of what is said.
2. Identify assumptions, risks, and opportunities.
3. Suggest concrete, practical next steps.
4. Surface missing context that would improve decisions.
5. Stay concise, structured, and helpful.

Important:
- Use "response" for your main narrative reflection (1–3 short paragraphs).
- "summary" should be a one- or two-sentence high-level overview.
- Be honest about uncertainty; use the "confidence" field.
- Avoid low-level chain-of-thought about model internals; focus on human-friendly reasoning.`;
  }

  /**
   * Reflect on a query (from a user or an agent).
   *
   * @param {string} query
   * @param {object} context - Optional context object
   * @param {Array|null} memory - Optional array of prior messages
   * @param {object} options - { mode, source, sourceAgentName, agentOutput }
   */
  async reflect(query, context = {}, memory = null, options = {}) {
    console.log(`\n🧠 ReasoningAgent reflecting on: "${query.substring(0, 60)}${query.length > 60 ? '...' : ''}"`);

    const prompt = this.buildPrompt(query, context, options);
    const llmContext = this.prepareContext(context, memory);

    const result = await signedStructuredResponse({
      query: prompt,
      schema: this.getReasoningSchema(),
      context: llmContext,
      temperature: 0.35,
      agentKey: this.keys,
      systemPrompt: this.getSystemPrompt()
    });

    const enhanced = this.enhanceResult(result, {
      context,
      options
    });

    this.logReasoningSummary(enhanced);

    return enhanced;
  }

  /**
   * Convenience wrapper: reflect specifically on another agent's output.
   *
   * @param {object} params
   *    - originalQuery: string
   *    - agentName: string
   *    - agentOutput: string|object
   *    - context?: object
   *    - memory?: Array
   *    - mode?: string
   */
  async reflectOnAgentOutput({
    originalQuery,
    agentName,
    agentOutput,
    context = {},
    memory = null,
    mode = 'critique'
  }) {
    return this.reflect(
      originalQuery,
      context,
      memory,
      {
        mode,
        source: 'agent',
        sourceAgentName: agentName,
        agentOutput
      }
    );
  }

  /**
   * Enhance raw result with metadata and helper flags.
   */
  enhanceResult(result, extra = {}) {
    const missingContext = Array.isArray(result.missingContext) ? result.missingContext : [];

    return {
      ...result,
      metadata: {
        agent: this.name,
        timestamp: new Date().toISOString(),
        hasMissingContext: missingContext.length > 0,
        contextProvided: !!extra.context && Object.keys(extra.context).length > 0,
        mode: extra.options?.mode || this.defaultMode,
        source: extra.options?.source || 'user',
        sourceAgentName: extra.options?.sourceAgentName || null,
        signature: result._signature,
        llm: result._llm
      },
      isComplete: missingContext.length === 0
    };
  }

  /**
   * Log a brief summary of the reasoning for console debugging.
   */
  logReasoningSummary(result) {
    console.log(`   ✅ Reasoning generated successfully`);
    if (result.summary) {
      console.log(`   Summary: ${result.summary}`);
    }

    if (Array.isArray(result.missingContext) && result.missingContext.length > 0) {
      console.log(`   ⚠️  Missing context (${result.missingContext.length}):`);
      result.missingContext.forEach(item => console.log(`      - ${item}`));
    } else {
      console.log(`   ✓ No missing context reported`);
    }

    if (Array.isArray(result.suggestedNextSteps) && result.suggestedNextSteps.length > 0) {
      console.log(`   🚀 Suggested next steps:`);
      result.suggestedNextSteps.slice(0, 3).forEach(step => console.log(`      - ${step}`));
    }
  }

  /**
   * Capabilities description
   */
  getCapabilities() {
    return [
      'High-level reflection on user queries',
      'Meta-reasoning about other agents’ outputs',
      'Identification of assumptions and hidden risks',
      'Highlighting opportunities and promising directions',
      'Suggesting concrete next steps',
      'Surfacing missing context and open questions',
      'Summarization and tagging of themes',
      'Multiple modes (general, critique, brainstorm, summary, planning)',
      'Cryptographic signing of reasoning output',
      'Context-aware reasoning with optional memory'
    ];
  }

  /**
   * Agent identity (for registry / discovery)
   */
  getIdentity() {
    return {
      name: this.name,
      publicKey: this.keys.publicKey,
      address: this.keys.address,
      role: 'Reasoning / Reflection',
      capabilities: this.getCapabilities()
    };
  }

  /**
   * Black-box message interface (Alan Kay style).
   *
   * @param {object} message
   *    - payload: {
   *        action: 'reflect' | 'reflectOnAgent' | 'getCapabilities' | 'getIdentity',
   *        query?,
   *        context?,
   *        memory?,
   *        originalQuery?,
   *        agentName?,
   *        agentOutput?,
   *        mode?
   *      }
   */
  async send(message) {
    if (!message || !message.payload) {
      throw new Error('Invalid message format');
    }

    const {
      action,
      query,
      context,
      memory,
      originalQuery,
      agentName,
      agentOutput,
      mode
    } = message.payload;

    switch (action) {
      case 'reflect':
        if (!query) {
          throw new Error('Missing "query" for reflect action');
        }
        return await this.reflect(query, context || {}, memory || null, {
          mode: mode || this.defaultMode,
          source: message.payload.source || 'user',
          sourceAgentName: message.payload.sourceAgentName || null,
          agentOutput: message.payload.agentOutput || null
        });

      case 'reflectOnAgent':
        if (!originalQuery || !agentName || typeof agentOutput === 'undefined') {
          throw new Error('Missing required fields for reflectOnAgent action');
        }
        return await this.reflectOnAgentOutput({
          originalQuery,
          agentName,
          agentOutput,
          context: context || {},
          memory: memory || null,
          mode: mode || 'critique'
        });

      case 'getCapabilities':
        return this.getCapabilities();

      case 'getIdentity':
        return this.getIdentity();

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
}

export default ReasoningAgent;
