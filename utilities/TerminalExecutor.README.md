# TerminalExecutor.js

A robust, feature-rich utility for executing terminal commands in Node.js with advanced features like timeout handling, streaming output, parallel execution, and detailed statistics tracking.

## Features

- ✅ **Promise-based async/await support** - Modern JavaScript async patterns
- ⏱️ **Timeout handling** - Prevent hanging commands
- 🌊 **Streaming output support** - Real-time output for long-running processes
- 🌍 **Custom environment variables** - Inject environment-specific configurations
- 📁 **Working directory specification** - Execute commands in any directory
- 🛡️ **Error handling** - Comprehensive error reporting with detailed output
- 🔍 **Command validation** - Check if commands exist before execution
- 📊 **Execution statistics** - Track performance and success rates
- 🚀 **Parallel execution** - Run multiple commands simultaneously
- 📋 **Sequential execution** - Execute command sequences with error handling
- 🔧 **Shell selection** - Use any shell (bash, sh, zsh, fish, etc.)

## Installation

The TerminalExecutor is already part of the utilities folder. Simply import it:

```javascript
import TerminalExecutor from './utilities/TerminalExecutor.js';
```

Or use named imports:

```javascript
import { TerminalExecutor, TerminalUtils } from './utilities/TerminalExecutor.js';
```

## Basic Usage

### Creating an Executor Instance

```javascript
const executor = new TerminalExecutor({
    timeout: 30000,      // 30 seconds
    maxBuffer: 1024 * 1024,  // 1MB
    shell: '/bin/bash',
    cwd: process.cwd(),
    verbose: true
});
```

### Execute a Simple Command

```javascript
const result = await executor.execute('ls -la');

console.log(result.output);  // Command output
console.log(result.exitCode);  // Exit code (0 for success)
console.log(result.executionTime);  // Time in milliseconds
```

### Execute with Custom Options

```javascript
const result = await executor.execute('npm install', {
    cwd: '/path/to/project',
    timeout: 60000,
    env: {
        NODE_ENV: 'production'
    },
    throwOnError: false  // Don't throw on non-zero exit
});
```

## Advanced Features

### 1. Execute Command Sequence

Execute multiple commands in order, optionally stopping on first error:

```javascript
const commands = [
    'mkdir my-project',
    'cd my-project',
    'npm init -y',
    'npm install express'
];

const { results, summary } = await executor.executeSequence(commands, {
    stopOnError: true
});

console.log(`Successful: ${summary.successful}/${summary.total}`);
```

### 2. Execute Commands in Parallel

Run multiple independent commands simultaneously:

```javascript
const commands = [
    'npm test',
    'npm run lint',
    'npm run build'
];

const { results, summary } = await executor.executeParallel(commands);

console.log(`Total time: ${summary.totalTime}ms`);
```

### 3. Streaming Output

For long-running commands, stream output in real-time:

```javascript
await executor.executeStream('npm install', {
    onStdout: (data) => {
        process.stdout.write(data);
    },
    onStderr: (data) => {
        process.stderr.write(data);
    },
    onClose: (result) => {
        console.log(`Finished with exit code: ${result.exitCode}`);
    }
});
```

### 4. Check Command Existence

Verify a command is available before executing:

```javascript
const hasGit = await executor.commandExists('git');
const hasDocker = await executor.commandExists('docker');

if (hasGit) {
    const version = await executor.getCommandVersion('git', '--version');
    console.log(`Git version: ${version}`);
}
```

### 5. Print Formatted Output

Execute and automatically format the output:

```javascript
await executor.printOutput('df -h');
// Displays:
// ======================================================================
// Command: df -h
// ======================================================================
// 
// 📤 STDOUT:
// [command output here]
// 
// ======================================================================
// Exit Code: 0
// Execution Time: 5ms
// Status: ✅ Success
// ======================================================================
```

### 6. Get Execution Statistics

Track performance across all executions:

```javascript
const stats = executor.getStats();

console.log(`Total executions: ${stats.totalExecutions}`);
console.log(`Success rate: ${stats.successRate}%`);
console.log(`Average time: ${stats.averageExecutionTime}ms`);
```

## API Reference

### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `timeout` | number | 30000 | Maximum execution time in milliseconds |
| `maxBuffer` | number | 1048576 | Maximum stdout/stderr buffer size in bytes |
| `shell` | string | '/bin/bash' | Shell to use for command execution |
| `cwd` | string | process.cwd() | Default working directory |
| `verbose` | boolean | true | Enable verbose logging |

### execute(command, options)

Execute a command and return the complete result.

**Parameters:**
- `command` (string): The command to execute
- `options` (object): Execution options
  - `timeout` (number): Override default timeout
  - `maxBuffer` (number): Override default buffer size
  - `cwd` (string): Working directory for this command
  - `env` (object): Additional environment variables
  - `shell` (string): Shell to use
  - `throwOnError` (boolean): Throw error on non-zero exit (default: true)

