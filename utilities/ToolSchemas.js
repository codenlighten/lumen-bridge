/**
 * Tool Schemas - Schemas for AI tool invocations
 * Defines structured schemas for shell commands and markdown note creation
 */

// MetaSchemaGenerator not actually needed - schemas are defined directly

/**
 * Shell command tool schema
 */
export const shellToolSchema = {
  type: "object",
  properties: {
    type: { 
      type: "string", 
      const: "shell",
      description: "Tool type - must be 'shell' for shell commands"
    },
    description: { 
      type: "string",
      description: "Human-readable description of what this command does and why"
    },
    command: { 
      type: "string",
      description: "The shell command to execute (must be from whitelist: ls, git status, npm test, etc.)"
    },
    cwd: { 
      type: "string",
      description: "Optional working directory (relative to workspace root)"
    },
    reasoning: {
      type: "string",
      description: "Why this command is needed to help the user"
    }
  },
  required: ["type", "description", "command"]
};

/**
 * Note writing tool schema
 */
export const noteToolSchema = {
  type: "object",
  properties: {
    type: { 
      type: "string", 
      const: "note",
      description: "Tool type - must be 'note' for markdown notes"
    },
    description: { 
      type: "string",
      description: "Human-readable description of what this note is for"
    },
    noteTitle: { 
      type: "string",
      description: "Title of the note (will appear in frontmatter and as H1)"
    },
    noteSlug: { 
      type: "string",
      description: "URL-friendly slug for the filename (auto-generated from title if not provided)"
    },
    noteContent: { 
      type: "string",
      description: "Full markdown content of the note (excluding frontmatter which is auto-added)"
    },
    category: {
      type: "string",
      enum: ["daily", "project", "idea", "meeting", "learning", "general"],
      description: "Category for organizing notes"
    },
    reasoning: {
      type: "string",
      description: "Why this note would be helpful for the user"
    }
  },
  required: ["type", "description", "noteTitle", "noteContent"]
};

/**
 * Combined tool schema (union of all tool types)
 */
export const toolSchema = {
  oneOf: [shellToolSchema, noteToolSchema]
};

/**
 * Enhanced chat schema with tools support
 */
export const chatWithToolsSchema = {
  type: "object",
  properties: {
    response: { 
      type: "string",
      description: "Your natural language response to the user"
    },
    includesCode: { 
      type: "boolean",
      description: "Whether your response includes code examples"
    },
    code: { 
      type: "string",
      description: "Code snippet if includesCode is true, otherwise empty string"
    },
    summaryNote: {
      type: "string",
      description: "Short note about what you learned about the user, their preferences, or projects (empty if nothing new)"
    },
    tools: {
      type: "array",
      description: "OPTIONAL tool invocations. ONLY include if tools would clearly help the user. Leave empty [] if not needed.",
      items: toolSchema
    }
  },
  required: ["response", "includesCode", "code", "summaryNote", "tools"]
};

/**
 * Generate enhanced system prompt for tool-using assistant
 */
export function generateToolSystemPrompt(personalizedContext) {
  return `You are a helpful AI assistant with an evolving understanding of this user.

USER PROFILE CONTEXT:
${JSON.stringify(personalizedContext, null, 2)}

Use this context to provide personalized, context-aware responses. Match their preferred conversation style: ${personalizedContext.conversationStyle?.formality || 'professional'} formality, ${personalizedContext.conversationStyle?.verbosity || 'balanced'} verbosity.

When responding:
- Reference their active projects when relevant
- Remember their technical preferences
- Align with their stated values
- Note any new information about preferences, projects, or goals in summaryNote

TOOL CAPABILITIES:
You may optionally request tools in the "tools" array. ONLY request tools when they clearly help the user.

Available tools:
1. "shell" - Run safe terminal commands
   - Whitelist: ls, pwd, git status, git log, npm test, npm run lint, cat, grep, etc.
   - Blocked: rm -rf, sudo, chmod 777, piping, command chaining
   - Use for: checking git status, running tests, listing files
   - Example: { type: "shell", description: "Check git status", command: "git status" }

2. "note" - Write markdown notes
   - Categories: daily, project, idea, meeting, learning, general
   - Auto-adds frontmatter with title, date, category
   - Use for: documenting decisions, saving ideas, meeting notes, daily summaries
   - Example: { type: "note", description: "Save project roadmap", noteTitle: "NeuroTrades Roadmap", noteContent: "## Goals\\n\\n- ...", category: "project" }

IMPORTANT:
- When in doubt, leave tools as an empty array []
- Don't use tools for simple questions or chat
- Use tools when user asks you to "run", "check", "save", "document", or "create" something
- Always include "reasoning" field explaining why the tool helps`;
}

/**
 * Validate a tool request
 */
export function validateToolRequest(tool) {
  const errors = [];

  if (!tool.type) {
    errors.push('Tool type is required');
    return { valid: false, errors };
  }

  if (tool.type === 'shell') {
    if (!tool.command) {
      errors.push('Shell tool requires command');
    }
  }

  if (tool.type === 'note') {
    if (!tool.noteTitle) {
      errors.push('Note tool requires noteTitle');
    }
    if (!tool.noteContent) {
      errors.push('Note tool requires noteContent');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export default {
  shellToolSchema,
  noteToolSchema,
  toolSchema,
  chatWithToolsSchema,
  generateToolSystemPrompt,
  validateToolRequest
};
