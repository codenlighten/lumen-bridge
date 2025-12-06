/**
 * BuilderOrchestrator - Coordinates the complete builder workflow
 * 
 * Three-layer orchestration:
 * 1. VisionAgent creates final-state specification
 * 2. TaskPlannerAgent converts to dependency DAG
 * 3. BuilderAgent(s) execute tasks with scheduler
 * 
 * Implements:
 * - DAG scheduling (run tasks as dependencies complete)
 * - Parallel execution (multiple tasks simultaneously)
 * - Failure handling (mark blocked tasks)
 * - Progress tracking
 */

import { VisionAgent } from '../agents/VisionAgent.js';
import { TaskPlannerAgent } from '../agents/TaskPlannerAgent.js';
import { BuilderAgent } from '../agents/BuilderAgent.js';
import { SchedulerStateSchema } from '../schemas/BuilderWorkflowSchemas.js';

export class BuilderOrchestrator {
  constructor(options = {}) {
    this.visionAgent = new VisionAgent(options.visionOptions);
    this.plannerAgent = new TaskPlannerAgent(options.plannerOptions);
    this.maxParallelTasks = options.maxParallelTasks || 3;
    this.maxIterationsPerTask = options.maxIterationsPerTask || 20;
    this.maxTotalIterations = options.maxTotalIterations || 100;
    
    this.state = null;
    this.vision = null;
    this.taskGraph = null;
    this.workers = new Map(); // taskId → BuilderAgent
  }

  /**
   * Main entry point: user request → complete project
   */
  async build(projectDescription, userConstraints = {}) {
    console.log('\n' + '='.repeat(80));
    console.log('🏗️  BUILDER ORCHESTRATOR - START');
    console.log('='.repeat(80));
    console.log(`\nProject: "${projectDescription.substring(0, 60)}..."`);

    // Phase 1: Create Vision
    console.log('\n' + '='.repeat(80));
    console.log('📋 PHASE 1: VISION');
    console.log('='.repeat(80));
    
    this.vision = await this.visionAgent.createVision(projectDescription, userConstraints);
    const visionData = this.vision.data || this.vision;

    // Phase 2: Plan Tasks
    console.log('\n' + '='.repeat(80));
    console.log('📊 PHASE 2: TASK PLANNING');
    console.log('='.repeat(80));
    
    this.taskGraph = await this.plannerAgent.planTasks(visionData);

    // Phase 3: Execute with Scheduler
    console.log('\n' + '='.repeat(80));
    console.log('⚙️  PHASE 3: EXECUTION');
    console.log('='.repeat(80));
    
    this._initializeScheduler();
    const executionResult = await this._runScheduler();

    // Phase 4: Summary
    console.log('\n' + '='.repeat(80));
    console.log('📦 PHASE 4: SUMMARY');
    console.log('='.repeat(80));
    
    this._printSummary(executionResult);

    return {
      vision: visionData,
      taskGraph: this.taskGraph,
      execution: executionResult,
      state: this.state
    };
  }

  /**
   * Initialize scheduler state
   */
  _initializeScheduler() {
    this.state = {
      iteration: 0,
      tasksCompleted: [],
      tasksRunning: [],
      tasksBlocked: [],
      tasksFailed: [],
      executionHistory: [],
      tokensUsed: 0,
      maxIterations: this.maxTotalIterations
    };
  }

  /**
   * Main scheduler loop
   */
  async _runScheduler() {
    console.log(`\n🔄 Scheduler started`);
    console.log(`   Max parallel tasks: ${this.maxParallelTasks}`);
    console.log(`   Max iterations: ${this.maxTotalIterations}`);

    while (this.state.iteration < this.maxTotalIterations) {
      this.state.iteration++;

      // Get current statistics
      const stats = this.plannerAgent.getStatistics(this.taskGraph);
      
      console.log(`\n📊 Iteration ${this.state.iteration}`);
      console.log(`   Done: ${stats.done}/${stats.total} | Running: ${stats.running} | Runnable: ${stats.runnable} | Pending: ${stats.pending}`);

      // Check if we're done
      if (stats.done === stats.total) {
        console.log(`\n✅ All tasks complete!`);
        return { success: true, completedTasks: stats.done, totalIterations: this.state.iteration };
      }

      // Check if we're stuck
      if (stats.runnable === 0 && stats.running === 0 && stats.done < stats.total) {
        console.log(`\n⚠️  No runnable or running tasks, but ${stats.total - stats.done} tasks remain`);
        console.log(`   Blocked: ${stats.blocked}, Failed: ${stats.failed}`);
        return { success: false, reason: 'stuck', state: this.state };
      }

      // Get runnable tasks
      const runnableTasks = this.plannerAgent.getRunnableTasks(this.taskGraph);
      
      // Spawn workers for runnable tasks (up to parallel limit)
      const availableSlots = this.maxParallelTasks - this.state.tasksRunning.length;
      const tasksToStart = runnableTasks.slice(0, availableSlots);

      for (const task of tasksToStart) {
        await this._startTask(task);
      }

      // Wait for some tasks to complete
      if (this.state.tasksRunning.length > 0) {
        await this._waitForTaskCompletion();
      }

      // Safety: avoid infinite loops
      if (this.state.iteration >= this.maxTotalIterations) {
        console.log(`\n⚠️  Max iterations reached`);
        return { success: false, reason: 'max_iterations', state: this.state };
      }
    }

    return { success: false, reason: 'max_iterations', state: this.state };
  }

