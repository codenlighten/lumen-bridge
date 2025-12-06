import OpenAI from "openai";
import dotenv from "dotenv";
import { encode } from "gpt-tokenizer";
import { verifySignature } from "../tools/der-signature.js";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

const OPENAI_MODEL = "gpt-5-nano";

dotenv.config();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ======================================================
 * Memory Manager — rolling 21-message + 3-summary logic
 * ====================================================== */
export class MemoryManager {
  constructor({ 
    maxInteractions = 21, 
    maxSummaries = 3, 
    tokenLimit = 100000,
    persistToFile = true,
    memoryDir = './memory',
    ownerName = 'default'
  } = {}) {
    this.maxInteractions = maxInteractions;
    this.maxSummaries = maxSummaries;
    this.tokenLimit = tokenLimit;
    this.persistToFile = persistToFile;
    this.memoryDir = memoryDir;
    this.ownerName = ownerName;

    this.interactions = []; // [{ role, text, ts }]
    this.summaries = [];    // [{ range, text, ts }]
    this.totalCount = 0;

    // Initialize file persistence if enabled
    if (this.persistToFile) {
      this._initializeFileSystem();
      this._loadFromFile();
    }
  }

  async _initializeFileSystem() {
    try {
      await fs.mkdir(this.memoryDir, { recursive: true });
      // Only log once - directory creation is idempotent
    } catch (error) {
      console.error(`❌ [${this.ownerName}] Failed to create memory directory: ${error.message}`);
      this.persistToFile = false;
    }
  }

  _getMemoryFilePath(date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const fileName = `${this.ownerName}-memory-${targetDate}.json`;
    return path.join(this.memoryDir, fileName);
  }

  async _loadFromFile() {
    try {
      const filePath = this._getMemoryFilePath();
      
      const data = await fs.readFile(filePath, 'utf8');
      const memoryData = JSON.parse(data);
      
      this.interactions = memoryData.interactions || [];
      this.summaries = memoryData.summaries || [];
      this.totalCount = memoryData.totalCount || 0;
      
      console.log(`   💾 [${this.ownerName}] Loaded ${this.interactions.length} interactions (total: ${this.totalCount})`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Fresh session - no log needed
      } else {
        console.error(`❌ [${this.ownerName}] Error loading memory: ${error.message}`);
      }
    }
  }

  async _saveToFile() {
    if (!this.persistToFile) return;
    
    try {
      const filePath = this._getMemoryFilePath();
      const memoryData = {
        interactions: this.interactions,
        summaries: this.summaries,
        totalCount: this.totalCount,
        lastUpdated: new Date().toISOString(),
        metadata: {
          ownerName: this.ownerName,
          maxInteractions: this.maxInteractions,
          maxSummaries: this.maxSummaries,
          tokenLimit: this.tokenLimit
        }
      };
      
      await fs.writeFile(filePath, JSON.stringify(memoryData, null, 2), 'utf8');
      // Silent save - only log on errors
    } catch (error) {
      console.error(`❌ [${this.ownerName}] Error saving memory: ${error.message}`);
    }
  }

  async _createBackup() {
    if (!this.persistToFile) return;
    
    try {
      const currentFile = this._getMemoryFilePath();
      const backupFile = currentFile.replace('.json', `-backup-${Date.now()}.json`);
      
      await fs.copyFile(currentFile, backupFile);
      console.log(`🔒 Memory backup created: ${backupFile}`);
    } catch (error) {
      console.error(`❌ Error creating backup: ${error.message}`);
    }
  }

  _countTokens(text) {
    if (!text || typeof text !== 'string') return 0;
    try { return encode(text).length; }
    catch { return text.split(/\s+/).length * 1.3; }
  }

  _contextTokenCount() {
    const inter = this.interactions.reduce((n, i) => n + this._countTokens(i.text), 0);
    const sums = this.summaries.reduce((n, s) => n + this._countTokens(s.text), 0);
    return inter + sums;
  }

  async addInteraction(role, text, signature = null, publicKey = null, originalHash = null) {
    const ts = new Date().toISOString();
    this.totalCount += 1;
    
    // Create interaction object with cryptographic fields
    const interaction = { 
      role, 
      text, 
      ts,
      signature,
      publicKey,
      originalHash,
      verified: false
    };

    // Verify signature if provided
    if (signature && publicKey) {
      try {
        // Use original hash if provided, otherwise create new hash
        const hashToVerify = originalHash || crypto.createHash('sha256').update(text).digest('hex');
        interaction.textHash = hashToVerify;
        interaction.verified = await verifySignature(hashToVerify, signature, publicKey);
        if (interaction.verified) {
          console.log(`✅ Signature verified for ${role} message`);
        } else {
          console.log(`❌ Signature verification failed for ${role} message`);
        }
      } catch (error) {
        console.error(`❌ Signature verification error: ${error.message}`);
        interaction.verified = false;
      }
    }

    this.interactions.push(interaction);

    // If > maxInteractions messages, summarize the newest batch
    if (this.interactions.length > this.maxInteractions) {
      console.log(`📊 Creating summary for interactions ${this.totalCount - this.maxInteractions} to ${this.totalCount}`);
      const startIndex = this.totalCount - this.maxInteractions;
      const endIndex = this.totalCount;
      const summary = await this._summarizeWindow(startIndex, endIndex);
      this._storeSummary(summary, startIndex, endIndex);
      this.interactions.shift(); // remove oldest
    }

    // If token budget exceeded, compress summaries
    if (this._contextTokenCount() > this.tokenLimit) {
      console.log(`🗜️ Token limit exceeded, compressing summaries`);
      await this._compressSummaries();
    }

    // Save to file after each interaction
    await this._saveToFile();
  }

