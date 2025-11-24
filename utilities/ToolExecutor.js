/**
 * ToolExecutor - Execute tools requested by the AI assistant
 * Supports shell commands and markdown note writing with safety controls
 */

import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

// Safety configuration
const TOOL_CONFIG = {
  shell: {
    timeout: 15000, // 15 seconds max
    maxBuffer: 1024 * 1024, // 1MB output max
    // Whitelist of safe commands (can be expanded)
    safeCommands: [
      'ls', 'pwd', 'git status', 'git log', 'git diff',
      'npm test', 'npm run lint', 'npm run build',
      'node --version', 'npm --version',
      'cat', 'head', 'tail', 'grep', 'wc'
    ]
  },
  notes: {
    baseDir: './relationships', // Base directory for notes
    allowedExtensions: ['.md', '.txt']
  }
};

/**
 * Check if a command is safe to execute
 */
function isCommandSafe(command) {
  // Check for dangerous patterns
  const dangerousPatterns = [
    /rm\s+-rf/i,
    /sudo/i,
    /chmod\s+777/i,
    />/,  // Redirection
    /\|/,  // Piping (can be dangerous)
    /;/,   // Command chaining
    /&&/,  // Command chaining
    /\|\|/, // Command chaining
    /`/,   // Command substitution
    /\$\(/  // Command substitution
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(command)) {
      return {
        safe: false,
        reason: `Command contains dangerous pattern: ${pattern}`
      };
    }
  }

  // Check if command starts with a whitelisted command
  const commandWord = command.trim().split(/\s+/)[0];
  const isWhitelisted = TOOL_CONFIG.shell.safeCommands.some(safe => 
    commandWord === safe || command.startsWith(safe + ' ')
  );

  if (!isWhitelisted) {
    return {
      safe: false,
      reason: `Command '${commandWord}' is not in whitelist`
    };
  }

  return { safe: true };
}

/**
 * Run a shell command with safety restrictions
 */
function runShellCommand(command, cwd = process.cwd(), options = {}) {
  return new Promise((resolve) => {
    // Safety check
    const safetyCheck = isCommandSafe(command);
    if (!safetyCheck.safe) {
      return resolve({
        success: false,
        blocked: true,
        error: `Command blocked: ${safetyCheck.reason}`,
        command,
        stdout: '',
        stderr: ''
      });
    }

    // Validate cwd exists and is safe
    const safeCwd = path.resolve(cwd);
    const workspaceRoot = process.cwd();
    
    // Don't allow navigating outside workspace
    if (!safeCwd.startsWith(workspaceRoot)) {
      return resolve({
        success: false,
        blocked: true,
        error: 'Working directory must be within workspace',
        command,
        stdout: '',
        stderr: ''
      });
    }

    console.log(`🔧 Running shell command: ${command}`);
    console.log(`   Working directory: ${safeCwd}`);

    exec(
      command,
      {
        cwd: safeCwd,
        timeout: options.timeout || TOOL_CONFIG.shell.timeout,
        maxBuffer: options.maxBuffer || TOOL_CONFIG.shell.maxBuffer,
        env: { ...process.env, PATH: process.env.PATH }
      },
      (error, stdout, stderr) => {
        if (error) {
          console.log(`   ❌ Command failed: ${error.message}`);
          return resolve({
            success: false,
            blocked: false,
            error: error.message,
            command,
            stdout: stdout || '',
            stderr: stderr || '',
            exitCode: error.code
          });
        }
        
        console.log(`   ✅ Command completed successfully`);
        resolve({
          success: true,
          blocked: false,
          command,
          stdout: stdout || '',
          stderr: stderr || '',
          exitCode: 0
        });
      }
    );
  });
}

/**
 * Write a markdown note to user's notes directory
 */
async function writeMarkdownNote(userId, noteTitle, noteSlug, content, category = 'general') {
  try {
    // Sanitize inputs
    const safeUserId = String(userId).replace(/[^a-z0-9_-]/gi, '_');
    const safeCategory = category.toLowerCase().replace(/[^a-z0-9_-]/gi, '-');
    
    const safeSlug = (noteSlug || noteTitle || 'note')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Create directory structure: ./relationships/<userId>/notes/<category>/
    const dir = path.join(
      TOOL_CONFIG.notes.baseDir,
      safeUserId,
      'notes',
      safeCategory
    );
    
    await fs.mkdir(dir, { recursive: true });

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `${safeSlug}-${timestamp}.md`;
    const filepath = path.join(dir, filename);

    // Create markdown with frontmatter
    const frontmatter = `---
title: ${noteTitle || 'Note'}
created: ${new Date().toISOString()}
category: ${category}
userId: ${userId}
---

`;

    const fullContent = frontmatter + content;
    
    await fs.writeFile(filepath, fullContent, 'utf8');

    console.log(`📝 Note created: ${filepath}`);

    return {
      success: true,
      filepath,
      filename,
      category,
      relativePath: path.relative(process.cwd(), filepath)
    };
  } catch (error) {
    console.error(`❌ Failed to write note: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * List notes for a user
 */
async function listUserNotes(userId, category = null) {
  try {
    const safeUserId = String(userId).replace(/[^a-z0-9_-]/gi, '_');
    const baseDir = path.join(TOOL_CONFIG.notes.baseDir, safeUserId, 'notes');

    const notes = [];
    
    if (category) {
      const categoryDir = path.join(baseDir, category);
      try {
        const files = await fs.readdir(categoryDir);
        for (const file of files) {
          if (file.endsWith('.md')) {
            notes.push({
              filename: file,
              category,
              path: path.join(categoryDir, file)
            });
          }
        }
      } catch (err) {
        // Category doesn't exist
        return { success: true, notes: [] };
      }
    } else {
      // List all categories
      try {
        const categories = await fs.readdir(baseDir);
        for (const cat of categories) {
          const catPath = path.join(baseDir, cat);
          const stat = await fs.stat(catPath);
          if (stat.isDirectory()) {
            const files = await fs.readdir(catPath);
            for (const file of files) {
              if (file.endsWith('.md')) {
                notes.push({
                  filename: file,
                  category: cat,
                  path: path.join(catPath, file)
                });
              }
            }
          }
        }
      } catch (err) {
        // No notes directory exists yet
        return { success: true, notes: [] };
      }
    }

    return {
      success: true,
      notes,
      count: notes.length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Read a specific note
 */
async function readNote(userId, filename, category = 'general') {
  try {
    const safeUserId = String(userId).replace(/[^a-z0-9_-]/gi, '_');
    const safeCategory = category.toLowerCase().replace(/[^a-z0-9_-]/gi, '-');
    
    const filepath = path.join(
      TOOL_CONFIG.notes.baseDir,
      safeUserId,
      'notes',
      safeCategory,
      filename
    );

    const content = await fs.readFile(filepath, 'utf8');

    return {
      success: true,
      content,
      filepath,
      relativePath: path.relative(process.cwd(), filepath)
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get configuration for tool executor
 */
function getConfig() {
  return {
    shell: {
      timeout: TOOL_CONFIG.shell.timeout,
      maxBuffer: TOOL_CONFIG.shell.maxBuffer,
      safeCommands: TOOL_CONFIG.shell.safeCommands
    },
    notes: {
      baseDir: TOOL_CONFIG.notes.baseDir,
      allowedExtensions: TOOL_CONFIG.notes.allowedExtensions
    }
  };
}

/**
 * Update configuration
 */
function updateConfig(updates) {
  if (updates.shell) {
    Object.assign(TOOL_CONFIG.shell, updates.shell);
  }
  if (updates.notes) {
    Object.assign(TOOL_CONFIG.notes, updates.notes);
  }
}

export const ToolExecutor = {
  runShellCommand,
  writeMarkdownNote,
  listUserNotes,
  readNote,
  isCommandSafe,
  getConfig,
  updateConfig
};

export default ToolExecutor;
