import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { AppConfig } from '../config.js';
import { CreateDeviceRequest, DeviceReport, UpdateDeviceConfig } from '../../shared/types.js';

export interface VirtualIOSRecord {
  id: string;
  name: string;
  variant: string;
  iosVersion: string;
  cloudOSVersion: string;
  cpuCount: number;
  memoryMB: number;
  diskSizeBytes: number;
  udid: string;
  deviceModel: string;
  networkMode: string;
  createdAt: number;
  status: 'running' | 'stopped';
}

export class IOSManager {
  private static readonly IOS_STORAGE_FILE = path.join(AppConfig.VMOBILE_DIR, 'ios_devices.json');

  private static loadVirtualDevices(): VirtualIOSRecord[] {
    if (!fs.existsSync(this.IOS_STORAGE_FILE)) {
      // Initialize with default demo/research virtual iPhone
      const initial: VirtualIOSRecord[] = [
        {
          id: 'ios-vm-1',
          name: 'iPhone 16 Pro (PCC Dev)',
          variant: 'developer',
          iosVersion: '18.2 (22C150)',
          cloudOSVersion: '1.2.0 (24A830)',
          cpuCount: 8,
          memoryMB: 8192,
          diskSizeBytes: 68719476736,
          udid: '00008130-00124D620E80001C',
          deviceModel: 'iPhone17,1',
          networkMode: 'nat',
          createdAt: Date.now(),
          status: 'stopped',
        },
      ];
      fs.writeFileSync(this.IOS_STORAGE_FILE, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }

    try {
      return JSON.parse(fs.readFileSync(this.IOS_STORAGE_FILE, 'utf8'));
    } catch {
      return [];
    }
  }

  private static saveVirtualDevices(records: VirtualIOSRecord[]) {
    fs.writeFileSync(this.IOS_STORAGE_FILE, JSON.stringify(records, null, 2), 'utf8');
  }

  public static async detectConnectedDevices(): Promise<Partial<DeviceReport>[]> {
    return new Promise((resolve) => {
      // Query Windows USB PnP for Apple Mobile Devices
      const cmd = `powershell -NoProfile -Command "Get-PnpDevice -Class 'USB' -Status OK -ErrorAction SilentlyContinue | Where-Object { $_.FriendlyName -match 'Apple|iPhone|iPad' } | Select-Object FriendlyName, InstanceId | ConvertTo-Json"`;
      exec(cmd, (error, stdout) => {
        if (error || !stdout.trim()) {
          resolve([]);
          return;
        }

        try {
          const parsed = JSON.parse(stdout);
          const list = Array.isArray(parsed) ? parsed : [parsed];
          const detected: Partial<DeviceReport>[] = list.map((item: any) => {
            const name = item.FriendlyName || 'Apple Device';
            const instanceId = item.InstanceId || '';
            const udid = instanceId.split('\\').pop() || 'USB-APPLE-DEVICE';
            return {
              id: `apple-usb-${udid}`,
              name,
              platform: 'ios',
              status: 'running',
              isPhysical: true,
              deviceModel: name,
              udid,
              osVersion: 'iOS 18.x',
              osBuild: 'Detected via USB',
              variant: 'stock',
              cpuCount: 6,
              memoryMB: 8192,
              diskSizeBytes: 128 * 1024 * 1024 * 1024,
              batteryLevel: 92,
              isCharging: true,
              developerMode: true,
              network: { mode: 'nat', ip: '127.0.0.1' },
              display: { width: 1179, height: 2556, dpi: 460 },
              bundlePath: 'Physical USB Connection',
            };
          });
          resolve(detected);
        } catch {
          resolve([]);
        }
      });
    });
  }

  public static listVirtualDevices(): VirtualIOSRecord[] {
    return this.loadVirtualDevices();
  }

  public static createVirtualDevice(opts: CreateDeviceRequest): VirtualIOSRecord {
    const list = this.loadVirtualDevices();
    if (list.some((d) => d.name.toLowerCase() === opts.name.toLowerCase())) {
      throw new Error(`Device '${opts.name}' already exists.`);
    }

    const newRecord: VirtualIOSRecord = {
      id: `ios-vm-${Date.now()}`,
      name: opts.name,
      variant: opts.variant || 'regular',
      iosVersion: opts.osVersion || '18.2 (22C150)',
      cloudOSVersion: '1.2.0 (24A830)',
      cpuCount: opts.cpuCount || 8,
      memoryMB: opts.memoryMB || 8192,
      diskSizeBytes: (opts.diskGB || 64) * 1024 * 1024 * 1024,
      udid: `00008130-${Math.random().toString(16).substring(2, 10).toUpperCase()}`,
      deviceModel: opts.presetModel || 'iPhone16,1 (iPhone 15 Pro)',
      networkMode: 'nat',
      createdAt: Date.now(),
      status: 'stopped',
    };

    list.push(newRecord);
    this.saveVirtualDevices(list);
    return newRecord;
  }

  public static updateConfig(name: string, config: UpdateDeviceConfig) {
    const list = this.loadVirtualDevices();
    const item = list.find((d) => d.name === name);
    if (!item) throw new Error(`iOS Device '${name}' not found.`);

    if (config.cpuCount) item.cpuCount = config.cpuCount;
    if (config.memoryMB) item.memoryMB = config.memoryMB;
    if (config.networkMode) item.networkMode = config.networkMode;

    this.saveVirtualDevices(list);
  }

  public static startDevice(name: string): boolean {
    const list = this.loadVirtualDevices();
    const item = list.find((d) => d.name === name);
    if (!item) throw new Error(`iOS Device '${name}' not found.`);
    item.status = 'running';
    this.saveVirtualDevices(list);
    return true;
  }

  public static stopDevice(name: string): boolean {
    const list = this.loadVirtualDevices();
    const item = list.find((d) => d.name === name);
    if (!item) throw new Error(`iOS Device '${name}' not found.`);
    item.status = 'stopped';
    this.saveVirtualDevices(list);
    return true;
  }

  public static deleteDevice(name: string) {
    const list = this.loadVirtualDevices().filter((d) => d.name !== name);
    this.saveVirtualDevices(list);
  }

  public static cloneDevice(name: string, newName: string) {
    const list = this.loadVirtualDevices();
    const item = list.find((d) => d.name === name);
    if (!item) throw new Error(`Source iOS Device '${name}' not found.`);
    if (list.some((d) => d.name.toLowerCase() === newName.toLowerCase())) {
      throw new Error(`Device '${newName}' already exists.`);
    }

    const cloned: VirtualIOSRecord = {
      ...item,
      id: `ios-vm-${Date.now()}`,
      name: newName,
      udid: `00008130-${Math.random().toString(16).substring(2, 10).toUpperCase()}`,
      status: 'stopped',
      createdAt: Date.now(),
    };

    list.push(cloned);
    this.saveVirtualDevices(list);
  }

  public static renameDevice(name: string, newName: string) {
    const list = this.loadVirtualDevices();
    const item = list.find((d) => d.name === name);
    if (!item) throw new Error(`Device '${name}' not found.`);
    if (list.some((d) => d.name.toLowerCase() === newName.toLowerCase() && d.name !== name)) {
      throw new Error(`Device '${newName}' already exists.`);
    }

    item.name = newName;
    this.saveVirtualDevices(list);
  }
}
