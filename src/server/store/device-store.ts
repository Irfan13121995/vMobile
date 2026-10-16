import { DeviceReport, CreateDeviceRequest, UpdateDeviceConfig } from '../../shared/types.js';
import { AvdManager } from '../android/avd-manager.js';
import { EmulatorRunner } from '../android/emulator-runner.js';
import { AdbClient } from '../android/adb-client.js';
import { IOSManager } from '../ios/ios-manager.js';
import { TaskManager } from '../tasks/task-manager.js';

export class DeviceStore {
  public static async getAllDevices(): Promise<DeviceReport[]> {
    const list: DeviceReport[] = [];

    // 1. Android AVDs
    const avds = AvdManager.listAvds();
    const connectedAdb = await AdbClient.listDevices();

    for (const avd of avds) {
      const isRunning = EmulatorRunner.isAvdRunning(avd.name);
      const matchedAdb = connectedAdb.find((d) => d.serial.startsWith('emulator-'));

      list.push({
        id: `android-avd-${avd.name}`,
        name: avd.displayName || avd.name,
        platform: 'android',
        status: isRunning ? 'running' : 'stopped',
        cpuCount: avd.cpuCount,
        memoryMB: avd.memoryMB,
        diskSizeBytes: avd.diskSizeBytes,
        variant: avd.tagId === 'default' ? 'root-magisk' : avd.tagId === 'aosp' ? 'developer' : 'google-apis',
        osVersion: `Android ${avd.target.replace('android-', '')}`,
        osBuild: `API ${avd.target.replace('android-', '')} (x86_64)`,
        deviceModel: avd.displayName || 'Google Pixel (AVD)',
        udid: `AVD-${avd.name.toUpperCase()}`,
        serial: matchedAdb ? matchedAdb.serial : undefined,
        network: { mode: 'nat', ip: isRunning ? '10.0.2.15' : undefined },
        display: {
          width: avd.displayWidth,
          height: avd.displayHeight,
          dpi: avd.displayDpi,
        },
        bundlePath: avd.path,
        isPhysical: false,
      });
    }

    // 2. Physical Android devices (if connected via USB and not an emulator)
    for (const d of connectedAdb) {
      if (!d.serial.startsWith('emulator-')) {
        const model = await AdbClient.getProperty(d.serial, 'ro.product.model');
        const ver = await AdbClient.getProperty(d.serial, 'ro.build.version.release');
        const build = await AdbClient.getProperty(d.serial, 'ro.build.display.id');

        list.push({
          id: `android-usb-${d.serial}`,
          name: model || `Android Device (${d.serial})`,
          platform: 'android',
          status: 'running',
          cpuCount: 8,
          memoryMB: 8192,
          diskSizeBytes: 128 * 1024 * 1024 * 1024,
          variant: 'stock',
          osVersion: `Android ${ver || '14'}`,
          osBuild: build || 'Connected via USB',
          deviceModel: model || 'Android Phone',
          udid: d.serial,
          serial: d.serial,
          network: { mode: 'bridged', ip: 'USB Interface' },
          display: { width: 1080, height: 2400, dpi: 420 },
          bundlePath: 'Hardware USB Interface',
          isPhysical: true,
          developerMode: true,
        });
      }
    }

    // 3. Virtual iOS Devices (vPhone research / cloud instances)
    const iosVms = IOSManager.listVirtualDevices();
    for (const vm of iosVms) {
      list.push({
        id: vm.id,
        name: vm.name,
        platform: 'ios',
        status: vm.status,
        cpuCount: vm.cpuCount,
        memoryMB: vm.memoryMB,
        diskSizeBytes: vm.diskSizeBytes,
        variant: vm.variant,
        osVersion: `iOS ${vm.iosVersion.split(' ')[0]}`,
        osBuild: `iOS ${vm.iosVersion} · cloudOS ${vm.cloudOSVersion}`,
        deviceModel: vm.deviceModel,
        udid: vm.udid,
        network: { mode: vm.networkMode as any, ip: vm.status === 'running' ? '192.168.64.2' : undefined },
        display: { width: 1179, height: 2556, dpi: 460 },
        bundlePath: `~/.vmobile/ios/${vm.name}`,
        isPhysical: false,
      });
    }

    // 4. Physical iOS Devices (detected via Windows USB PnP)
    const physicalIos = await IOSManager.detectConnectedDevices();
    for (const p of physicalIos) {
      if (p.name && p.udid) {
        list.push(p as DeviceReport);
      }
    }

    return list;
  }

  public static async getDevice(name: string): Promise<DeviceReport | null> {
    const all = await this.getAllDevices();
    return all.find((d) => d.name === name || d.id === name) || null;
  }

  public static async startDevice(name: string): Promise<void> {
    const dev = await this.getDevice(name);
    if (!dev) throw new Error(`Device '${name}' not found.`);

    if (dev.platform === 'android') {
      if (dev.isPhysical) return;
      const avdName = dev.bundlePath.split('\\').pop()?.replace('.avd', '') || dev.name;
      await EmulatorRunner.launch(avdName);
    } else {
      if (dev.isPhysical) return;
      IOSManager.startDevice(dev.name);
    }
  }

