import { signedStructuredResponse } from '../structured-json.js';
import { createAgentKeys } from '../tools/signature.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * SummaryAgent - Incremental Knowledge Building & Living Documentation
 * 
 * Creates and evolves summaries that grow richer with each new piece of information.
 * Like a historian that continuously updates understanding as new facts emerge.
 * 
 * Key Innovation: INCREMENTAL ENRICHMENT
 * - Start with basic summary
 * - Each new input enriches the global context
 * - Summary evolves toward completeness
 * - Knows when objective is achieved (completeness checker)
 * 
 * Use Cases:
 * 1. Code Review Workflow - Each file enriches project understanding
 * 2. Biography Building - Interview answers build complete life story
 * 3. Project Analysis - Files accumulate into complete picture
 * 4. Knowledge Base - Articles grow richer with each contribution
 * 
 * Inspired by: Wikipedia article generation through iterative interviews
 */

export class SummaryAgent {
  constructor(name = 'SummaryAgent', objective = 'General Summary', options = {}) {
    this.name = name;
    this.objective = objective; // What we're trying to accomplish
    this.keys = createAgentKeys(name, { role: 'Summary & Analysis' });
    
    // Living documentation state
    this.globalContext = {
      objective,
      summaryHistory: [], // Track evolution of understanding
      keyPoints: [], // Main takeaways
      detailedAnalysis: {}, // Deep dives by topic
      metadata: {
        itemsAnalyzed: 0,
        totalTokens: 0,
        startTime: new Date().toISOString(),
        lastUpdate: new Date().toISOString()
      },
      completeness: {
        score: 0, // 0-100
        missingElements: [],
        satisfiedElements: []
      }
    };
    
    this.outputDir = options.outputDir || './summaries';
    this.saveHistory = options.saveHistory !== false; // Default: save
    this.autoSave = options.autoSave !== false; // Default: auto-save after each update
  }

  /**
   * Analyze a single item and enrich the global summary
   * @param {Object} item - The item to analyze (code file, interview answer, document, etc.)
   * @param {string} itemType - Type of item (file, answer, document, chapter)
   * @returns {Object} Updated summary with enrichment details
   */
  async analyzeAndEnrich(item, itemType = 'generic') {
    console.log(`\n📝 Analyzing ${itemType}: ${item.name || item.title || 'Item ' + (this.globalContext.metadata.itemsAnalyzed + 1)}`);
    
    // Generate analysis of this specific item
    const itemAnalysis = await this.analyzeItem(item, itemType);
    
    // Enrich global context with new insights
    const enrichment = await this.enrichGlobalContext(itemAnalysis, item, itemType);
    
    // Update completeness score
    await this.updateCompleteness();
    
    // Track in history
    this.globalContext.summaryHistory.push({
      timestamp: new Date().toISOString(),
      itemName: item.name || item.title || 'Unknown',
      itemType,
      keyInsights: enrichment.newInsights,
      completenessChange: enrichment.completenessChange
    });
    
    // Update metadata
    this.globalContext.metadata.itemsAnalyzed++;
    this.globalContext.metadata.lastUpdate = new Date().toISOString();
    
    // Auto-save if enabled
    if (this.autoSave) {
      await this.saveGlobalContext();
    }
    
    console.log(`   ✅ Analysis complete. Completeness: ${this.globalContext.completeness.score}%`);
    
    return {
      itemAnalysis,
      enrichment,
      globalContext: this.globalContext,
      isComplete: this.globalContext.completeness.score >= 90
    };
  }

  /**
   * Analyze a single item in detail
   */
  async analyzeItem(item, itemType) {
    const analysisSchema = this.getAnalysisSchemaForType(itemType);
    
    const prompt = this.buildAnalysisPrompt(item, itemType);
    
    const analysis = await signedStructuredResponse({
      query: prompt,
      schema: analysisSchema,
      temperature: 1.0,
      agentKey: this.keys
    });
    
    return analysis;
  }

