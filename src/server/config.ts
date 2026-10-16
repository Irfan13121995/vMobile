import path from 'path';
import os from 'os';
import fs from 'fs';

export class AppConfig {
  public static readonly PORT = Number(process.env.PORT || 5995);
  public static readonly USER_HOME = os.homedir();
  public static readonly VMOBILE_DIR = path.join(AppConfig.USER_HOME, '.vmobile');
  public static readonly VMOBILE_DEVICES_FILE = path.join(AppConfig.VMOBILE_DIR, 'devices.json');
  public static readonly ANDROID_AVD_DIR = path.join(AppConfig.USER_HOME, '.android', 'avd');

  // Search candidate paths for Android SDK
  public static getAndroidSdkPath(): string | null {
    const candidates = [
      process.env.ANDROID_HOME,
      process.env.ANDROID_SDK_ROOT,
      path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk'),
      path.join(AppConfig.USER_HOME, 'AppData', 'Local', 'Android', 'Sdk'),
      'C:\\Android\\sdk',
      'D:\\Android\\sdk',
    ].filter(Boolean) as string[];

    for (const c of candidates) {
      if (fs.existsSync(c) && fs.existsSync(path.join(c, 'platform-tools', 'adb.exe'))) {
        return c;
      }
    }
    return null;
  }

  public static getAdbPath(): string {
    const sdk = this.getAndroidSdkPath();
    if (sdk) {
      const candidate = path.join(sdk, 'platform-tools', 'adb.exe');
      if (fs.existsSync(candidate)) return candidate;
    }
    return 'adb';
  }

  public static getEmulatorPath(): string {
    const sdk = this.getAndroidSdkPath();
    if (sdk) {
      const candidate = path.join(sdk, 'emulator', 'emulator.exe');
      if (fs.existsSync(candidate)) return candidate;
    }
    return 'emulator';
  }

  public static getEmulatorCheckPath(): string | null {
    const sdk = this.getAndroidSdkPath();
    if (sdk) {
      const candidate = path.join(sdk, 'emulator', 'emulator-check.exe');
      if (fs.existsSync(candidate)) return candidate;
    }
    return null;
  }

  public static getScrcpyPath(): string | null {
    const candidates = [
      'scrcpy',
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'scrcpy', 'scrcpy.exe'),
      path.join(AppConfig.USER_HOME, 'scoop', 'apps', 'scrcpy', 'current', 'scrcpy.exe'),
      'C:\\ProgramData\\chocolatey\\bin\\scrcpy.exe',
      'C:\\Program Files\\scrcpy\\scrcpy.exe',
    ];

    for (const c of candidates) {
      if (c === 'scrcpy') continue;
      if (fs.existsSync(c)) return c;
    }
    return null;
  }

  public static initWorkspace() {
    if (!fs.existsSync(this.VMOBILE_DIR)) {
      fs.mkdirSync(this.VMOBILE_DIR, { recursive: true });
    }
    if (!fs.existsSync(this.ANDROID_AVD_DIR)) {
      fs.mkdirSync(this.ANDROID_AVD_DIR, { recursive: true });
    }
  }
}
