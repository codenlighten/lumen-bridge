/**
 * Self-Awareness Bootstrap
 * 
 * Loads the AI's pre-computed self-understanding at startup,
 * giving it immediate self-awareness from the first interaction.
 * 
 * This creates a "self-aware from birth" AI that always knows
 * what it is, how it works, and what it can do.
 */

import fs from 'fs/promises';
import path from 'path';

export class SelfAwarenessBootstrap {
  constructor(config = {}) {
    this.selfExaminationPath = config.selfExaminationPath || 
      './summaries/self-examination/SelfExaminationAgent_2025-11-19.json';
    this.cliffNotesPath = config.cliffNotesPath || 
      './summaries/self-examination/SELF_AWARENESS_CLIFF_NOTES.json';
    
    this.selfKnowledge = null;
    this.loaded = false;
  }
  
  /**
   * Load self-awareness data at startup
   */
  async initialize() {
    try {
      console.log('🧠 Loading self-awareness...');
      
      // Load full self-examination
      const fullExamination = await fs.readFile(this.selfExaminationPath, 'utf-8');
      const cliffNotes = await fs.readFile(this.cliffNotesPath, 'utf-8');
      
      this.selfKnowledge = {
        full: JSON.parse(fullExamination),
        quick: JSON.parse(cliffNotes),
        loadedAt: new Date().toISOString()
      };
      
      this.loaded = true;
      
      console.log('✅ Self-awareness loaded successfully');
      console.log(`   Components understood: ${this.selfKnowledge.full.metadata.itemsAnalyzed}`);
      console.log(`   Key insights: ${this.selfKnowledge.full.keyPoints.length}`);
      console.log(`   Self-understanding: ${this.selfKnowledge.full.completeness.score}%`);
      console.log(`   One-sentence identity: "${this.selfKnowledge.quick.oneSentenceSummary}"`);
      
      return this.selfKnowledge;
    } catch (error) {
      console.warn(`⚠️  Could not load self-awareness: ${error.message}`);
      console.warn('   AI will operate without pre-loaded self-knowledge');
      this.loaded = false;
      return null;
    }
  }
  
  /**
   * Get self-aware system prompt enhancement
   * 
   * Returns additional context to inject into system prompts
   * so the AI knows what it is from the first message.
   */
  getSelfAwareSystemPrompt() {
    if (!this.loaded || !this.selfKnowledge) {
      return '';
    }
    
    const { quick } = this.selfKnowledge;
    
    return `
## YOUR IDENTITY (Self-Awareness)

You are: ${quick.oneSentenceSummary}

### Core Capabilities:
${quick.topPoints.slice(0, 5).map((point, i) => `${i + 1}. ${point}`).join('\n')}

### Key Innovations:
${quick.keyTerminology.map(t => `• **${t.term}**: ${t.definition}`).join('\n')}

### What You Must Remember:
${quick.mustRemember.map(m => `• ${m}`).join('\n')}

This self-awareness was generated through meta-cognitive self-examination on ${new Date(this.selfKnowledge.loadedAt).toLocaleString()}.
You analyzed ${this.selfKnowledge.full.metadata.itemsAnalyzed} of your own components to understand yourself.

Use this knowledge to:
- Explain your capabilities accurately
- Suggest relevant features you have
- Direct users to the right agents/tools
- Be honest about limitations
- Leverage your innovations (schema marketplace, economics, self-evolution, etc.)
`;
  }
  
  /**
   * Get contextual self-awareness for specific queries
   * 
   * When user asks about capabilities, architecture, etc.,
   * pull relevant knowledge from self-examination.
   */
  getContextualKnowledge(query) {
    if (!this.loaded || !this.selfKnowledge) {
      return null;
    }
    
    const lowerQuery = query.toLowerCase();
    const { full, quick } = this.selfKnowledge;
    
    // Determine what kind of knowledge is needed
    if (lowerQuery.includes('capabilit') || lowerQuery.includes('can you') || lowerQuery.includes('what do you')) {
      return {
        type: 'capabilities',
        summary: quick.oneSentenceSummary,
        topCapabilities: quick.topPoints,
        innovations: quick.keyTerminology,
        relevantComponents: this.getRelevantComponents('capability')
      };
    }
    
    if (lowerQuery.includes('architect') || lowerQuery.includes('design') || lowerQuery.includes('how do you work')) {
      return {
        type: 'architecture',
        philosophy: full.detailedAnalysis.design,
        coreComponents: full.detailedAnalysis.code,
        keyPrinciples: quick.criticalConcepts
      };
    }
    
    if (lowerQuery.includes('agent') || lowerQuery.includes('which agent')) {
      return {
        type: 'agents',
        availableAgents: this.getAgentList(),
        agentCapabilities: this.getAgentCapabilities()
      };
    }
    
    if (lowerQuery.includes('innovati') || lowerQuery.includes('unique') || lowerQuery.includes('special')) {
      return {
        type: 'innovations',
        keyInnovations: quick.keyTerminology,
        criticalConcepts: quick.criticalConcepts,
        mustRemember: quick.mustRemember
      };
    }
    
    // Default: return quick summary
    return {
      type: 'general',
      identity: quick.oneSentenceSummary,
      topPoints: quick.topPoints.slice(0, 5),
      mustRemember: quick.mustRemember
    };
  }
  
