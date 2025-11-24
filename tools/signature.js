import { generateKeys } from './generate-keys.js';
import { getAddressFromPrivateKey, getPublicKeyFromPrivateKey } from './der-signature.js';

/**
 * Platform-level signature management
 * Provides platform keys and agent key generation for structured-json.js
 */

// Initialize platform keys immediately
function initializePlatformKeys() {
  // In production, you might want to load from environment or secure storage
  if (process.env.PLATFORM_PRIVATE_KEY) {
    return {
      privateKey: process.env.PLATFORM_PRIVATE_KEY,
      publicKey: getPublicKeyFromPrivateKey(process.env.PLATFORM_PRIVATE_KEY),
      address: getAddressFromPrivateKey(process.env.PLATFORM_PRIVATE_KEY)
    };
  } else {
    // Generate new keys if none exist
    const keys = generateKeys();
    console.log('⚠️  Generated new platform keys. In production, save these securely!');
    console.log('Platform Address:', keys.address);
    return keys;
  }
}

// Generate or load platform keys (in production, these should be loaded from secure storage)
const _platformKeys = initializePlatformKeys();

function getPlatformKeys() {
  return _platformKeys;
}

// Export platform information
export const platformKeys = _platformKeys;
export const platformAddress = _platformKeys.address;
export const platformPublicKey = _platformKeys.publicKey;

/**
 * Create agent-specific keys
 * @param {string} agentName - Name identifier for the agent
 * @param {Object} options - Additional options for key generation
 * @returns {Object} Agent keys with name, privateKey, publicKey, address
 */
export function createAgentKeys(agentName, options = {}) {
  const keys = generateKeys();
  
  return {
    ...keys,
    agentName,
    created: new Date().toISOString(),
    ...options
  };
}

/**
 * Get platform signing capability
 * @returns {Object} Platform keys for signing
 */
export function getPlatformSigningKeys() {
  return getPlatformKeys();
}

// Export for backwards compatibility
export default {
  platformAddress,
  platformPublicKey,
  createAgentKeys,
  getPlatformSigningKeys
};