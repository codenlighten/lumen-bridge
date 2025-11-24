import { BaseLLMProvider } from "./BaseLLMProvider.js";
import http from "http";

/**
 * LlamaProvider - Integration with local Llama via Ollama
 * Provides local LLM inference as alternative to OpenAI
 */
export class LlamaProvider extends BaseLLMProvider {
  constructor(config = {}) {
    super(config);
    
    this.endpoint = config.endpoint || process.env.LLAMA_ENDPOINT || 'localhost';
    this.port = config.port || 11434;
    this.model = config.model || process.env.LLAMA_MODEL || 'llama3:8b';
    this.defaultTemperature = config.temperature || 0.4;
  }

  /**
   * Complete chat conversation using Llama via Ollama
   */
  async complete(messages, options = {}) {
    const startTime = Date.now();
    
    const requestBody = {
      model: this.model, // Always use configured Llama model, not OpenAI model name
      messages: messages,
      format: 'json',
      stream: false,
      options: {
        temperature: options.temperature ?? this.defaultTemperature,
        top_p: options.top_p || 0.9
      }
    };

    try {
      const result = await this.#makeRequest(requestBody);
      const elapsed = Date.now() - startTime;
      
      return this.normalizeResponse(result, elapsed);
    } catch (error) {
      throw new Error(`Llama API error: ${error.message}`);
    }
  }

  /**
   * Make HTTP request to Ollama API
   */
  async #makeRequest(body) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(body);
      
      const options = {
        hostname: this.endpoint,
        port: this.port,
        path: '/api/chat',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      };

      const req = http.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const result = JSON.parse(responseData);
            resolve(result);
          } catch (error) {
            reject(new Error(`JSON parse error: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(data);
      req.end();
    });
  }

  /**
   * Normalize Llama response to standard format
   */
  normalizeResponse(rawResponse, elapsed) {
    const content = rawResponse.message?.content || '';
    
    try {
      const parsed = JSON.parse(content);
      return {
        success: true,
        content: parsed,
        rawContent: content,
        provider: 'llama',
        model: rawResponse.model || this.model,
        elapsed,
        usage: {
          promptTokens: rawResponse.prompt_eval_count || 0,
          completionTokens: rawResponse.eval_count || 0,
          totalTokens: (rawResponse.prompt_eval_count || 0) + (rawResponse.eval_count || 0)
        }
      };
    } catch (error) {
      // Fallback for non-JSON responses
      return {
        success: false,
        content: { error: "Failed to parse JSON", raw: content },
        rawContent: content,
        provider: 'llama',
        model: rawResponse.model || this.model,
        elapsed
      };
    }
  }

  /**
   * Get provider name
   */
  getName() {
    return 'llama';
  }

  /**
   * Check if Llama/Ollama is available
   */
  async isAvailable() {
    try {
      const result = await this.#makeRequest({ model: this.model, prompt: 'test' });
      return !!result;
    } catch {
      return false;
    }
  }

  /**
   * Get Llama capabilities
   */
  getCapabilities() {
    return {
      structuredOutput: true,
      streaming: false,
      contextWindow: 8192, // Llama 3 8B
      maxTokens: 2048
    };
  }
}

export default LlamaProvider;