**Returns:** Promise<Object>
```javascript
{
    success: boolean,
    stdout: string,
    stderr: string,
    output: string,
    error: string | null,
    exitCode: number,
    executionTime: number,
    command: string,
    timestamp: string
}
```

### executeStream(command, options)

Execute a command with streaming output.

**Parameters:**
- `command` (string): The command to execute
- `options` (object): Execution options
  - `onStdout` (function): Callback for stdout data chunks
  - `onStderr` (function): Callback for stderr data chunks
  - `onClose` (function): Callback when process closes
  - `cwd` (string): Working directory
  - `env` (object): Environment variables
  - `shell` (string): Shell to use

### executeSequence(commands, options)

Execute multiple commands in sequence.

**Parameters:**
- `commands` (Array<string>): Array of commands to execute
- `options` (object): Execution options
  - `stopOnError` (boolean): Stop on first error (default: true)
  - ...all execute() options

**Returns:** Promise<Object>
```javascript
{
    results: Array<Result>,
    summary: {
        total: number,
        successful: number,
        failed: number,
        totalTime: number
    }
}
```

### executeParallel(commands, options)

Execute multiple commands in parallel.

**Parameters:**
- `commands` (Array<string>): Array of commands to execute
- `options` (object): Execution options (same as execute())

**Returns:** Promise<Object> (same structure as executeSequence)

### commandExists(commandName)

Check if a command exists in the system PATH.

**Parameters:**
- `commandName` (string): Name of the command to check

**Returns:** Promise<boolean>

### getCommandVersion(commandName, versionFlag)

Get the version of a command.

**Parameters:**
- `commandName` (string): Name of the command
- `versionFlag` (string): Version flag (default: '--version')

**Returns:** Promise<string>

### getStats()

Get execution statistics.

**Returns:** Object
```javascript
{
    totalExecutions: number,
    successfulExecutions: number,
    failedExecutions: number,
    totalExecutionTime: number,
    averageExecutionTime: number,
    successRate: number
}
```

### resetStats()

Reset execution statistics to zero.

## Error Handling

### Try-Catch Pattern

```javascript
try {
    const result = await executor.execute('risky-command');
    console.log('Success:', result.output);
} catch (error) {
    console.error('Error:', error.message);
    console.log('Result:', error.result);  // Contains execution details
}
```

### Non-Throwing Pattern

```javascript
const result = await executor.execute('command', {
    throwOnError: false
});

if (result.success) {
    console.log('Output:', result.output);
} else {
    console.error('Failed:', result.error);
    console.error('Stderr:', result.stderr);
}
```

## Integration with TerminalAgent

TerminalExecutor works seamlessly with TerminalAgent for intelligent command generation and safe execution:

```javascript
import { TerminalAgent } from './agents/TerminalAgent.js';
import TerminalExecutor from './utilities/TerminalExecutor.js';

const agent = new TerminalAgent();
const executor = new TerminalExecutor();

// Generate command
const cmd = await agent.generate('find all JavaScript files');

// Check safety
if (cmd.riskLevel === 'safe' && !cmd.requiresSudo) {
    // Execute safely
    const result = await executor.execute(cmd.terminalCommand);
    console.log(result.output);
}
```

## Examples

See the following demo files for complete examples:
- `test-terminal-executor.js` - Complete test suite
- `demo-terminal-integration.js` - Integration with TerminalAgent
- `test-terminal-agent.js` - TerminalAgent examples

## Backward Compatibility

The old static methods are still available for backward compatibility:

```javascript
import { TerminalUtils } from './utilities/TerminalExecutor.js';

// Old API (still works)
const { stdout, stderr } = await TerminalUtils.runCommand('ls -la');
await TerminalUtils.printCommandOutput('pwd');
```

## Best Practices

1. **Always set appropriate timeouts** for long-running commands
2. **Use streaming** for commands with large output
3. **Check command existence** before executing critical operations
4. **Handle errors gracefully** with try-catch or throwOnError: false
5. **Use parallel execution** for independent commands to save time
6. **Monitor statistics** to identify performance issues
7. **Validate user input** before passing to commands to prevent injection
8. **Set appropriate working directories** to avoid path issues

## Security Considerations

⚠️ **Important Security Notes:**

- Never pass unsanitized user input directly to commands
- Be cautious with commands that have `sudo` or admin privileges
- Validate all file paths to prevent directory traversal
- Use environment variables carefully to avoid leaking sensitive data
- Review command output for sensitive information before logging
- Set appropriate timeouts to prevent resource exhaustion
- Use the TerminalAgent safety checks for additional protection

## License

Part of the Lumen Essence AI project.

## Author

Gregory Ward (CodenLighten) - Chief Development Officer & Co-Founder, SmartLedger.Technology & Codenlighten.org