  async _summarizeWindow(startIndex, endIndex) {
    const windowText = this.interactions.map(i => `${i.role}: ${i.text}`).join("\n");
    const systemPrompt = `
You are a conversation summarizer.
Summarize these 21 messages (≈300 words) preserving:
• Goals, decisions, facts, names, and evolving state.
Output valid JSON:
{
  "range": {"startIndex": number, "endIndex": number},
  "text": string,
  "ts": string
}`;

    const res = await client.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 1.0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: windowText }
      ],
      response_format: { type: "json_object" }
    });

    try {
      return JSON.parse(res.choices[0].message.content);
    } catch (err) {
      console.error("❌ _summarizeWindow JSON parse error:", err);
      console.error("Raw content:", res.choices[0].message.content);
      return {
        range: { startIndex, endIndex },
        text: `Summary of ${startIndex}-${endIndex}: ${windowText.slice(0, 400)}...`,
        ts: new Date().toISOString()
      };
    }
  }

  _storeSummary(summary, startIndex, endIndex) {
    const entry = {
      range: { startIndex, endIndex },
      text: summary.text || summary,
      ts: new Date().toISOString()
    };
    this.summaries.push(entry);
    if (this.summaries.length > this.maxSummaries) this.summaries.shift();
  }

  async _compressSummaries() {
    if (this.summaries.length < 3) return;
    const combined = this.summaries.map((s, i) => `(${i + 1}) ${s.text}`).join("\n");

    const res = await client.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 1.0,
      messages: [
        { role: "system", content: "Condense the following summaries into one, preserving all key facts, names, and goals." },
        { role: "user", content: combined }
      ]
    });

    const meta = res.choices[0].message.content;
    this.summaries = [{
      range: { startIndex: 0, endIndex: this.totalCount },
      text: meta,
      ts: new Date().toISOString()
    }];
  }

  getContext() {
    const summaryMessages = this.summaries.slice(-3).map(s => ({
      role: "system",
      content: `Summary of conversation from message ${s.range.startIndex} to ${s.range.endIndex}:\n${s.text}`
    }));

    const interactionMessages = this.interactions.map(i => ({
      role: i.role === 'ai' ? 'assistant' : i.role,
      content: i.text
    }));

    return [
      ...summaryMessages,
      ...interactionMessages
    ];
  }

  getStats() {
    return {
      enabled: true,
      interactions: this.interactions.length,
      summaries: this.summaries.length,
      totalCount: this.totalCount,
      tokenCount: this._contextTokenCount(),
      persistenceEnabled: this.persistToFile,
      memoryFile: this.persistToFile ? this._getMemoryFilePath() : null,
      ownerName: this.ownerName
    };
  }

  // Additional utility methods for memory management
  
  /**
   * Clear all memory (interactions and summaries)
   */
  clearMemory() {
    this.interactions = [];
    this.summaries = [];
    this.totalCount = 0;
    console.log(`🧹 Memory cleared for ${this.ownerName}`);
  }

  /**
   * Export memory to a JSON file
   */
  async exportMemory(filePath = null) {
    const exportPath = filePath || `./exports/${this.ownerName}-export-${Date.now()}.json`;
    const exportData = {
      interactions: this.interactions,
      summaries: this.summaries,
      totalCount: this.totalCount,
      metadata: {
        ownerName: this.ownerName,
        exported: new Date().toISOString(),
        version: '1.0'
      }
    };

    try {
      await fs.mkdir(path.dirname(exportPath), { recursive: true });
      await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2), 'utf8');
      console.log(`📤 Memory exported to: ${exportPath}`);
      return exportPath;
    } catch (error) {
      console.error(`❌ Export failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Import memory from a JSON file
   */
  async importMemory(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const importData = JSON.parse(data);
      
      this.interactions = importData.interactions || [];
      this.summaries = importData.summaries || [];
      this.totalCount = importData.totalCount || 0;
      
      console.log(`📥 Memory imported from: ${filePath}`);
      console.log(`✅ Loaded: ${this.interactions.length} interactions, ${this.summaries.length} summaries`);
      
      // Save the imported data
      await this._saveToFile();
    } catch (error) {
      console.error(`❌ Import failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get memory usage summary
   */
  getMemoryUsage() {
    return {
      interactionCount: this.interactions.length,
      summaryCount: this.summaries.length,
      totalTokens: this._contextTokenCount(),
      tokenLimit: this.tokenLimit,
      utilizationPercent: Math.round((this._contextTokenCount() / this.tokenLimit) * 100),
      needsCompression: this._contextTokenCount() > this.tokenLimit * 0.8
    };
  }

  /**
   * Export all memory data
   */
  export() {
    return {
      ownerName: this.ownerName,
      interactions: this.interactions,
      summaries: this.summaries,
      config: {
        maxInteractions: this.maxInteractions,
        maxSummaries: this.maxSummaries,
        tokenLimit: this.tokenLimit,
        compressionThreshold: this.compressionThreshold
      },
      stats: this.getStats(),
      exportedAt: new Date().toISOString()
    };
  }
}

// Factory function for creating memory managers
export function createMemoryManager(config = {}) {
  return new MemoryManager(config);
}

// Default export
export default MemoryManager;