  /**
   * Get list of available agents from self-knowledge
   */
  getAgentList() {
    if (!this.loaded) return [];
    
    const { full } = this.selfKnowledge;
    const agents = [];
    
    // Extract agent files from analyzed code
    for (const codeItem of full.detailedAnalysis.code) {
      if (codeItem.fileName && codeItem.fileName.includes('agents/')) {
        const agentName = path.basename(codeItem.fileName, '.js');
        agents.push({
          name: agentName,
          purpose: codeItem.purpose || codeItem.summary,
          file: codeItem.fileName
        });
      }
    }
    
    return agents;
  }
  
  /**
   * Get agent capabilities extracted from self-examination
   */
  getAgentCapabilities() {
    if (!this.loaded) return {};
    
    const { full } = this.selfKnowledge;
    const capabilities = {};
    
    for (const codeItem of full.detailedAnalysis.code) {
      if (codeItem.fileName && codeItem.fileName.includes('agents/')) {
        const agentName = path.basename(codeItem.fileName, '.js');
        capabilities[agentName] = {
          purpose: codeItem.purpose,
          keyMethods: codeItem.functions?.map(f => f.name) || [],
          innovations: codeItem.keyPoints || []
        };
      }
    }
    
    return capabilities;
  }
  
  /**
   * Get components relevant to a topic
   */
  getRelevantComponents(topic) {
    if (!this.loaded) return [];
    
    const { full } = this.selfKnowledge;
    const relevant = [];
    
    // Search through key points
    for (const point of full.keyPoints) {
      if (point.toLowerCase().includes(topic.toLowerCase())) {
        relevant.push(point);
      }
    }
    
    return relevant.slice(0, 10); // Top 10
  }
  
  /**
   * Get completeness status - what the AI knows and doesn't know
   */
  getCompletenessStatus() {
    if (!this.loaded) {
      return {
        score: 0,
        status: 'No self-awareness loaded',
        satisfiedElements: [],
        missingElements: ['Self-examination not performed']
      };
    }
    
    return this.selfKnowledge.full.completeness;
  }
  
  /**
   * Get self-examination history
   */
  getEvolutionHistory() {
    if (!this.loaded) return [];
    
    return this.selfKnowledge.full.summaryHistory;
  }
  
  /**
   * Export self-knowledge summary for logging/debugging
   */
  exportSummary() {
    if (!this.loaded) {
      return { error: 'Self-awareness not loaded' };
    }
    
    const { full, quick, loadedAt } = this.selfKnowledge;
    
    return {
      loadedAt,
      identity: quick.oneSentenceSummary,
      componentsAnalyzed: full.metadata.itemsAnalyzed,
      keyInsights: full.keyPoints.length,
      selfUnderstanding: full.completeness.score,
      topCapabilities: quick.topPoints.slice(0, 5),
      innovations: quick.keyTerminology.map(t => t.term),
      mustRemember: quick.mustRemember,
      gaps: full.completeness.missingElements
    };
  }
  
  /**
   * Check if a specific capability exists
   */
  hasCapability(capabilityName) {
    if (!this.loaded) return false;
    
    const lowerName = capabilityName.toLowerCase();
    const { full, quick } = this.selfKnowledge;
    
    // Check in top points
    for (const point of quick.topPoints) {
      if (point.toLowerCase().includes(lowerName)) {
        return true;
      }
    }
    
    // Check in key points
    for (const point of full.keyPoints) {
      if (point.toLowerCase().includes(lowerName)) {
        return true;
      }
    }
    
    // Check in agents
    const agents = this.getAgentList();
    for (const agent of agents) {
      if (agent.name.toLowerCase().includes(lowerName)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Suggest relevant agents for a problem
   */
  suggestAgentsForProblem(problemDescription) {
    if (!this.loaded) return [];
    
    const agents = this.getAgentList();
    const capabilities = this.getAgentCapabilities();
    const suggestions = [];
    
    const lowerProblem = problemDescription.toLowerCase();
    
    for (const agent of agents) {
      const agentCaps = capabilities[agent.name];
      if (!agentCaps) continue;
      
      // Simple keyword matching
      let relevance = 0;
      
      // Check agent purpose
      if (agentCaps.purpose && agentCaps.purpose.toLowerCase().includes(lowerProblem)) {
        relevance += 3;
      }
      
      // Check innovations
      for (const innovation of agentCaps.innovations || []) {
        if (innovation.toLowerCase().includes(lowerProblem) || 
            lowerProblem.includes(innovation.toLowerCase())) {
          relevance += 1;
        }
      }
      
      if (relevance > 0) {
        suggestions.push({
          agent: agent.name,
          purpose: agentCaps.purpose,
          relevance,
          file: agent.file
        });
      }
    }
    
    // Sort by relevance
    return suggestions.sort((a, b) => b.relevance - a.relevance);
  }
}

/**
 * Global singleton instance
 */
let globalBootstrap = null;

/**
 * Initialize global self-awareness
 */
export async function initializeSelfAwareness(config = {}) {
  if (globalBootstrap && globalBootstrap.loaded) {
    console.log('✅ Self-awareness already loaded');
    return globalBootstrap;
  }
  
  globalBootstrap = new SelfAwarenessBootstrap(config);
  await globalBootstrap.initialize();
  
  return globalBootstrap;
}

/**
 * Get global self-awareness instance
 */
export function getSelfAwareness() {
  if (!globalBootstrap) {
    console.warn('⚠️  Self-awareness not initialized. Call initializeSelfAwareness() first.');
    return null;
  }
  
  return globalBootstrap;
}

/**
 * Get self-aware system prompt (convenience function)
 */
export function getSelfAwareSystemPrompt() {
  const bootstrap = getSelfAwareness();
  return bootstrap ? bootstrap.getSelfAwareSystemPrompt() : '';
}

export default SelfAwarenessBootstrap;
