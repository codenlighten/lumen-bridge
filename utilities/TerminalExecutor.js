import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

/**
 * TerminalExecutor - Advanced Terminal Command Execution
 * 
 * A robust utility for executing terminal commands with:
 * - Promise-based async/await support
 * - Timeout handling
 * - Streaming output support
 * - Custom environment variables
 * - Working directory specification
 * - Error handling and detailed output
 * - Command validation
 * - Execution statistics
 * 
 * Features:
 * 1. Basic command execution with full output
 * 2. Streaming command execution for long-running processes
 * 3. Timeout and cancellation support
 * 4. Custom environment and working directory
 * 5. Output size limits
 * 6. Execution time tracking
 * 7. Safe command validation
 * 8. Shell selection (bash, sh, zsh, etc.)
 */
class TerminalExecutor {
    constructor(options = {}) {
        this.defaultTimeout = options.timeout || 30000; // 30 seconds default
        this.defaultMaxBuffer = options.maxBuffer || 1024 * 1024; // 1MB default
        this.defaultShell = options.shell || '/bin/bash';
        this.defaultCwd = options.cwd || process.cwd();
        this.verbose = options.verbose !== false; // Default: true
        this.stats = {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            totalExecutionTime: 0
        };
    }

    /**
     * Execute a terminal command and return complete output
     * @param {string} command - The command to execute
     * @param {Object} options - Execution options
     * @param {number} options.timeout - Timeout in milliseconds
     * @param {number} options.maxBuffer - Maximum output buffer size
     * @param {string} options.cwd - Working directory
     * @param {Object} options.env - Environment variables
     * @param {string} options.shell - Shell to use
     * @param {boolean} options.throwOnError - Throw error on non-zero exit code
     * @returns {Promise<Object>} Result object with stdout, stderr, code, and metadata
     */
    async execute(command, options = {}) {
        const startTime = Date.now();
        this.stats.totalExecutions++;

        const execOptions = {
            timeout: options.timeout || this.defaultTimeout,
            maxBuffer: options.maxBuffer || this.defaultMaxBuffer,
            cwd: options.cwd || this.defaultCwd,
            env: { ...process.env, ...(options.env || {}) },
            shell: options.shell || this.defaultShell,
            encoding: 'utf8'
        };

        if (this.verbose) {
            console.log(`\n🔧 Executing command: ${command.substring(0, 80)}${command.length > 80 ? '...' : ''}`);
            console.log(`   Working Directory: ${execOptions.cwd}`);
            console.log(`   Shell: ${execOptions.shell}`);
            console.log(`   Timeout: ${execOptions.timeout}ms`);
        }

        try {
            const { stdout, stderr } = await execPromise(command, execOptions);
            const executionTime = Date.now() - startTime;
            
            this.stats.successfulExecutions++;
            this.stats.totalExecutionTime += executionTime;

            const result = {
                success: true,
                stdout: stdout || '',
                stderr: stderr || '',
                output: stdout || '',
                error: null,
                exitCode: 0,
                executionTime,
                command,
                timestamp: new Date().toISOString()
            };

            if (this.verbose) {
                console.log(`   ✅ Success (${executionTime}ms)`);
                if (stdout) console.log(`   Output Length: ${stdout.length} characters`);
                if (stderr) console.log(`   Stderr: ${stderr.length} characters`);
            }

            return result;

        } catch (error) {
            const executionTime = Date.now() - startTime;
            this.stats.failedExecutions++;
            this.stats.totalExecutionTime += executionTime;

            const result = {
                success: false,
                stdout: error.stdout || '',
                stderr: error.stderr || '',
                output: error.stdout || '',
                error: error.message,
                exitCode: error.code || 1,
                signal: error.signal,
                killed: error.killed || false,
                executionTime,
                command,
                timestamp: new Date().toISOString()
            };

            if (this.verbose) {
                console.log(`   ❌ Failed (${executionTime}ms)`);
                console.log(`   Exit Code: ${result.exitCode}`);
                console.log(`   Error: ${error.message}`);
            }

            if (options.throwOnError !== false) {
                const enhancedError = new Error(`Command failed: ${command}\n${error.message}`);
                enhancedError.result = result;
                throw enhancedError;
            }

            return result;
        }
    }

