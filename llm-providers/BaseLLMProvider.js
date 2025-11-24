/**
 * BaseLLMProvider - Abstract base class for all LLM providers
 * 
 * This interface ensures all LLM providers (OpenAI, Llama, etc.) 
 * have a consistent API for the Lumen agent system.
 */

export class BaseLLMProvider {
  constructor(config = {}) {
    if (this.constructor === BaseLLMProvider) {
      throw new Error("BaseLLMProvider is abstract and cannot be instantiated directly");
    }
    this.config = config;
  }

  /**
   * Complete a chat conversation
   * @param {Array} messages - Array of message objects with role and content
   * @param {Object} options - Generation options (temperature, etc.)
   * @returns {Promise<Object>} - Standardized response object
   */
  async complete(messages, options = {}) {
    throw new Error("complete() must be implemented by subclass");
  }

  /**
   * Validate and normalize response to standard format
   * @param {any} rawResponse - Raw response from LLM
   * @returns {Object} - Normalized response
   */
  normalizeResponse(rawResponse) {
    throw new Error("normalizeResponse() must be implemented by subclass");
  }

  /**
   * Get provider name
   * @returns {string}
   */
  getName() {
    throw new Error("getName() must be implemented by subclass");
  }

  /**
   * Check if provider is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    throw new Error("isAvailable() must be implemented by subclass");
  }

  /**
   * Get provider capabilities
   * @returns {Object}
   */
  getCapabilities() {
    return {
      structuredOutput: false,
      streaming: false,
      contextWindow: 0,
      maxTokens: 0
    };
  }
}

export default BaseLLMProvider;
