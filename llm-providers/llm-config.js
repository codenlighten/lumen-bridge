import dotenv from 'dotenv';

dotenv.config();

/**
 * LLM Configuration
 * Manages provider selection and configuration
 */

export const LLMConfig = {
  // Provider selection: 'openai', 'llama', or 'auto'
  defaultProvider: process.env.LLM_PROVIDER || 'auto',
  
  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.4'),
    maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || '3')
  },
  
  // Llama/Ollama Configuration
  llama: {
    endpoint: process.env.LLAMA_ENDPOINT || 'localhost',
    port: parseInt(process.env.LLAMA_PORT || '11434'),
    model: process.env.LLAMA_MODEL || 'llama3:8b',
    temperature: parseFloat(process.env.LLAMA_TEMPERATURE || '0.4')
  },
  
  // Fallback behavior when primary provider fails
  fallback: {
    enabled: process.env.LLM_FALLBACK === 'true',
    // If OpenAI fails, try Llama; if Llama fails, try OpenAI
    order: ['openai', 'llama']
  },
  
  // Debug settings
  debug: process.env.LLM_DEBUG === 'true',
  logResponses: process.env.LLM_LOG_RESPONSES === 'true'
};

/**
 * Get provider preference order based on configuration
 */
export function getProviderOrder() {
  const { defaultProvider, fallback } = LLMConfig;
  
  if (defaultProvider === 'auto') {
    // Auto mode: try both in order
    return fallback.order;
  }
  
  if (fallback.enabled) {
    // Return primary provider first, then fallbacks
    return [
      defaultProvider,
      ...fallback.order.filter(p => p !== defaultProvider)
    ];
  }
  
  // No fallback - only use specified provider
  return [defaultProvider];
}

/**
 * Validate configuration for a provider
 */
export function validateProviderConfig(provider) {
  if (provider === 'openai') {
    if (!LLMConfig.openai.apiKey) {
      throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY environment variable.');
    }
    return true;
  }
  
  if (provider === 'llama') {
    if (!LLMConfig.llama.endpoint || !LLMConfig.llama.port) {
      throw new Error('Llama endpoint not configured. Set LLAMA_ENDPOINT and LLAMA_PORT.');
    }
    return true;
  }
  
  throw new Error(`Unknown provider: ${provider}`);
}

export default LLMConfig;