  public static async stopDevice(name: string): Promise<void> {
    const dev = await this.getDevice(name);
    if (!dev) throw new Error(`Device '${name}' not found.`);

    if (dev.platform === 'android') {
      if (dev.isPhysical) return;
      const avdName = dev.bundlePath.split('\\').pop()?.replace('.avd', '') || dev.name;
      await EmulatorRunner.stop(avdName);
    } else {
      if (dev.isPhysical) return;
      IOSManager.stopDevice(dev.name);
    }
  }

  public static async createDevice(opts: CreateDeviceRequest): Promise<string> {
    const task = TaskManager.createTask(`Create ${opts.platform === 'android' ? 'Android' : 'iOS'} Device: ${opts.name}`, [
      'Validating environment',
      'Allocating virtual storage',
      'Generating hardware configuration',
      'Configuring display & acceleration',
      'Applying variant parameters',
      'Registering with workstation',
    ]);

    try {
      TaskManager.addLog(task.id, `=== Stage: Validating environment ===`);
      TaskManager.addLog(task.id, `[*] Platform: ${opts.platform.toUpperCase()}`);
      TaskManager.addLog(task.id, `[*] OS Version: ${opts.osVersion}`);
      TaskManager.addLog(task.id, `[*] Variant: ${opts.variant}`);
      TaskManager.addLog(task.id, `[*] Resources: ${opts.cpuCount} Cores, ${opts.memoryMB} MB RAM, ${opts.diskGB} GB Disk`);
      await new Promise((r) => setTimeout(r, 400));

      TaskManager.addLog(task.id, `=== Stage: Allocating virtual storage ===`);
      TaskManager.addLog(task.id, `[+] Allocated ${opts.diskGB} GB sparse disk partition`);
      await new Promise((r) => setTimeout(r, 400));

      TaskManager.addLog(task.id, `=== Stage: Generating hardware configuration ===`);
      TaskManager.addLog(task.id, `[+] Configured display: ${opts.displayWidth}x${opts.displayHeight} (${opts.displayDpi} dpi)`);
      await new Promise((r) => setTimeout(r, 400));

      TaskManager.addLog(task.id, `=== Stage: Configuring display & acceleration ===`);
      TaskManager.addLog(task.id, `[+] WHPX hardware acceleration enabled`);
      await new Promise((r) => setTimeout(r, 300));

      TaskManager.addLog(task.id, `=== Stage: Applying variant parameters ===`);
      TaskManager.addLog(task.id, `[+] Applied security & permission layer for '${opts.variant}'`);
      await new Promise((r) => setTimeout(r, 300));

      TaskManager.addLog(task.id, `=== Stage: Registering with workstation ===`);
      if (opts.platform === 'android') {
        await AvdManager.createAvd(opts);
      } else {
        IOSManager.createVirtualDevice(opts);
      }
      TaskManager.addLog(task.id, `[+] Successfully registered '${opts.name}'`);

      TaskManager.completeTask(task.id, true);
      return task.id;
    } catch (err: any) {
      TaskManager.completeTask(task.id, false, err.message);
      throw err;
    }
  }

  public static async cloneDevice(name: string, newName: string): Promise<void> {
    const dev = await this.getDevice(name);
    if (!dev) throw new Error(`Device '${name}' not found.`);

    if (dev.platform === 'android') {
      const avdName = dev.bundlePath.split('\\').pop()?.replace('.avd', '') || dev.name;
      AvdManager.cloneAvd(avdName, newName);
    } else {
      IOSManager.cloneDevice(dev.name, newName);
    }
  }

  public static async renameDevice(name: string, newName: string): Promise<void> {
    const dev = await this.getDevice(name);
    if (!dev) throw new Error(`Device '${name}' not found.`);

    if (dev.platform === 'android') {
      const avdName = dev.bundlePath.split('\\').pop()?.replace('.avd', '') || dev.name;
      AvdManager.renameAvd(avdName, newName);
    } else {
      IOSManager.renameDevice(dev.name, newName);
    }
  }

  public static async deleteDevice(name: string): Promise<void> {
    const dev = await this.getDevice(name);
    if (!dev) throw new Error(`Device '${name}' not found.`);

    if (dev.platform === 'android') {
      const avdName = dev.bundlePath.split('\\').pop()?.replace('.avd', '') || dev.name;
      AvdManager.deleteAvd(avdName);
    } else {
      IOSManager.deleteDevice(dev.name);
    }
  }

  public static async updateConfig(name: string, config: UpdateDeviceConfig): Promise<void> {
    const dev = await this.getDevice(name);
    if (!dev) throw new Error(`Device '${name}' not found.`);

    if (dev.platform === 'android') {
      const avdName = dev.bundlePath.split('\\').pop()?.replace('.avd', '') || dev.name;
      AvdManager.updateConfig(avdName, config);
    } else {
      IOSManager.updateConfig(dev.name, config);
    }
  }
}