  /**
   * Start executing a task
   */
  async _startTask(task) {
    console.log(`\n🚀 Starting task: ${task.id}`);
    
    // Mark as running
    this.taskGraph.tasks.find(t => t.id === task.id).status = 'running';
    this.state.tasksRunning.push(task.id);

    // Create worker
    const worker = new BuilderAgent();
    this.workers.set(task.id, worker);

    // Start execution (non-blocking in real system, but we'll simulate)
    // In a real system, this would be Promise.race or similar
    this._executeTaskAsync(task, worker);
  }

  /**
   * Execute task asynchronously (simulated)
   */
  async _executeTaskAsync(task, worker) {
    try {
      const result = await worker.executeTask({
        task,
        context: {
          projectState: this.vision,
          completedTasks: this.state.tasksCompleted
        },
        maxIterations: this.maxIterationsPerTask
      });

      // Task completed
      this._handleTaskCompletion(task.id, result);
    } catch (error) {
      console.error(`\n❌ Task ${task.id} failed with error: ${error.message}`);
      this._handleTaskFailure(task.id, error.message);
    }
  }

  /**
   * Handle successful task completion
   */
  _handleTaskCompletion(taskId, result) {
    console.log(`\n✅ Task completed: ${taskId} (${result.iterations} iterations)`);

    // Update state
    this.state.tasksRunning = this.state.tasksRunning.filter(id => id !== taskId);
    this.state.tasksCompleted.push(taskId);
    
    // Record in history
    this.state.executionHistory.push({
      taskId,
      mode: result.finalResult?.mode,
      summary: `Completed in ${result.iterations} iterations`,
      timestamp: new Date().toISOString()
    });

    // Update task graph
    this.taskGraph = this.plannerAgent.updateTaskGraph(this.taskGraph, taskId);

    // Clean up worker
    this.workers.delete(taskId);
  }

  /**
   * Handle task failure
   */
  _handleTaskFailure(taskId, reason) {
    console.log(`\n❌ Task failed: ${taskId} - ${reason}`);

    // Update state
    this.state.tasksRunning = this.state.tasksRunning.filter(id => id !== taskId);
    this.state.tasksFailed.push(taskId);

    // Mark task and dependents as blocked
    this.taskGraph = this.plannerAgent.markTaskFailed(this.taskGraph, taskId, reason);

    // Clean up worker
    this.workers.delete(taskId);
  }

  /**
   * Wait for at least one task to complete
   */
  async _waitForTaskCompletion() {
    // In a real system, this would use Promise.race
    // For now, we'll simulate a delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Print final summary
   */
  _printSummary(result) {
    const stats = this.plannerAgent.getStatistics(this.taskGraph);
    
    console.log(`\n📈 Execution Summary:`);
    console.log(`   ✅ Completed: ${stats.done}/${stats.total} tasks`);
    console.log(`   ❌ Failed: ${stats.failed} tasks`);
    console.log(`   🚫 Blocked: ${stats.blocked} tasks`);
    console.log(`   🔄 Total iterations: ${this.state.iteration}`);
    console.log(`   📊 Success rate: ${Math.round((stats.done / stats.total) * 100)}%`);

    if (result.success) {
      console.log(`\n🎉 BUILD SUCCESSFUL`);
    } else {
      console.log(`\n⚠️  BUILD INCOMPLETE: ${result.reason}`);
    }

    // Show module completion
    console.log(`\n📦 Module Status:`);
    const visionData = this.vision.data || this.vision;
    (visionData.modules || []).forEach(module => {
      const moduleTasks = this.taskGraph.tasks.filter(t => 
        t.target && module.files.some(f => t.target.includes(f))
      );
      const completed = moduleTasks.filter(t => t.status === 'done').length;
      const total = moduleTasks.length;
      const status = completed === total ? '✅' : completed > 0 ? '🔄' : '⏳';
      console.log(`   ${status} ${module.id}: ${completed}/${total} tasks`);
    });
  }

  /**
   * Get current state (for inspection)
   */
  getState() {
    return {
      ...this.state,
      taskStats: this.plannerAgent.getStatistics(this.taskGraph)
    };
  }
}

export default BuilderOrchestrator;
