import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import { AppConfig } from '../config.js';
import { AdbClient } from './adb-client.js';

export interface RunningProcessInfo {
  avdName: string;
  pid: number;
  process: ChildProcess;
  startedAt: number;
}

export class EmulatorRunner {
  private static runningProcesses = new Map<string, RunningProcessInfo>();

  public static isAvdRunning(avdName: string): boolean {
    // 1. Check in-memory spawned processes
    const proc = this.runningProcesses.get(avdName);
    if (proc && !proc.process.killed) {
      try {
        process.kill(proc.pid, 0);
        return true;
      } catch {
        this.runningProcesses.delete(avdName);
      }
    }

    // 2. Check lock files in ~/.android/avd/<name>.avd/
    const avdDir = path.join(AppConfig.ANDROID_AVD_DIR, `${avdName}.avd`);
    if (fs.existsSync(avdDir)) {
      const lock1 = path.join(avdDir, 'hardware-qemu.ini.lock');
      const lock2 = path.join(avdDir, 'multiinstance.lock');
      if (fs.existsSync(lock1) || fs.existsSync(lock2)) {
        return true;
      }
    }

    return false;
  }

  public static async launch(avdName: string, headless: boolean = false): Promise<RunningProcessInfo> {
    if (this.isAvdRunning(avdName)) {
      throw new Error(`Device '${avdName}' is already running.`);
    }

    const emulatorExe = AppConfig.getEmulatorPath();
    const args = ['-avd', avdName, '-accel', 'on'];
    if (headless) {
      args.push('-no-window');
    }

    const child = spawn(emulatorExe, args, {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    });

    child.unref();

    const info: RunningProcessInfo = {
      avdName,
      pid: child.pid || 0,
      process: child,
      startedAt: Date.now(),
    };

    this.runningProcesses.set(avdName, info);

    child.on('exit', () => {
      this.runningProcesses.delete(avdName);
    });

    return info;
  }

  public static async stop(avdName: string): Promise<boolean> {
    // 1. Try stopping via ADB emu kill
    const devices = await AdbClient.listDevices();
    for (const d of devices) {
      if (d.serial.startsWith('emulator-')) {
        const avd = await AdbClient.getProperty(d.serial, 'ro.kernel.qemu.avd_name');
        if (avd.trim() === avdName || devices.length === 1) {
          await AdbClient.stopEmulator(d.serial);
          break;
        }
      }
    }

    // 2. Terminate PID if known
    const proc = this.runningProcesses.get(avdName);
    if (proc && proc.pid) {
      try {
        process.kill(proc.pid, 'SIGTERM');
      } catch {
        // ignore
      }
      this.runningProcesses.delete(avdName);
    }

    return true;
  }
}
