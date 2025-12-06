/**
 * 🎯 PerformanceMonitor - Track bottlenecks and timing across agent workflows
 * 
 * Usage:
 * const perf = new PerformanceMonitor('SearchAgent.process');
 * perf.checkpoint('validation');
 * perf.checkpoint('llm-call');
 * const report = perf.end();
 */

export class PerformanceMonitor {
  constructor(operationName = 'operation') {
    this.operationName = operationName;
    this.startTime = Date.now();
    this.checkpoints = [];
    this.lastCheckpointTime = this.startTime;
  }

  /**
   * Record a checkpoint with name and optional metadata
   */
  checkpoint(name, metadata = {}) {
    const now = Date.now();
    const sinceStart = now - this.startTime;
    const sinceLast = now - this.lastCheckpointTime;
    
    this.checkpoints.push({
      name,
      timestamp: now,
      sinceStart,
      sinceLast,
      metadata
    });
    
    this.lastCheckpointTime = now;
    return { sinceStart, sinceLast };
  }

  /**
   * End monitoring and return full report
   */
  end() {
    const endTime = Date.now();
    const totalTime = endTime - this.startTime;
    
    return {
      operation: this.operationName,
      totalTime,
      checkpoints: this.checkpoints,
      bottlenecks: this._identifyBottlenecks()
    };
  }

  /**
   * Print a formatted report to console
   */
  print() {
    const report = this.end();
    
    console.log(`\n⏱️  Performance Report: ${report.operation}`);
    console.log(`   Total Time: ${report.totalTime}ms`);
    console.log(`\n   Checkpoints:`);
    
    report.checkpoints.forEach((cp, i) => {
      const percent = ((cp.sinceLast / report.totalTime) * 100).toFixed(1);
      console.log(`   ${i + 1}. ${cp.name.padEnd(30)} ${cp.sinceLast.toString().padStart(6)}ms (${percent}%) ${cp.metadata.tokens ? `[${cp.metadata.tokens} tokens]` : ''}`);
    });
    
    if (report.bottlenecks.length > 0) {
      console.log(`\n   🚨 Bottlenecks (>20% of total time):`);
      report.bottlenecks.forEach(bn => {
        console.log(`   • ${bn.name}: ${bn.time}ms (${bn.percent.toFixed(1)}%)`);
      });
    }
    
    console.log('');
    return report;
  }

  /**
   * Identify operations that took >20% of total time
   */
  _identifyBottlenecks() {
    const totalTime = Date.now() - this.startTime;
    const threshold = totalTime * 0.2; // 20% threshold
    
    return this.checkpoints
      .filter(cp => cp.sinceLast > threshold)
      .map(cp => ({
        name: cp.name,
        time: cp.sinceLast,
        percent: (cp.sinceLast / totalTime) * 100
      }))
      .sort((a, b) => b.time - a.time);
  }

  /**
   * Static helper: wrap an async function with automatic monitoring
   */
  static async monitor(name, fn) {
    const monitor = new PerformanceMonitor(name);
    try {
      const result = await fn(monitor);
      monitor.print();
      return result;
    } catch (error) {
      monitor.checkpoint('error', { error: error.message });
      monitor.print();
      throw error;
    }
  }
}

/**
 * Global performance tracking for aggregated metrics
 */
export class PerformanceAggregator {
  constructor() {
    this.metrics = new Map();
  }

  record(operation, report) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, {
        count: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        checkpointStats: new Map()
      });
    }

    const stats = this.metrics.get(operation);
    stats.count++;
    stats.totalTime += report.totalTime;
    stats.minTime = Math.min(stats.minTime, report.totalTime);
    stats.maxTime = Math.max(stats.maxTime, report.totalTime);

    // Aggregate checkpoint times
    report.checkpoints.forEach(cp => {
      if (!stats.checkpointStats.has(cp.name)) {
        stats.checkpointStats.set(cp.name, { count: 0, totalTime: 0 });
      }
      const cpStats = stats.checkpointStats.get(cp.name);
      cpStats.count++;
      cpStats.totalTime += cp.sinceLast;
    });
  }

  getStats(operation) {
    const stats = this.metrics.get(operation);
    if (!stats) return null;

    return {
      operation,
      count: stats.count,
      avgTime: stats.totalTime / stats.count,
      minTime: stats.minTime,
      maxTime: stats.maxTime,
      checkpoints: Array.from(stats.checkpointStats.entries()).map(([name, cpStats]) => ({
        name,
        avgTime: cpStats.totalTime / cpStats.count,
        count: cpStats.count
      }))
    };
  }

  printSummary() {
    console.log('\n📊 Performance Summary (All Operations):\n');
    
    for (const [operation, stats] of this.metrics.entries()) {
      const avgTime = stats.totalTime / stats.count;
      console.log(`${operation}:`);
      console.log(`  Calls: ${stats.count}, Avg: ${avgTime.toFixed(0)}ms, Min: ${stats.minTime}ms, Max: ${stats.maxTime}ms`);
      
      // Show top 3 slowest checkpoints
      const sortedCheckpoints = Array.from(stats.checkpointStats.entries())
        .map(([name, cpStats]) => ({
          name,
          avgTime: cpStats.totalTime / cpStats.count
        }))
        .sort((a, b) => b.avgTime - a.avgTime)
        .slice(0, 3);

      if (sortedCheckpoints.length > 0) {
        console.log(`  Top bottlenecks:`);
        sortedCheckpoints.forEach(cp => {
          console.log(`    • ${cp.name}: ${cp.avgTime.toFixed(0)}ms avg`);
        });
      }
      console.log('');
    }
  }
}

// Global aggregator instance
export const globalPerformance = new PerformanceAggregator();