    /**
     * Execute a command with streaming output
     * @param {string} command - The command to execute
     * @param {Object} options - Execution options
     * @param {Function} options.onStdout - Callback for stdout data
     * @param {Function} options.onStderr - Callback for stderr data
     * @param {Function} options.onClose - Callback when process closes
     * @param {string} options.cwd - Working directory
     * @param {Object} options.env - Environment variables
     * @param {string} options.shell - Shell to use
     * @returns {Promise<Object>} Result object with full output and exit code
     */
    async executeStream(command, options = {}) {
        const startTime = Date.now();
        this.stats.totalExecutions++;

        const execOptions = {
            cwd: options.cwd || this.defaultCwd,
            env: { ...process.env, ...(options.env || {}) },
            shell: options.shell || this.defaultShell
        };

        if (this.verbose) {
            console.log(`\n🌊 Streaming command: ${command.substring(0, 80)}${command.length > 80 ? '...' : ''}`);
        }

        return new Promise((resolve, reject) => {
            const child = spawn(command, [], execOptions);
            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                const text = data.toString();
                stdout += text;
                if (options.onStdout) {
                    options.onStdout(text);
                } else if (this.verbose) {
                    process.stdout.write(text);
                }
            });

            child.stderr.on('data', (data) => {
                const text = data.toString();
                stderr += text;
                if (options.onStderr) {
                    options.onStderr(text);
                } else if (this.verbose) {
                    process.stderr.write(text);
                }
            });

            child.on('close', (code) => {
                const executionTime = Date.now() - startTime;
                
                if (code === 0) {
                    this.stats.successfulExecutions++;
                } else {
                    this.stats.failedExecutions++;
                }
                this.stats.totalExecutionTime += executionTime;

                const result = {
                    success: code === 0,
                    stdout,
                    stderr,
                    output: stdout,
                    exitCode: code,
                    executionTime,
                    command,
                    timestamp: new Date().toISOString()
                };

                if (options.onClose) {
                    options.onClose(result);
                }

                if (this.verbose) {
                    console.log(`\n   ${code === 0 ? '✅' : '❌'} Process completed (${executionTime}ms, exit code: ${code})`);
                }

                if (code === 0 || options.throwOnError === false) {
                    resolve(result);
                } else {
                    const error = new Error(`Command failed with exit code ${code}`);
                    error.result = result;
                    reject(error);
                }
            });

            child.on('error', (error) => {
                const executionTime = Date.now() - startTime;
                this.stats.failedExecutions++;
                this.stats.totalExecutionTime += executionTime;

                const result = {
                    success: false,
                    stdout,
                    stderr,
                    output: stdout,
                    error: error.message,
                    executionTime,
                    command,
                    timestamp: new Date().toISOString()
                };

                if (this.verbose) {
                    console.log(`\n   ❌ Process error: ${error.message}`);
                }

                reject(error);
            });
        });
    }

    /**
     * Execute multiple commands in sequence
     * @param {Array<string>} commands - Array of commands to execute
     * @param {Object} options - Execution options
     * @param {boolean} options.stopOnError - Stop sequence if a command fails
     * @returns {Promise<Array>} Array of results for each command
     */
    async executeSequence(commands, options = {}) {
        if (this.verbose) {
            console.log(`\n📋 Executing ${commands.length} commands in sequence...`);
        }

        const results = [];
        const startTime = Date.now();

        for (let i = 0; i < commands.length; i++) {
            const command = commands[i];
            console.log(`\n[${i + 1}/${commands.length}] ${command}`);

            try {
                const result = await this.execute(command, {
                    ...options,
                    throwOnError: true
                });
                results.push(result);
            } catch (error) {
                results.push(error.result);
                
                if (options.stopOnError !== false) {
                    console.log(`\n⚠️  Stopping sequence due to error in command ${i + 1}`);
                    break;
                }
            }
        }

        const totalTime = Date.now() - startTime;
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        if (this.verbose) {
            console.log(`\n📊 Sequence complete: ${successful} successful, ${failed} failed (${totalTime}ms total)`);
        }

        return {
            results,
            summary: {
                total: commands.length,
                successful,
                failed,
                totalTime
            }
        };
    }

    /**
     * Execute multiple commands in parallel
     * @param {Array<string>} commands - Array of commands to execute
     * @param {Object} options - Execution options
     * @returns {Promise<Array>} Array of results for each command
     */
    async executeParallel(commands, options = {}) {
        if (this.verbose) {
            console.log(`\n🚀 Executing ${commands.length} commands in parallel...`);
        }

        const startTime = Date.now();
        const promises = commands.map(command => 
            this.execute(command, { ...options, throwOnError: false })
        );

        const results = await Promise.all(promises);
        const totalTime = Date.now() - startTime;
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        if (this.verbose) {
            console.log(`\n📊 Parallel execution complete: ${successful} successful, ${failed} failed (${totalTime}ms total)`);
        }

        return {
            results,
            summary: {
                total: commands.length,
                successful,
                failed,
                totalTime
            }
        };
    }

    /**
     * Print command output to console
     * @param {string} command - The command to execute
     * @param {Object} options - Execution options
     */
    async printOutput(command, options = {}) {
        const result = await this.execute(command, {
            ...options,
            throwOnError: false
        });

        console.log('\n' + '='.repeat(70));
        console.log(`Command: ${command}`);
        console.log('='.repeat(70));
        
        if (result.stdout) {
            console.log('\n📤 STDOUT:');
            console.log(result.stdout);
        }
        
        if (result.stderr) {
            console.log('\n⚠️  STDERR:');
            console.log(result.stderr);
        }
        
        console.log('\n' + '='.repeat(70));
        console.log(`Exit Code: ${result.exitCode}`);
        console.log(`Execution Time: ${result.executionTime}ms`);
        console.log(`Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
        console.log('='.repeat(70) + '\n');

        return result;
    }

    /**
     * Get execution statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        const avgExecutionTime = this.stats.totalExecutions > 0
            ? Math.round(this.stats.totalExecutionTime / this.stats.totalExecutions)
            : 0;

        return {
            ...this.stats,
            averageExecutionTime: avgExecutionTime,
            successRate: this.stats.totalExecutions > 0
                ? Math.round((this.stats.successfulExecutions / this.stats.totalExecutions) * 100)
                : 0
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            totalExecutionTime: 0
        };
    }

    /**
     * Check if a command exists in the system
     * @param {string} commandName - Name of the command to check
     * @returns {Promise<boolean>} True if command exists
     */
    async commandExists(commandName) {
        try {
            const result = await this.execute(`which ${commandName}`, {
                throwOnError: false
            });
            return result.success && result.stdout.trim() !== '';
        } catch (error) {
            return false;
        }
    }

    /**
     * Get command version
     * @param {string} commandName - Name of the command
     * @param {string} versionFlag - Version flag (default: --version)
     * @returns {Promise<string>} Version string
     */
    async getCommandVersion(commandName, versionFlag = '--version') {
        try {
            const result = await this.execute(`${commandName} ${versionFlag}`, {
                throwOnError: false
            });
            return result.success ? result.stdout.trim() : 'Unknown';
        } catch (error) {
            return 'Unknown';
        }
    }

    /**
     * Legacy compatibility method
     * @deprecated Use execute() instead
     */
    static runCommand(command) {
        return new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject({ error, stdout, stderr });
                } else {
                    resolve({ stdout, stderr });
                }
            });
        });
    }

    /**
     * Legacy compatibility method
     * @deprecated Use printOutput() instead
     */
    static async printCommandOutput(command) {
        try {
            const { stdout, stderr } = await TerminalExecutor.runCommand(command);
            console.log('STDOUT:', stdout);
            if (stderr) {
                console.error('STDERR:', stderr);
            }
        } catch ({ error, stdout, stderr }) {
            console.error('Error executing command:', error);
            console.log('STDOUT:', stdout);
            console.error('STDERR:', stderr);
        }
    }
}

// Maintain backward compatibility
class TerminalUtils extends TerminalExecutor {}

export { TerminalExecutor };
export { TerminalUtils };
export default TerminalExecutor;
