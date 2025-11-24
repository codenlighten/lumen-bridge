import { OpenAIProvider } from './OpenAIProvider.js';
import { LlamaProvider } from './LlamaProvider.js';
import { LLMConfig, getProviderOrder, validateProviderConfig } from './llm-config.js';

/**
 * Provider Factory
 * Creates and manages LLM provider instances
 */

const providerInstances = new Map();

/**
 * Get provider instance by name
 */
export function getProvider(providerName, config = {}) {
  // Check cache
  if (providerInstances.has(providerName)) {
    return providerInstances.get(providerName);
  }
  
  // Validate config
  validateProviderConfig(providerName);
  
  // Create new instance
  let provider;
  switch (providerName.toLowerCase()) {
    case 'openai':
      provider = new OpenAIProvider({
        apiKey: config.apiKey || LLMConfig.openai.apiKey,
        model: config.model || LLMConfig.openai.model,
        temperature: config.temperature || LLMConfig.openai.temperature
      });
      break;
      
    case 'llama':
      provider = new LlamaProvider({
        endpoint: config.endpoint || LLMConfig.llama.endpoint,
        port: config.port || LLMConfig.llama.port,
        model: config.model || LLMConfig.llama.model,
        temperature: config.temperature || LLMConfig.llama.temperature
      });
      break;
      
    default:
      throw new Error(`Unknown provider: ${providerName}`);
  }
  
  // Cache and return
  providerInstances.set(providerName, provider);
  return provider;
}

/**
 * Get default provider based on configuration
 */
export async function getDefaultProvider() {
  const order = getProviderOrder();
  
  for (const providerName of order) {
    try {
      const provider = getProvider(providerName);
      const available = await provider.isAvailable();
      
      if (available) {
        if (LLMConfig.debug) {
          console.log(`[LLM] Using provider: ${providerName}`);
        }
        return provider;
      }
    } catch (error) {
      if (LLMConfig.debug) {
        console.log(`[LLM] Provider ${providerName} unavailable: ${error.message}`);
      }
      continue;
    }
  }
  
  throw new Error('No LLM providers available');
}

/**
 * Execute completion with automatic provider selection and fallback
 */
export async function complete(messages, options = {}) {
  const providerName = options.provider || LLMConfig.defaultProvider;
  const startTime = Date.now();
  
  if (providerName !== 'auto') {
    // Use specific provider - don't pass full options to factory (only to complete method)
    const provider = getProvider(providerName);
    return await provider.complete(messages, options);
  }
  
  // Auto mode - try providers in order
  const order = getProviderOrder();
  let lastError;
  
  for (const name of order) {
    try {
      const provider = getProvider(name);
      const available = await provider.isAvailable();
      
      if (!available) continue;
      
      const result = await provider.complete(messages, options);
      
      if (LLMConfig.debug) {
        const elapsed = Date.now() - startTime;
        console.log(`[LLM] Completed with ${name} in ${elapsed}ms`);
      }
      
      return result;
    } catch (error) {
      lastError = error;
      if (LLMConfig.debug) {
        console.log(`[LLM] Provider ${name} failed: ${error.message}`);
      }
      continue;
    }
  }
  
  throw new Error(`All providers failed. Last error: ${lastError?.message}`);
}

/**
 * Clear provider cache (useful for testing or config changes)
 */
export function clearProviderCache() {
  providerInstances.clear();
}

// Export everything
export { OpenAIProvider, LlamaProvider, LLMConfig };
export default {
  getProvider,
  getDefaultProvider,
  complete,
  clearProviderCache,
  OpenAIProvider,
  LlamaProvider,
  LLMConfig
};
