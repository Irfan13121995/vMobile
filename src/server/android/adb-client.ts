import { execFile, spawn } from 'child_process';
import { AppConfig } from '../config.js';

export interface ConnectedAdbDevice {
  serial: string;
  status: string; // 'device' | 'offline' | 'unauthorized'
  product?: string;
  model?: string;
  device?: string;
  transportId?: string;
}

export class AdbClient {
  public static execute(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
      const adb = AppConfig.getAdbPath();
      execFile(adb, args, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        resolve({
          stdout: stdout || '',
          stderr: stderr || '',
          exitCode: error && typeof error.code === 'number' ? error.code : (error ? 1 : 0),
        });
      });
    });
  }

  public static async listDevices(): Promise<ConnectedAdbDevice[]> {
    const { stdout } = await this.execute(['devices', '-l']);
    const lines = stdout.split(/\r?\n/);
    const devices: ConnectedAdbDevice[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('List of devices') || trimmed.startsWith('* daemon')) {
        continue;
      }
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2) {
        const serial = parts[0];
        const status = parts[1];
        const dev: ConnectedAdbDevice = { serial, status };
        for (let i = 2; i < parts.length; i++) {
          const [k, v] = parts[i].split(':');
          if (k === 'product') dev.product = v;
          if (k === 'model') dev.model = v;
          if (k === 'device') dev.device = v;
          if (k === 'transport_id') dev.transportId = v;
        }
        devices.push(dev);
      }
    }
    return devices;
  }

  public static async getProperty(serial: string, prop: string): Promise<string> {
    const { stdout } = await this.execute(['-s', serial, 'shell', 'getprop', prop]);
    return stdout.trim();
  }

  public static async getScreenCapture(serial: string): Promise<Buffer | null> {
    return new Promise((resolve) => {
      const adb = AppConfig.getAdbPath();
      const child = spawn(adb, ['-s', serial, 'exec-out', 'screencap', '-p'], {
        windowsHide: true,
      });

      const chunks: Buffer[] = [];
      child.stdout.on('data', (d) => chunks.push(Buffer.from(d)));
      child.on('error', () => resolve(null));
      child.on('close', (code) => {
        if (code === 0 && chunks.length > 0) {
          resolve(Buffer.concat(chunks));
        } else {
          resolve(null);
        }
      });
    });
  }

  public static async inputTap(serial: string, x: number, y: number): Promise<boolean> {
    const { exitCode } = await this.execute(['-s', serial, 'shell', 'input', 'tap', Math.round(x).toString(), Math.round(y).toString()]);
    return exitCode === 0;
  }

  public static async inputSwipe(
    serial: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    durationMs: number = 250
  ): Promise<boolean> {
    const { exitCode } = await this.execute([
      '-s',
      serial,
      'shell',
      'input',
      'swipe',
      Math.round(x1).toString(),
      Math.round(y1).toString(),
      Math.round(x2).toString(),
      Math.round(y2).toString(),
      Math.round(durationMs).toString(),
    ]);
    return exitCode === 0;
  }

  public static async inputKeyEvent(serial: string, keyCode: number): Promise<boolean> {
    const { exitCode } = await this.execute(['-s', serial, 'shell', 'input', 'keyevent', keyCode.toString()]);
    return exitCode === 0;
  }

  public static async inputText(serial: string, text: string): Promise<boolean> {
    const escaped = text.replace(/([\\' "])/g, '\\$1');
    const { exitCode } = await this.execute(['-s', serial, 'shell', 'input', 'text', escaped]);
    return exitCode === 0;
  }

  public static async stopEmulator(serial: string): Promise<boolean> {
    const { exitCode } = await this.execute(['-s', serial, 'emu', 'kill']);
    return exitCode === 0;
  }

  public static async installApk(serial: string, apkPath: string): Promise<{ success: boolean; message: string }> {
    const { stdout, stderr, exitCode } = await this.execute(['-s', serial, 'install', '-r', apkPath]);
    const success = exitCode === 0 && (stdout.includes('Success') || !stderr);
    return {
      success,
      message: (stdout + '\n' + stderr).trim(),
    };
  }

  public static async runShell(serial: string, command: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return this.execute(['-s', serial, 'shell', command]);
  }
}
