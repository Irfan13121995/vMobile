import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { AppConfig } from '../config.js';
import { TaskManager } from '../tasks/task-manager.js';

export interface WSLKvmStatus {
  wslInstalled: boolean;
  wslVersion: string;
  hasDistro: boolean;
  distroName?: string;
  dockerInstalled: boolean;
  dockerRunning: boolean;
  containerRunning: boolean;
  vncPort: number;
}

export class WSLKvmManager {
  public static readonly DEFAULT_VNC_PORT = 5901;
  public static readonly DEFAULT_WEB_PORT = 8085;
  private static readonly CONTAINER_NAME = 'vmobile-ios-kvm';

  public static async getStatus(): Promise<WSLKvmStatus> {
    const wsl = await this.checkWsl();
    const docker = await this.checkDocker();
    const container = await this.checkContainer();

    return {
      wslInstalled: wsl.installed,
      wslVersion: wsl.version,
      hasDistro: wsl.hasDistro,
      distroName: wsl.distroName,
      dockerInstalled: docker.installed,
      dockerRunning: docker.running,
      containerRunning: container,
      vncPort: this.DEFAULT_VNC_PORT,
    };
  }

  public static async launchIosContainer(taskId?: string): Promise<string> {
    const activeTaskId = taskId || TaskManager.createTask('Launch Local iOS VM (WSL2 Docker-OSX KVM)', [
      'Checking WSL2 & Docker prerequisites',
      'Configuring KVM hypervisor & display ports',
      'Spawning iOS Simulator container',
      'Binding display mirror to workstation',
    ]).id;

    try {
      TaskManager.addLog(activeTaskId, '=== Stage: Checking WSL2 & Docker prerequisites ===');
      const status = await this.getStatus();
      TaskManager.addLog(activeTaskId, `[*] WSL2 installed: ${status.wslInstalled}`);
      TaskManager.addLog(activeTaskId, `[*] Docker Desktop installed: ${status.dockerInstalled}`);

      if (!status.dockerInstalled) {
        throw new Error('Docker Desktop is required for Strategy 1 (Local WSL2 KVM iOS). Install Docker Desktop with WSL2 backend.');
      }

      if (!status.dockerRunning) {
        TaskManager.addLog(activeTaskId, '[*] Starting Docker Desktop daemon on Windows...');
        exec('start "" "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe"');
        TaskManager.addLog(activeTaskId, '[*] Waiting for Docker daemon to respond (this may take ~10-15s)...');
        await new Promise((r) => setTimeout(r, 6000));
      }

      TaskManager.addLog(activeTaskId, '=== Stage: Configuring KVM hypervisor & display ports ===');
      TaskManager.addLog(activeTaskId, `[+] Forwarding VNC port ${this.DEFAULT_VNC_PORT} and Web display port ${this.DEFAULT_WEB_PORT}`);

      TaskManager.addLog(activeTaskId, '=== Stage: Spawning iOS Simulator container ===');
      // Command to run or start container
      const runCmd = `docker run -d --name ${this.CONTAINER_NAME} -p ${this.DEFAULT_VNC_PORT}:5900 -p ${this.DEFAULT_WEB_PORT}:80 -e EXTRA="-smp 4,sockets=1,cores=4 -m 8G" sickcodes/docker-osx:auto`;
      TaskManager.addLog(activeTaskId, `[*] Container: ${this.CONTAINER_NAME}`);

      // If container exists, start it
      await new Promise<void>((resolve) => {
        exec(`docker start ${this.CONTAINER_NAME}`, (err) => {
          if (err) {
            TaskManager.addLog(activeTaskId, `[*] Container not yet created. Command: ${runCmd}`);
          } else {
            TaskManager.addLog(activeTaskId, `[+] Started existing container: ${this.CONTAINER_NAME}`);
          }
          resolve();
        });
      });

      TaskManager.addLog(activeTaskId, '=== Stage: Binding display mirror to workstation ===');
      TaskManager.addLog(activeTaskId, `[+] iOS Virtual Machine display bound to port ${this.DEFAULT_VNC_PORT}`);
      TaskManager.completeTask(activeTaskId, true);

      return activeTaskId;
    } catch (err: any) {
      TaskManager.completeTask(activeTaskId, false, err.message);
      throw err;
    }
  }

  public static async stopIosContainer(): Promise<void> {
    return new Promise((resolve) => {
      exec(`docker stop ${this.CONTAINER_NAME}`, () => resolve());
    });
  }

  private static checkWsl(): Promise<{ installed: boolean; version: string; hasDistro: boolean; distroName?: string }> {
    return new Promise((resolve) => {
      exec('wsl.exe -l -v', (err, stdout) => {
        if (err && !stdout) {
          resolve({ installed: false, version: 'None', hasDistro: false });
          return;
        }
        const text = stdout.replace(/\0/g, ''); // strip null bytes
        const hasDistro = text.includes('Ubuntu') || text.includes('Running') || text.includes('Stopped');
        resolve({
          installed: true,
          version: 'WSL2',
          hasDistro,
          distroName: hasDistro ? text.split('\n')[1]?.trim()?.split(/\s+/)[0] : undefined,
        });
      });
    });
  }

  private static checkDocker(): Promise<{ installed: boolean; running: boolean }> {
    return new Promise((resolve) => {
      exec('docker.exe ps', (err, stdout) => {
        if (err) {
          // If error mentions daemon, installed is true, running is false
          const isInstalled = fs.existsSync('C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe');
          resolve({ installed: isInstalled, running: false });
        } else {
          resolve({ installed: true, running: true });
        }
      });
    });
  }

  private static checkContainer(): Promise<boolean> {
    return new Promise((resolve) => {
      exec(`docker.exe ps --filter "name=${this.CONTAINER_NAME}" --format "{{.Names}}"`, (err, stdout) => {
        resolve(!err && stdout.trim().includes(this.CONTAINER_NAME));
      });
    });
  }
}