  /**
   * Build analysis prompt based on item type
   */
  buildAnalysisPrompt(item, itemType) {
    const basePrompt = `Analyze the following ${itemType} in detail.\n\n`;
    
    switch (itemType) {
      case 'code':
        return `${basePrompt}CODE FILE: ${item.name || 'Unknown'}
        
\`\`\`${item.language || 'javascript'}
${item.content}
\`\`\`

Provide comprehensive code analysis including:
- Purpose and functionality
- Key functions/classes with inputs/outputs
- Dependencies and imports
- Design patterns used
- Potential improvements
- Edge cases and error handling
- Performance considerations
- Integration points`;

      case 'biography':
        return `${basePrompt}INTERVIEW ANSWER:

Question: ${item.question}
Answer: ${item.answer}

Previous Context: ${JSON.stringify(this.globalContext.detailedAnalysis.biography || {}, null, 2)}

Extract biographical information:
- Timeline events (dates, periods)
- Accomplishments and milestones
- Relationships and influences
- Character traits and values
- Pivotal moments
- Career progression
- Education and training`;

      case 'project':
        return `${basePrompt}PROJECT COMPONENT: ${item.name}

Description: ${item.description || 'No description provided'}
Type: ${item.componentType || 'Unknown'}

Current Project Understanding: ${this.globalContext.keyPoints.join('\n- ')}

Analyze this component's:
- Role in overall project
- Dependencies and relationships
- Technical approach
- Innovation or unique aspects
- Integration with other components`;

      case 'document':
        return `${basePrompt}DOCUMENT: ${item.title || item.name}

${item.content}

Extract:
- Main themes and arguments
- Key facts and data points
- Conclusions and recommendations
- Supporting evidence
- Gaps or questions raised`;

      default:
        return `${basePrompt}ITEM: ${JSON.stringify(item, null, 2)}

Provide comprehensive analysis of this item.`;
    }
  }

