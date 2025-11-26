/**
 * SmartLedger Helpers
 * Client-side BSV cryptographic operations
 * Requires: SmartLedger BSV library v3.3.5+
 */

// Define Buffer using BSV's implementation
const Buffer = window.bsv ? window.bsv.deps.Buffer : null;

const SmartLedgerHelpers = {
  version: '1.0.0',

  /**
   * Get library information
   */
  getInfo() {
    return {
      version: this.version,
      bsvAvailable: typeof bsv !== 'undefined',
      mnemonicAvailable: !!(window.bsvMnemonic || window.Mnemonic || (window.bsv && window.bsv.Mnemonic)),
      bsvVersion: window.bsv ? (bsv.version || '3.3.5') : 'N/A'
    };
  },

  /**
   * Generate a new mnemonic phrase
   * @param {number} strength - 128 for 12 words, 256 for 24 words
   * @returns {string} Mnemonic phrase
   */
  generateMnemonic(strength = 256) {
    const MnemonicClass = window.bsvMnemonic || window.Mnemonic || (window.bsv && window.bsv.Mnemonic);
    if (!MnemonicClass) {
      throw new Error('Mnemonic module not loaded');
    }
    
    const mnemonic = MnemonicClass.fromRandom(strength);
    return mnemonic.phrase || mnemonic.toString();
  },

  /**
   * Validate a mnemonic phrase
   * @param {string} mnemonicPhrase - Mnemonic to validate
   * @returns {boolean} True if valid
   */
  validateMnemonic(mnemonicPhrase) {
    const MnemonicClass = window.bsvMnemonic || window.Mnemonic || (window.bsv && window.bsv.Mnemonic);
    if (!MnemonicClass) {
      throw new Error('Mnemonic module not loaded');
    }

    try {
      new MnemonicClass(mnemonicPhrase);
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Derive keys from a mnemonic phrase
   * @param {string} mnemonicPhrase - Mnemonic phrase
   * @param {string} derivationPath - BIP44 derivation path
   * @returns {Object} Keys object with address, publicKey, privateKey, wif
   */
  deriveKeysFromMnemonic(mnemonicPhrase, derivationPath = "m/44'/236'/0'/0/0") {
    if (typeof bsv === 'undefined') {
      throw new Error('BSV library not loaded');
    }

    const MnemonicClass = window.bsvMnemonic || window.Mnemonic || (window.bsv && window.bsv.Mnemonic);
    if (!MnemonicClass) {
      throw new Error('Mnemonic module not loaded');
    }

    const mnemonic = new MnemonicClass(mnemonicPhrase);
    const seed = mnemonic.toSeed();
    const hdPrivateKey = bsv.HDPrivateKey.fromSeed(seed);
    const derivedKey = hdPrivateKey.deriveChild(derivationPath);
    const privateKey = derivedKey.privateKey;
    const publicKey = privateKey.toPublicKey();
    const address = bsv.Address.fromPrivateKey(privateKey).toString();

    return {
      address,
      publicKey: publicKey.toString('hex'),
      privateKey: privateKey.toString(),
      wif: privateKey.toWIF()
    };
  },

  /**
   * Generate dual keys (identity + financial) from mnemonic
   * @param {string} mnemonicPhrase - Mnemonic phrase
   * @returns {Object} Object with identity and financial keys
   */
  generateDualKeys(mnemonicPhrase) {
    const identityKeys = this.deriveKeysFromMnemonic(mnemonicPhrase, "m/44'/236'/0'/0/0");
    const financialKeys = this.deriveKeysFromMnemonic(mnemonicPhrase, "m/44'/0'/0'/0/0");

    return {
      identity: identityKeys,
      financial: financialKeys,
      mnemonic: mnemonicPhrase
    };
  },

  /**
   * Sign data with a private key
   * @param {string} message - Message to sign
   * @param {string} wif - WIF private key
   * @returns {Object} Signature details
   */
  signData(message, wif) {
    if (typeof bsv === 'undefined') {
      throw new Error('BSV library not loaded');
    }

    const privateKey = bsv.PrivateKey.fromWIF(wif);
    const signature = bsv.Message(message).sign(privateKey);
    const publicKey = privateKey.toPublicKey();
    const address = bsv.Address.fromPrivateKey(privateKey).toString();

    return {
      signature: signature,
      publicKey: publicKey.toString('hex'),
      address: address,
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Verify a signature
   * @param {string} message - Original message
   * @param {string} signature - Signature string
   * @param {string} publicKeyHex - Public key in hex
   * @returns {boolean} True if valid
   */
  verifySignature(message, signature, publicKeyHex) {
    if (typeof bsv === 'undefined') {
      throw new Error('BSV library not loaded');
    }

    try {
      const publicKey = bsv.PublicKey.fromString(publicKeyHex);
      const address = bsv.Address.fromPublicKey(publicKey);
      return bsv.Message(message).verify(address, signature);
    } catch (error) {
      console.error('Verification error:', error);
      return false;
    }
  },

  /**
   * Encrypt data with AES-256-GCM
   * @param {string} data - Data to encrypt
   * @param {string} password - Encryption password
   * @returns {Promise<Object>} Encrypted data object
   */
  async encryptData(data, password) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    // Derive key from password using PBKDF2
    const passwordBuffer = encoder.encode(password);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      dataBuffer
    );
    
    return {
      ciphertext: Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join(''),
      iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
      salt: Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join(''),
      algorithm: 'AES-256-GCM'
    };
  },

  /**
   * Decrypt data encrypted with encryptData
   * @param {Object} encryptedData - Encrypted data object
   * @param {string} password - Decryption password
   * @returns {Promise<string>} Decrypted data
   */
  async decryptData(encryptedData, password) {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    const passwordBuffer = encoder.encode(password);
    const salt = new Uint8Array(encryptedData.salt.match(/.{2}/g).map(byte => parseInt(byte, 16)));
    const iv = new Uint8Array(encryptedData.iv.match(/.{2}/g).map(byte => parseInt(byte, 16)));
    const ciphertext = new Uint8Array(encryptedData.ciphertext.match(/.{2}/g).map(byte => parseInt(byte, 16)));
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    
    return decoder.decode(decrypted);
  },

  /**
   * Hash data with specified algorithm
   * @param {string} data - Data to hash
   * @param {string} algorithm - SHA256, SHA512, or RIPEMD160
   * @returns {Promise<string>} Hash in hex
   */
  async hash(data, algorithm = 'SHA256') {
    if (typeof bsv !== 'undefined' && bsv.crypto && bsv.crypto.Hash) {
      const buffer = Buffer.from(data, 'utf8');
      let hash;
      
      switch (algorithm.toUpperCase()) {
        case 'SHA256':
          hash = bsv.crypto.Hash.sha256(buffer);
          break;
        case 'SHA512':
          hash = bsv.crypto.Hash.sha512(buffer);
          break;
        case 'RIPEMD160':
          hash = bsv.crypto.Hash.ripemd160(buffer);
          break;
        default:
          throw new Error(`Unsupported algorithm: ${algorithm}`);
      }
      
      return hash.toString('hex');
    } else {
      // Fallback to Web Crypto API (SHA-256 and SHA-512 only)
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      
      let hashAlgo;
      switch (algorithm.toUpperCase()) {
        case 'SHA256':
          hashAlgo = 'SHA-256';
          break;
        case 'SHA512':
          hashAlgo = 'SHA-512';
          break;
        default:
          throw new Error(`Unsupported algorithm for Web Crypto: ${algorithm}`);
      }
      
      const hashBuffer = await crypto.subtle.digest(hashAlgo, dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  },

  /**
   * Create an encrypted backup of keys
   * @param {Object} keys - Keys object to backup
   * @param {string} password - Backup password
   * @returns {Promise<Object>} Encrypted backup
   */
  async createBackup(keys, password) {
    const backupData = JSON.stringify(keys);
    const encrypted = await this.encryptData(backupData, password);
    
    return {
      ...encrypted,
      version: this.version,
      timestamp: new Date().toISOString(),
      type: 'smartledger-key-backup'
    };
  },

  /**
   * Restore keys from encrypted backup
   * @param {Object} backup - Encrypted backup object
   * @param {string} password - Backup password
   * @returns {Promise<Object>} Restored keys
   */
  async restoreBackup(backup, password) {
    const decrypted = await this.decryptData(backup, password);
    return JSON.parse(decrypted);
  },

  /**
   * Download backup as JSON file
   * @param {Object} backup - Backup object
   * @param {string} filename - Filename for download
   */
  downloadBackup(backup, filename = 'smartledger-backup.json') {
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};

// Create global alias
window.SLH = SmartLedgerHelpers;
window.SmartLedgerHelpers = SmartLedgerHelpers;

console.log('✅ SmartLedger Helpers loaded (v' + SmartLedgerHelpers.version + ')');
