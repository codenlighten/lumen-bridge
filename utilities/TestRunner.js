/**
 * TestRunner - Automated test execution and validation for generated agents
 * 
 * Integrates with MetaAgentBuilderV2 to run tests before agent deployment.
 * Ensures generated agents work correctly and meet quality standards.
 * 
 * Features:
 * - Executes test files automatically
 * - Captures test results (pass/fail, assertions, errors)
 * - Generates test reports
 * - Validates agent functionality before saving
 * - Supports multiple test patterns (unit, integration, e2e)
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

export class TestRunner {
  constructor(options = {}) {
    this.testDir = options.testDir || './tests';
    this.timeout = options.timeout || 30000; // 30 seconds default
    this.verbose = options.verbose || false;
    this.minPassRate = options.minPassRate || 0.8; // 80% pass rate required
  }

  /**
   * Run all tests for a specific agent
   * @param {string} agentName - Name of the agent to test
   * @param {string} testFilePath - Path to the test file
   * @returns {Object} Test results with pass/fail status
   */
  async runAgentTests(agentName, testFilePath) {
    console.log(`\n🧪 Running tests for ${agentName}...`);
    console.log(`📁 Test file: ${testFilePath}`);

    try {
      // Check if test file exists
      await fs.access(testFilePath);
    } catch (error) {
      return {
        success: false,
        error: 'Test file not found',
        agentName,
        testFilePath,
        timestamp: new Date().toISOString()
      };
    }

    const results = await this.executeTestFile(testFilePath);
    
    // Validate results
    const passRate = results.passed / (results.passed + results.failed);
    const meetsThreshold = passRate >= this.minPassRate;

    const finalResults = {
      success: results.passed > 0 && results.failed === 0 && !results.error,
      agentName,
      testFilePath,
      passed: results.passed,
      failed: results.failed,
      errors: results.errors,
      warnings: results.warnings,
      passRate: passRate.toFixed(2),
      meetsThreshold,
      duration: results.duration,
      output: results.output,
      timestamp: new Date().toISOString()
    };

    this.printResults(finalResults);
    return finalResults;
  }

  /**
   * Execute a test file using Node.js
   * @param {string} testFilePath - Path to test file
   * @returns {Object} Execution results
   */
  async executeTestFile(testFilePath) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let output = '';
      let errorOutput = '';

      const testProcess = spawn('node', [testFilePath], {
        cwd: process.cwd(),
        env: { ...process.env, NODE_ENV: 'test' }
      });

      testProcess.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        if (this.verbose) {
          process.stdout.write(text);
        }
      });

      testProcess.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        if (this.verbose) {
          process.stderr.write(text);
        }
      });

      // Timeout handling
      const timeoutId = setTimeout(() => {
        testProcess.kill();
        resolve({
          passed: 0,
          failed: 1,
          errors: ['Test timeout exceeded'],
          warnings: [],
          duration: this.timeout,
          output: output + '\n[TIMEOUT]',
          error: true
        });
      }, this.timeout);

      testProcess.on('close', (code) => {
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;

        // Parse output for test results
        const parsed = this.parseTestOutput(output, errorOutput);

        resolve({
          passed: code === 0 ? parsed.passed : 0,
          failed: code === 0 ? parsed.failed : 1,
          errors: code !== 0 ? [errorOutput || 'Test execution failed'] : parsed.errors,
          warnings: parsed.warnings,
          duration,
          output: output + (errorOutput ? '\n' + errorOutput : ''),
          error: code !== 0
        });
      });

      testProcess.on('error', (error) => {
        clearTimeout(timeoutId);
        resolve({
          passed: 0,
          failed: 1,
          errors: [error.message],
          warnings: [],
          duration: Date.now() - startTime,
          output: errorOutput,
          error: true
        });
      });
    });
  }

  /**
   * Parse test output to extract results
   * Supports common test patterns and assertion messages
   */
  parseTestOutput(output, errorOutput) {
    const results = {
      passed: 0,
      failed: 0,
      errors: [],
      warnings: []
    };

    // Pattern matching for common test output formats
    const lines = output.split('\n');

    for (const line of lines) {
      // Check for success indicators
      if (line.match(/✓|✔|PASS|passed|success/i)) {
        results.passed++;
      }
      
      // Check for failure indicators
      if (line.match(/✗|✖|FAIL|failed|error/i)) {
        results.failed++;
        results.errors.push(line.trim());
      }

      // Check for warnings
      if (line.match(/⚠|WARN|warning/i)) {
        results.warnings.push(line.trim());
      }

      // Check for assertion errors
      if (line.match(/AssertionError|Expected|Received/i)) {
        results.errors.push(line.trim());
      }
    }

    // If no explicit pass/fail found but no errors, assume 1 pass
    if (results.passed === 0 && results.failed === 0 && !errorOutput) {
      results.passed = 1;
    }

    // Parse error output for additional failures
    if (errorOutput) {
      const errorLines = errorOutput.split('\n').filter(l => l.trim());
      results.errors.push(...errorLines);
      if (results.failed === 0 && errorLines.length > 0) {
        results.failed = 1;
      }
    }

    return results;
  }

  /**
   * Print formatted test results
   */
  printResults(results) {
    console.log('\n' + '━'.repeat(60));
    console.log('📊 TEST RESULTS');
    console.log('━'.repeat(60));
    
    if (results.success) {
      console.log('✅ Status: PASSED');
    } else {
      console.log('❌ Status: FAILED');
    }

    console.log(`\n📈 Statistics:`);
    console.log(`   Passed: ${results.passed}`);
    console.log(`   Failed: ${results.failed}`);
    console.log(`   Pass Rate: ${(results.passRate * 100).toFixed(1)}%`);
    console.log(`   Duration: ${results.duration}ms`);

    if (results.meetsThreshold !== undefined) {
      console.log(`   Meets Threshold (${(this.minPassRate * 100)}%): ${results.meetsThreshold ? '✓' : '✗'}`);
    }

    if (results.warnings && results.warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${results.warnings.length}):`);
      results.warnings.forEach(w => console.log(`   - ${w}`));
    }

    if (results.errors && results.errors.length > 0) {
      console.log(`\n❌ Errors (${results.errors.length}):`);
      results.errors.slice(0, 5).forEach(e => console.log(`   - ${e}`));
      if (results.errors.length > 5) {
        console.log(`   ... and ${results.errors.length - 5} more`);
      }
    }

    console.log('━'.repeat(60) + '\n');
  }

  /**
   * Run multiple test files in sequence
   * @param {Array} testFiles - Array of test file paths
   * @returns {Object} Aggregated results
   */
  async runTestSuite(testFiles) {
    console.log(`\n🧪 Running test suite (${testFiles.length} files)...\n`);

    const results = [];
    let totalPassed = 0;
    let totalFailed = 0;
    const startTime = Date.now();

    for (const testFile of testFiles) {
      const agentName = path.basename(testFile, '.test.js');
      const result = await this.runAgentTests(agentName, testFile);
      results.push(result);
      totalPassed += result.passed;
      totalFailed += result.failed;
    }

    const totalDuration = Date.now() - startTime;
    const overallSuccess = totalFailed === 0 && totalPassed > 0;

    const summary = {
      success: overallSuccess,
      totalTests: testFiles.length,
      totalPassed,
      totalFailed,
      passRate: (totalPassed / (totalPassed + totalFailed)).toFixed(2),
      duration: totalDuration,
      results,
      timestamp: new Date().toISOString()
    };

    this.printSuiteSummary(summary);
    return summary;
  }

  /**
   * Print test suite summary
   */
  printSuiteSummary(summary) {
    console.log('\n' + '═'.repeat(60));
    console.log('📊 TEST SUITE SUMMARY');
    console.log('═'.repeat(60));

    if (summary.success) {
      console.log('✅ Overall Status: ALL TESTS PASSED');
    } else {
      console.log('❌ Overall Status: SOME TESTS FAILED');
    }

    console.log(`\n📈 Aggregate Statistics:`);
    console.log(`   Total Test Files: ${summary.totalTests}`);
    console.log(`   Total Assertions Passed: ${summary.totalPassed}`);
    console.log(`   Total Assertions Failed: ${summary.totalFailed}`);
    console.log(`   Overall Pass Rate: ${(summary.passRate * 100).toFixed(1)}%`);
    console.log(`   Total Duration: ${(summary.duration / 1000).toFixed(2)}s`);

    console.log(`\n📝 Test Results:`);
    summary.results.forEach((result, idx) => {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${idx + 1}. ${status} ${result.agentName} (${result.passed}/${result.passed + result.failed})`);
    });

    console.log('═'.repeat(60) + '\n');
  }

  /**
   * Generate JSON report file
   * @param {Object} results - Test results to save
   * @param {string} outputPath - Where to save the report
   */
  async saveReport(results, outputPath) {
    try {
      const report = {
        ...results,
        generatedAt: new Date().toISOString(),
        system: {
          node: process.version,
          platform: process.platform,
          arch: process.arch
        }
      };

      await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
      console.log(`📄 Test report saved: ${outputPath}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to save report: ${error.message}`);
      return false;
    }
  }

  /**
   * Validate that an agent meets quality standards
   * @param {Object} testResults - Results from runAgentTests
   * @returns {Object} Validation result with recommendations
   */
  validateAgentQuality(testResults) {
    const issues = [];
    const recommendations = [];

    // Check pass rate
    if (testResults.passRate < this.minPassRate) {
      issues.push(`Pass rate ${testResults.passRate} below threshold ${this.minPassRate}`);
      recommendations.push('Fix failing tests before deployment');
    }

    // Check for errors
    if (testResults.errors && testResults.errors.length > 0) {
      issues.push(`${testResults.errors.length} error(s) detected`);
      recommendations.push('Review and fix error messages');
    }

    // Check test duration
    if (testResults.duration > 10000) {
      recommendations.push('Consider optimizing test performance (>10s)');
    }

    const isValid = issues.length === 0;

    return {
      isValid,
      passesQualityGate: isValid,
      issues,
      recommendations,
      agentName: testResults.agentName,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Quick test execution helper
 * @param {string} testFilePath - Path to test file
 * @param {Object} options - TestRunner options
 */
export async function runTests(testFilePath, options = {}) {
  const runner = new TestRunner(options);
  const agentName = path.basename(testFilePath, '.test.js');
  return await runner.runAgentTests(agentName, testFilePath);
}

/**
 * Validate test file exists and is executable
 */
export async function validateTestFile(testFilePath) {
  try {
    await fs.access(testFilePath);
    const content = await fs.readFile(testFilePath, 'utf-8');
    
    // Basic validation checks
    const hasImports = content.includes('import') || content.includes('require');
    const hasTestLogic = content.includes('test') || content.includes('assert') || content.includes('expect');
    
    return {
      exists: true,
      hasImports,
      hasTestLogic,
      isValid: hasImports && hasTestLogic,
      path: testFilePath
    };
  } catch (error) {
    return {
      exists: false,
      error: error.message,
      path: testFilePath
    };
  }
}

export default TestRunner;
