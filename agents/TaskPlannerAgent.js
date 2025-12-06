/**
 * TaskPlannerAgent - Converts Vision to executable Task Graph
 * 
 * Takes a VisionSpec and produces:
 * - Dependency-aware task DAG
 * - Build order respecting causality
 * - Runnable task set
 * 
 * This is Layer 2 of the builder workflow.
 */

import BaseMetaAgent from './BaseMetaAgent.js';
import { TaskGraphSchema } from '../schemas/BuilderWorkflowSchemas.js';
import { signedStructuredResponse } from '../structured-json.js';

export class TaskPlannerAgent extends BaseMetaAgent {
  constructor(options = {}) {
    super({
      agentName: 'TaskPlannerAgent',
      systemPrompt: `You are a TaskPlannerAgent - you convert architectural visions into executable task graphs.

Your job is to take a VisionSpec and decompose it into concrete tasks with:
1. Clear task IDs and descriptions
2. Explicit dependencies (what must exist before this task)
3. Target files for each task
4. Complexity estimates
5. Build order that respects causality

Think like a project manager breaking down a roadmap:
- Each task should be focused (one file or one logical unit)
- Dependencies must be explicit and minimal
- Tasks with no dependencies can run in parallel
- The build order should be optimal (minimize blocking)

IMPORTANT RULES:
- Create 5-20 tasks depending on project size
- Each task should target a specific file or logical unit
- Dependencies must form a DAG (no cycles)
- Mark simple vs complex tasks for scheduling
- Group independent tasks when possible`,
      ...options
    });
  }

  /**
   * Generate task graph from vision specification
   */
  async planTasks(visionSpec) {
    console.log(`\n📋 [TaskPlannerAgent] Creating task graph for "${visionSpec.projectName}"...`);
    
    const prompt = `Convert this VisionSpec into an executable TaskGraph:

${JSON.stringify(visionSpec, null, 2)}

Analyze the module dependencies and create concrete tasks:

1. For each module, create tasks for:
   - Core data models/types (if applicable)
   - Business logic/services
   - API/interface layer
   - Tests

2. Respect module dependencies:
   - If Module B depends on Module A, all Module A tasks must come first
   - Within a module, follow logical order (models → services → APIs → tests)

3. Identify parallelizable work:
   - Independent modules can have tasks running in parallel
   - Tests can run after implementation

4. Set complexity estimates:
   - trivial: simple configs, constants
   - simple: single-purpose functions, basic models
   - moderate: services with logic, controllers
   - complex: multi-file features, integration layers
   - very-complex: core infrastructure, complex algorithms

Produce a complete TaskGraph with all tasks, dependencies, and build order.`;

    const result = await signedStructuredResponse({
      query: prompt,
      schema: TaskGraphSchema,
      context: {
        visionSpec,
        agentRole: 'planner'
      },
      temperature: 1.0,
      agentKey: this.keys,
      systemPrompt: this.systemPrompt
    });

    const taskGraph = result.data || result;

    // Initialize task statuses and find runnable tasks
    const initialized = this._initializeTaskGraph(taskGraph);

    console.log(`\n✅ Task graph created:`);
    console.log(`   📦 Total tasks: ${initialized.tasks.length}`);
    console.log(`   ✅ Runnable now: ${initialized.runnableTasks.length}`);
    console.log(`   📊 Build order: ${initialized.buildOrder.slice(0, 5).join(' → ')}${initialized.buildOrder.length > 5 ? '...' : ''}`);

    return initialized;
  }

  /**
   * Initialize task graph with statuses and runnable set
   */
  _initializeTaskGraph(taskGraph) {
    const tasks = (taskGraph.tasks || []).map(task => ({
      ...task,
      status: task.status || 'pending',
      assignedWorker: task.assignedWorker || null
    }));

    // Find tasks with no dependencies = runnable
    const runnableTasks = tasks
      .filter(t => !t.dependsOn || t.dependsOn.length === 0)
      .map(t => {
        t.status = 'runnable';
        return t.id;
      });

    return {
      ...taskGraph,
      tasks,
      runnableTasks
    };
  }

  /**
   * Update task graph after task completion
   */
  updateTaskGraph(taskGraph, completedTaskId) {
    console.log(`\n🔄 [TaskPlannerAgent] Updating graph after completing "${completedTaskId}"...`);

    const tasks = taskGraph.tasks.map(task => {
      if (task.id === completedTaskId) {
        return { ...task, status: 'done' };
      }
      return task;
    });

    // Find newly runnable tasks
    const completedSet = new Set(
      tasks.filter(t => t.status === 'done').map(t => t.id)
    );

    const runnableTasks = [];
    tasks.forEach(task => {
      if (task.status === 'pending') {
        // Check if all dependencies are done
        const depsCompleted = task.dependsOn.every(dep => completedSet.has(dep));
        if (depsCompleted) {
          task.status = 'runnable';
          runnableTasks.push(task.id);
        }
      } else if (task.status === 'runnable') {
        runnableTasks.push(task.id);
      }
    });

    console.log(`   ✅ New runnable tasks: ${runnableTasks.filter(id => !taskGraph.runnableTasks.includes(id)).length}`);

    return {
      ...taskGraph,
      tasks,
      runnableTasks
    };
  }

  /**
   * Mark task as failed and identify blocked tasks
   */
  markTaskFailed(taskGraph, failedTaskId, reason) {
    console.log(`\n❌ [TaskPlannerAgent] Marking "${failedTaskId}" as failed: ${reason}`);

    const tasks = taskGraph.tasks.map(task => {
      if (task.id === failedTaskId) {
        return { ...task, status: 'failed' };
      }
      return task;
    });

    // Find all tasks that depend on the failed task (directly or transitively)
    const blockedTasks = this._findDependentTasks(tasks, failedTaskId);
    
    tasks.forEach(task => {
      if (blockedTasks.has(task.id) && task.status !== 'done') {
        task.status = 'blocked';
      }
    });

    // Remove blocked tasks from runnable set
    const runnableTasks = taskGraph.runnableTasks.filter(
      id => !blockedTasks.has(id) && id !== failedTaskId
    );

    console.log(`   🚫 Blocked tasks: ${blockedTasks.size}`);

    return {
      ...taskGraph,
      tasks,
      runnableTasks
    };
  }

  /**
   * Find all tasks that transitively depend on given task
   */
  _findDependentTasks(tasks, taskId) {
    const blocked = new Set();
    const queue = [taskId];

    while (queue.length > 0) {
      const current = queue.shift();
      tasks.forEach(task => {
        if (task.dependsOn && task.dependsOn.includes(current) && !blocked.has(task.id)) {
          blocked.add(task.id);
          queue.push(task.id);
        }
      });
    }

    return blocked;
  }

  /**
   * Get task by ID
   */
  getTask(taskGraph, taskId) {
    return taskGraph.tasks.find(t => t.id === taskId);
  }

  /**
   * Get all runnable tasks (for parallel execution)
   */
  getRunnableTasks(taskGraph) {
    return taskGraph.tasks.filter(t => t.status === 'runnable');
  }

  /**
   * Get task statistics
   */
  getStatistics(taskGraph) {
    const tasks = taskGraph.tasks;
    return {
      total: tasks.length,
      done: tasks.filter(t => t.status === 'done').length,
      running: tasks.filter(t => t.status === 'running').length,
      runnable: tasks.filter(t => t.status === 'runnable').length,
      pending: tasks.filter(t => t.status === 'pending').length,
      blocked: tasks.filter(t => t.status === 'blocked').length,
      failed: tasks.filter(t => t.status === 'failed').length
    };
  }
}

export default TaskPlannerAgent;