  /**
   * Get analysis schema based on item type
   */
  getAnalysisSchemaForType(itemType) {
    const baseSchema = {
      type: "object",
      properties: {
        summary: { type: "string", description: "High-level summary" },
        keyPoints: { 
          type: "array", 
          items: { type: "string" },
          description: "Main takeaways (3-7 points)"
        },
        missingContext: {
          type: "array",
          items: { type: "string" },
          description: "What information is missing for complete understanding"
        }
      },
      required: ["summary", "keyPoints", "missingContext"]
    };

    switch (itemType) {
      case 'code':
        return {
          ...baseSchema,
          properties: {
            ...baseSchema.properties,
            fileName: { type: "string" },
            purpose: { type: "string" },
            functions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  inputs: { type: "array", items: { type: "string" } },
                  outputs: { type: "string" },
                  complexity: { type: "string", enum: ["low", "medium", "high"] }
                }
              }
            },
            classes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  purpose: { type: "string" },
                  methods: { type: "array", items: { type: "string" } },
                  properties: { type: "array", items: { type: "string" } }
                }
              }
            },
            dependencies: { type: "array", items: { type: "string" } },
            designPatterns: { type: "array", items: { type: "string" } },
            improvements: { type: "array", items: { type: "string" } },
            complexity: { type: "string", enum: ["low", "medium", "high", "very-high"] },
            codeQuality: { type: "number", minimum: 0, maximum: 100 }
          }
        };

      case 'biography':
        return {
          ...baseSchema,
          properties: {
            ...baseSchema.properties,
            timelineEvents: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string" },
                  event: { type: "string" },
                  significance: { type: "string" }
                }
              }
            },
            accomplishments: { type: "array", items: { type: "string" } },
            relationships: { type: "array", items: { type: "string" } },
            characterTraits: { type: "array", items: { type: "string" } },
            influences: { type: "array", items: { type: "string" } }
          }
        };

      case 'project':
        return {
          ...baseSchema,
          properties: {
            ...baseSchema.properties,
            componentName: { type: "string" },
            role: { type: "string" },
            technicalApproach: { type: "string" },
            dependencies: { type: "array", items: { type: "string" } },
            innovations: { type: "array", items: { type: "string" } },
            integrationPoints: { type: "array", items: { type: "string" } }
          }
        };

      default:
        return baseSchema;
    }
  }

  /**
   * Enrich global context with new analysis
   */
  async enrichGlobalContext(itemAnalysis, item, itemType) {
    const enrichmentPrompt = `You are enriching a living document about: ${this.objective}

CURRENT GLOBAL CONTEXT:
${JSON.stringify(this.globalContext, null, 2)}

NEW ANALYSIS TO INTEGRATE:
${JSON.stringify(itemAnalysis, null, 2)}

ITEM INFO:
Type: ${itemType}
Name: ${item.name || item.title || 'Unknown'}

Task: Intelligently merge this new analysis into the global context.
- Add new key points (avoid duplicates)
- Enrich detailed analysis sections
- Identify connections to previous items
- Update understanding based on new information
- Flag contradictions or gaps

Return what should be ADDED or UPDATED in the global context.`;

    const enrichment = await signedStructuredResponse({
      query: enrichmentPrompt,
      schema: {
        type: "object",
        properties: {
          newKeyPoints: { 
            type: "array", 
            items: { type: "string" },
            description: "New insights to add to key points"
          },
          updatedSummary: { 
            type: "string",
            description: "Updated overall summary incorporating new information"
          },
          connections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                from: { type: "string" },
                to: { type: "string" },
                relationship: { type: "string" }
              }
            },
            description: "Connections between this item and previous analyses"
          },
          newInsights: {
            type: "array",
            items: { type: "string" },
            description: "Novel insights gained from this analysis"
          },
          contradictions: {
            type: "array",
            items: { type: "string" },
            description: "Any contradictions with previous understanding"
          },
          detailedAnalysisUpdates: {
            type: "object",
            description: "Updates to detailed analysis sections (by category)"
          }
        },
        required: ["newKeyPoints", "updatedSummary", "newInsights"]
      },
      temperature: 1.0,
      agentKey: this.keys
    });

    // Apply enrichment to global context
    this.applyEnrichment(enrichment, itemAnalysis, itemType);

    return enrichment;
  }

  /**
   * Apply enrichment to global context
   */
  applyEnrichment(enrichment, itemAnalysis, itemType) {
    // Add new key points (deduplicate)
    enrichment.newKeyPoints.forEach(point => {
      if (!this.globalContext.keyPoints.includes(point)) {
        this.globalContext.keyPoints.push(point);
      }
    });

    // Update detailed analysis by type
    if (!this.globalContext.detailedAnalysis[itemType]) {
      this.globalContext.detailedAnalysis[itemType] = [];
    }
    this.globalContext.detailedAnalysis[itemType].push(itemAnalysis);

    // Merge detailed updates
    if (enrichment.detailedAnalysisUpdates) {
      Object.keys(enrichment.detailedAnalysisUpdates).forEach(category => {
        if (!this.globalContext.detailedAnalysis[category]) {
          this.globalContext.detailedAnalysis[category] = {};
        }
        Object.assign(
          this.globalContext.detailedAnalysis[category],
          enrichment.detailedAnalysisUpdates[category]
        );
      });
    }
  }

  /**
   * Update completeness score based on objective
   */
  async updateCompleteness() {
    const completenessCheck = await signedStructuredResponse({
      query: `Evaluate the completeness of this analysis/summary.

OBJECTIVE: ${this.objective}

CURRENT CONTEXT:
${JSON.stringify(this.globalContext, null, 2)}

ITEMS ANALYZED: ${this.globalContext.metadata.itemsAnalyzed}

Rate completeness (0-100) based on:
- Coverage of objective requirements
- Depth of analysis
- Gaps in information
- Contradictions or uncertainties
- Breadth of understanding

What's still missing to fully achieve the objective?`,
      schema: {
        type: "object",
        properties: {
          completenessScore: { 
            type: "number", 
            minimum: 0, 
            maximum: 100,
            description: "Overall completeness percentage"
          },
          satisfiedElements: {
            type: "array",
            items: { type: "string" },
            description: "Aspects of objective that are well-covered"
          },
          missingElements: {
            type: "array",
            items: { type: "string" },
            description: "What's still needed to complete the objective"
          },
          nextSteps: {
            type: "array",
            items: { type: "string" },
            description: "Recommended next items to analyze"
          },
          confidence: {
            type: "string",
            enum: ["low", "medium", "high", "very-high"],
            description: "Confidence in current understanding"
          }
        },
        required: ["completenessScore", "satisfiedElements", "missingElements", "nextSteps", "confidence"]
      },
      temperature: 1.0,
      agentKey: this.keys
    });

    this.globalContext.completeness = {
      score: completenessCheck.completenessScore,
      satisfiedElements: completenessCheck.satisfiedElements,
      missingElements: completenessCheck.missingElements,
      nextSteps: completenessCheck.nextSteps,
      confidence: completenessCheck.confidence,
      lastChecked: new Date().toISOString()
    };

    return this.globalContext.completeness;
  }

  /**
   * Generate comprehensive summary document
   * @param {string} format - Output format (markdown, json, html)
   */
  async generateSummaryDocument(format = 'markdown') {
    console.log(`\n📄 Generating ${format} summary document...`);

    const documentPrompt = `Create a comprehensive summary document based on this context.

OBJECTIVE: ${this.objective}

GLOBAL CONTEXT:
${JSON.stringify(this.globalContext, null, 2)}

Create a ${format} document that:
- Provides clear, well-organized overview
- Includes all key points
- Presents detailed analysis by category
- Shows completeness status
- Highlights insights and connections
- Notes any gaps or questions

Make it publication-ready and professional.`;

    const document = await signedStructuredResponse({
      query: documentPrompt,
      schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          content: { type: "string", description: `Full ${format} content` },
          sections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                heading: { type: "string" },
                content: { type: "string" },
                subsections: { type: "array", items: { type: "string" } }
              }
            }
          },
          keyHighlights: { type: "array", items: { type: "string" } },
          summary: { type: "string", description: "Executive summary" }
        },
        required: ["title", "content", "sections", "summary"]
      },
      temperature: 1.0,
      agentKey: this.keys
    });

    return document;
  }

  /**
   * Generate cliff notes (condensed key points)
   */
  async generateCliffNotes() {
    console.log(`\n📋 Generating cliff notes...`);

    const cliffNotes = await signedStructuredResponse({
      query: `Create concise "cliff notes" for: ${this.objective}

CONTEXT:
${JSON.stringify(this.globalContext, null, 2)}

Provide:
- Top 5-10 most important points
- One-sentence summary
- Key takeaways for quick reference
- Important terminology
- Critical concepts

Make it scannable and memorable.`,
      schema: {
        type: "object",
        properties: {
          oneSentenceSummary: { type: "string" },
          topPoints: { 
            type: "array", 
            items: { type: "string" },
            description: "5-10 most important points"
          },
          keyTerminology: {
            type: "array",
            items: {
              type: "object",
              properties: {
                term: { type: "string" },
                definition: { type: "string" }
              }
            }
          },
          criticalConcepts: { type: "array", items: { type: "string" } },
          mustRemember: { 
            type: "array", 
            items: { type: "string" },
            description: "Absolute must-remember items"
          }
        },
        required: ["oneSentenceSummary", "topPoints", "mustRemember"]
      },
      temperature: 1.0,
      agentKey: this.keys
    });

    return cliffNotes;
  }

  /**
   * Save global context to file
   */
  async saveGlobalContext(filename = null) {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      
      const timestamp = new Date().toISOString().split('T')[0];
      const safeName = this.name.replace(/[^a-z0-9]/gi, '_');
      const filepath = filename || path.join(
        this.outputDir, 
        `${safeName}_${timestamp}.json`
      );

      await fs.writeFile(
        filepath,
        JSON.stringify(this.globalContext, null, 2)
      );

      console.log(`   💾 Global context saved: ${filepath}`);
      return filepath;
    } catch (error) {
      console.error(`   ❌ Failed to save context: ${error.message}`);
      return null;
    }
  }

  /**
   * Load previous global context
   */
  async loadGlobalContext(filepath) {
    try {
      const content = await fs.readFile(filepath, 'utf-8');
      this.globalContext = JSON.parse(content);
      console.log(`   📂 Global context loaded from: ${filepath}`);
      console.log(`   Items analyzed: ${this.globalContext.metadata.itemsAnalyzed}`);
      console.log(`   Completeness: ${this.globalContext.completeness.score}%`);
      return this.globalContext;
    } catch (error) {
      console.error(`   ❌ Failed to load context: ${error.message}`);
      return null;
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      name: this.name,
      objective: this.objective,
      itemsAnalyzed: this.globalContext.metadata.itemsAnalyzed,
      keyPoints: this.globalContext.keyPoints.length,
      completeness: this.globalContext.completeness.score,
      missingElements: this.globalContext.completeness.missingElements,
      nextSteps: this.globalContext.completeness.nextSteps,
      lastUpdate: this.globalContext.metadata.lastUpdate
    };
  }

  /**
   * Reset to start fresh analysis
   */
  reset() {
    this.globalContext = {
      objective: this.objective,
      summaryHistory: [],
      keyPoints: [],
      detailedAnalysis: {},
      metadata: {
        itemsAnalyzed: 0,
        totalTokens: 0,
        startTime: new Date().toISOString(),
        lastUpdate: new Date().toISOString()
      },
      completeness: {
        score: 0,
        missingElements: [],
        satisfiedElements: []
      }
    };
    console.log('   🔄 Agent reset - starting fresh analysis');
  }

  /**
   * Black-box interface methods (Alan Kay style)
   */
  
  async send(message) {
    if (!message || !message.payload) {
      throw new Error('Invalid message format');
    }

    const { action, item, itemType } = message.payload;

    switch (action) {
      case 'analyze':
        return await this.analyzeAndEnrich(item, itemType || 'generic');
      
      case 'generateDocument':
        return await this.generateSummaryDocument(item.format || 'markdown');
      
      case 'generateCliffNotes':
        return await this.generateCliffNotes();
      
      case 'getStatus':
        return this.getStatus();
      
      case 'checkCompleteness':
        return await this.updateCompleteness();
      
      case 'save':
        return await this.saveGlobalContext(item.filename);
      
      case 'load':
        return await this.loadGlobalContext(item.filepath);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  getCapabilities() {
    return [
      'Incremental knowledge building',
      'Living documentation creation',
      'Code analysis with inputs/outputs',
      'Biography construction from interviews',
      'Project understanding accumulation',
      'Cliff notes generation',
      'Completeness evaluation',
      'Summary document generation',
      'Context enrichment with each item',
      'Gap identification',
      'Connection discovery'
    ];
  }

  getSchema() {
    return {
      input: {
        type: "object",
        properties: {
          action: { 
            type: "string",
            enum: ["analyze", "generateDocument", "generateCliffNotes", "getStatus", "checkCompleteness", "save", "load"]
          },
          item: { type: "object" },
          itemType: { type: "string" }
        },
        required: ["action"]
      },
      output: {
        type: "object",
        description: "Varies by action - see documentation"
      }
    };
  }

  getIdentity() {
    return this.keys.publicKey;
  }
}

export default SummaryAgent;
