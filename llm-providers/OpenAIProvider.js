import { BaseLLMProvider } from "./BaseLLMProvider.js";
import OpenAI from "openai";

/**
 * OpenAIProvider - Wrapper for OpenAI API
 * Maintains existing functionality while implementing standard interface
 */
export class OpenAIProvider extends BaseLLMProvider {
  #client = null;
  
  constructor(config = {}) {
    super(config);
    
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OpenAI API key is required");
    }
    
    this.#client = new OpenAI({ apiKey });
    this.model = config.model || "gpt-4o-mini";
    this.defaultTemperature = config.temperature || 0.4;
  }

  /**
   * Complete chat conversation using OpenAI
   */
  async complete(messages, options = {}) {
    const startTime = Date.now();
    
    try {
      const response = await this.#client.chat.completions.create({
        model: options.model || this.model,
        temperature: options.temperature ?? this.defaultTemperature,
        messages: messages,
        response_format: options.responseFormat || { type: "json_object" }
      });
      
      const elapsed = Date.now() - startTime;

      return this.normalizeResponse(response, elapsed);
    } catch (error) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  /**
   * Normalize OpenAI response to standard format
   */
  normalizeResponse(rawResponse, elapsed) {
    const content = rawResponse.choices[0].message.content;
    
    try {
      const parsed = JSON.parse(content);
      return {
        success: true,
        content: parsed,
        rawContent: content,
        provider: 'openai',
        model: rawResponse.model,
        elapsed,
        usage: {
          promptTokens: rawResponse.usage?.prompt_tokens || 0,
          completionTokens: rawResponse.usage?.completion_tokens || 0,
          totalTokens: rawResponse.usage?.total_tokens || 0
        }
      };
    } catch (error) {
      // Fallback for non-JSON responses
      return {
        success: false,
        content: { error: "Failed to parse JSON", raw: content },
        rawContent: content,
        provider: 'openai',
        model: rawResponse.model,
        elapsed
      };
    }
  }

  /**
   * Get provider name
   */
  getName() {
    return 'openai';
  }

  /**
   * Check if OpenAI is available
   */
  async isAvailable() {
    try {
      await this.#client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get OpenAI capabilities
   */
  getCapabilities() {
    return {
      structuredOutput: true,
      streaming: true,
      contextWindow: 128000, // GPT-4o-mini
      maxTokens: 16384
    };
  }
}

export default OpenAIProvider;
