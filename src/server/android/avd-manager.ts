import fs from 'fs';
import path from 'path';
import { AppConfig } from '../config.js';
import { CreateDeviceRequest, DeviceReport, UpdateDeviceConfig } from '../../shared/types.js';

export interface AvdConfig {
  name: string;
  displayName?: string;
  path: string;
  target?: string;
  cpuCount: number;
  memoryMB: number;
  diskSizeBytes: number;
  displayWidth: number;
  displayHeight: number;
  displayDpi: number;
  tagId?: string;
  abi?: string;
  systemImage?: string;
}

export class AvdManager {
  public static parseIni(content: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        result[key] = val;
      }
    }
    return result;
  }

  public static formatIni(data: Record<string, string>): string {
    return Object.entries(data)
      .map(([k, v]) => `${k}=${v}`)
      .join('\r\n') + '\r\n';
  }

  public static listAvds(): AvdConfig[] {
    const avdDir = AppConfig.ANDROID_AVD_DIR;
    if (!fs.existsSync(avdDir)) return [];

    const files = fs.readdirSync(avdDir);
    const avds: AvdConfig[] = [];

    for (const file of files) {
      if (file.endsWith('.ini')) {
        const name = file.slice(0, -4);
        const iniPath = path.join(avdDir, file);
        try {
          const iniContent = fs.readFileSync(iniPath, 'utf8');
          const iniData = this.parseIni(iniContent);
          const avdFolderPath = iniData['path'] || path.join(avdDir, `${name}.avd`);

          if (fs.existsSync(avdFolderPath)) {
            const configIniPath = path.join(avdFolderPath, 'config.ini');
            let configData: Record<string, string> = {};
            if (fs.existsSync(configIniPath)) {
              configData = this.parseIni(fs.readFileSync(configIniPath, 'utf8'));
            }

            const cpu = Number(configData['hw.cpu.ncore'] || 4);
            const ram = Number(configData['hw.ramSize'] || 4096);
            let diskBytes = 32 * 1024 * 1024 * 1024;
            const diskRaw = configData['disk.dataPartition.size'];
            if (diskRaw) {
              if (diskRaw.endsWith('M') || diskRaw.endsWith('m')) {
                diskBytes = Number(diskRaw.slice(0, -1)) * 1024 * 1024;
              } else if (diskRaw.endsWith('G') || diskRaw.endsWith('g')) {
                diskBytes = Number(diskRaw.slice(0, -1)) * 1024 * 1024 * 1024;
              } else {
                diskBytes = Number(diskRaw);
              }
            }

            avds.push({
              name,
              displayName: configData['avd.ini.displayname'] || name,
              path: avdFolderPath,
              target: iniData['target'] || 'android-35',
              cpuCount: isNaN(cpu) ? 4 : cpu,
              memoryMB: isNaN(ram) ? 4096 : ram,
              diskSizeBytes: isNaN(diskBytes) ? 34359738368 : diskBytes,
              displayWidth: Number(configData['hw.lcd.width'] || 1080),
              displayHeight: Number(configData['hw.lcd.height'] || 2400),
              displayDpi: Number(configData['hw.lcd.density'] || 420),
              tagId: configData['tag.id'] || 'google_apis',
              abi: configData['abi.type'] || 'x86_64',
              systemImage: configData['image.sysdir.1'] || '',
            });
          }
        } catch {
          // ignore corrupted or unreadable AVD files
        }
      }
    }
    return avds;
  }

  public static async createAvd(opts: CreateDeviceRequest): Promise<string> {
    const avdDir = AppConfig.ANDROID_AVD_DIR;
    if (!fs.existsSync(avdDir)) fs.mkdirSync(avdDir, { recursive: true });

    const avdName = opts.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const avdFolderPath = path.join(avdDir, `${avdName}.avd`);
    const avdIniPath = path.join(avdDir, `${avdName}.ini`);

    if (fs.existsSync(avdIniPath) || fs.existsSync(avdFolderPath)) {
      throw new Error(`Device '${avdName}' already exists.`);
    }

    fs.mkdirSync(avdFolderPath, { recursive: true });

    // 1. Write main .ini
    const rootIni = {
      'avd.ini.encoding': 'UTF-8',
      'path': avdFolderPath,
      'path.rel': `avd/${avdName}.avd`,
      'target': `android-${opts.osVersion.replace(/[^0-9]/g, '') || '35'}`,
    };
    fs.writeFileSync(avdIniPath, this.formatIni(rootIni), 'utf8');

    // 2. Write config.ini inside .avd
    const configIni: Record<string, string> = {
      'avd.ini.displayname': opts.name,
      'hw.cpu.arch': 'x86_64',
      'hw.cpu.ncore': opts.cpuCount.toString(),
      'hw.ramSize': opts.memoryMB.toString(),
      'disk.dataPartition.size': `${opts.diskGB}G`,
      'hw.lcd.width': opts.displayWidth.toString(),
      'hw.lcd.height': opts.displayHeight.toString(),
      'hw.lcd.density': opts.displayDpi.toString(),
      'hw.keyboard': 'yes',
      'hw.keyboard.lid': 'no',
      'hw.gpu.enabled': 'yes',
      'hw.gpu.mode': 'auto',
      'hw.dPad': 'no',
      'hw.mainKeys': 'no',
      'hw.trackBall': 'no',
      'hw.camera.back': 'virtualscene',
      'hw.camera.front': 'emulated',
      'hw.audioInput': 'yes',
      'hw.audioOutput': 'yes',
      'hw.battery': 'yes',
      'hw.accelerometer': 'yes',
      'hw.sensors.proximity': 'yes',
      'hw.sensors.magnetic_field': 'yes',
      'hw.sensors.orientation': 'yes',
      'hw.sensors.temperature': 'yes',
      'tag.id': opts.variant === 'root-magisk' ? 'default' : opts.variant === 'developer' ? 'aosp' : 'google_apis',
      'tag.display': opts.variant === 'root-magisk' ? 'Rooted / Magisk' : 'Google Play / APIs',
      'abi.type': 'x86_64',
      'vm.heapSize': '512',
      'image.sysdir.1': 'system-images\\android-35\\default\\x86_64\\',
    };

    fs.writeFileSync(path.join(avdFolderPath, 'config.ini'), this.formatIni(configIni), 'utf8');

    // 3. Create dummy userdata image so emulator recognizes empty data storage
    const userdataPath = path.join(avdFolderPath, 'userdata.img');
    if (!fs.existsSync(userdataPath)) {
      fs.writeFileSync(userdataPath, Buffer.alloc(0));
    }

    return avdFolderPath;
  }

  public static updateConfig(name: string, config: UpdateDeviceConfig) {
    const avdDir = AppConfig.ANDROID_AVD_DIR;
    const avdFolderPath = path.join(avdDir, `${name}.avd`);
    const configPath = path.join(avdFolderPath, 'config.ini');

    if (!fs.existsSync(configPath)) {
      throw new Error(`AVD ${name} config.ini not found.`);
    }

    const current = this.parseIni(fs.readFileSync(configPath, 'utf8'));
    if (config.cpuCount) current['hw.cpu.ncore'] = config.cpuCount.toString();
    if (config.memoryMB) current['hw.ramSize'] = config.memoryMB.toString();
    if (config.displayDpi) current['hw.lcd.density'] = config.displayDpi.toString();

    fs.writeFileSync(configPath, this.formatIni(current), 'utf8');
  }

  public static deleteAvd(name: string) {
    const avdDir = AppConfig.ANDROID_AVD_DIR;
    const avdIni = path.join(avdDir, `${name}.ini`);
    const avdFolder = path.join(avdDir, `${name}.avd`);

    if (fs.existsSync(avdIni)) fs.unlinkSync(avdIni);
    if (fs.existsSync(avdFolder)) fs.rmSync(avdFolder, { recursive: true, force: true });
  }

  public static cloneAvd(name: string, newName: string) {
    const avdDir = AppConfig.ANDROID_AVD_DIR;
    const srcIni = path.join(avdDir, `${name}.ini`);
    const srcFolder = path.join(avdDir, `${name}.avd`);
    const destIni = path.join(avdDir, `${newName}.ini`);
    const destFolder = path.join(avdDir, `${newName}.avd`);

    if (!fs.existsSync(srcFolder)) throw new Error(`Source AVD '${name}' not found.`);
    if (fs.existsSync(destFolder)) throw new Error(`Target AVD '${newName}' already exists.`);

    // Copy folder
    fs.cpSync(srcFolder, destFolder, { recursive: true });

    // Update root ini
    const iniData = fs.existsSync(srcIni) ? this.parseIni(fs.readFileSync(srcIni, 'utf8')) : {};
    iniData['path'] = destFolder;
    iniData['path.rel'] = `avd/${newName}.avd`;
    fs.writeFileSync(destIni, this.formatIni(iniData), 'utf8');

    // Update config.ini displayName
    const configPath = path.join(destFolder, 'config.ini');
    if (fs.existsSync(configPath)) {
      const cfg = this.parseIni(fs.readFileSync(configPath, 'utf8'));
      cfg['avd.ini.displayname'] = newName;
      fs.writeFileSync(configPath, this.formatIni(cfg), 'utf8');
    }
  }

  public static renameAvd(name: string, newName: string) {
    this.cloneAvd(name, newName);
    this.deleteAvd(name);
  }
}
