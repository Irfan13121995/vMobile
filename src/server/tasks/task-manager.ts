import { TaskModel, TaskStage } from '../../shared/types.js';

type TaskListener = (task: TaskModel) => void;

export class TaskManager {
  private static tasks = new Map<string, TaskModel>();
  private static listeners: TaskListener[] = [];

  public static onTaskUpdate(listener: TaskListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private static notify(task: TaskModel) {
    for (const listener of this.listeners) {
      try {
        listener(task);
      } catch {
        // ignore listener errors
      }
    }
  }

  public static createTask(title: string, plannedStages: string[] = []): TaskModel {
    const id = `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const stages: TaskStage[] = plannedStages.map((label, i) => ({
      id: `stage-${i}`,
      label,
      status: i === 0 ? 'running' : 'pending',
    }));

    const task: TaskModel = {
      id,
      title,
      status: 'running',
      stages,
      currentStageId: stages[0]?.id,
      logs: [`[*] Initializing task: ${title}...`],
      startTime: Date.now(),
    };

    this.tasks.set(id, task);
    this.notify(task);
    return task;
  }

  public static addLog(taskId: string, line: string) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.logs.push(line);

    // Stage detection heuristic like vphone-ws: "=== Stage: ... ==="
    const stageMatch = line.match(/^===\s*(?:Stage:\s*)?(.+?)\s*===$/);
    if (stageMatch) {
      const stageName = stageMatch[1];
      const existing = task.stages.find((s) => s.label.toLowerCase() === stageName.toLowerCase());
      if (existing) {
        task.stages.forEach((s) => {
          if (s.status === 'running') s.status = 'completed';
        });
        existing.status = 'running';
        task.currentStageId = existing.id;
      } else {
        const newStage: TaskStage = {
          id: `stage-${task.stages.length}`,
          label: stageName,
          status: 'running',
        };
        task.stages.forEach((s) => {
          if (s.status === 'running') s.status = 'completed';
        });
        task.stages.push(newStage);
        task.currentStageId = newStage.id;
      }
    }

    this.notify(task);
  }

  public static setStage(taskId: string, stageIndex: number) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.stages.forEach((s, idx) => {
      if (idx < stageIndex) s.status = 'completed';
      else if (idx === stageIndex) s.status = 'running';
      else s.status = 'pending';
    });
    task.currentStageId = task.stages[stageIndex]?.id;
    this.notify(task);
  }

  public static completeTask(taskId: string, success: boolean = true, error?: string) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = success ? 'completed' : 'failed';
    task.endTime = Date.now();
    task.exitCode = success ? 0 : 1;
    task.error = error;

    task.stages.forEach((s) => {
      if (s.status === 'running') {
        s.status = success ? 'completed' : 'failed';
      }
    });

    task.logs.push(
      success
        ? `[+] Task completed successfully in ${((task.endTime - task.startTime) / 1000).toFixed(1)}s`
        : `[!] Task failed: ${error || 'Unknown error'}`
    );

    this.notify(task);
  }

  public static cancelTask(taskId: string) {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'running') return;

    task.status = 'cancelled';
    task.endTime = Date.now();
    task.exitCode = 130;
    task.logs.push('[-] Task cancelled by user.');
    this.notify(task);
  }

  public static getTask(taskId: string): TaskModel | undefined {
    return this.tasks.get(taskId);
  }

  public static getAllTasks(): TaskModel[] {
    return Array.from(this.tasks.values()).reverse();
  }
}
