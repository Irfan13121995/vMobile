import os from 'os';
import { exec } from 'child_process';
import { AppConfig } from '../config.js';
import { HostCheck } from '../../shared/types.js';
import { AdbClient } from '../android/adb-client.js';
import { SystemImageDownloader } from '../android/system-image-downloader.js';
import { WSLKvmManager } from '../ios/wsl-kvm-manager.js';

export class HostReadiness {
  public static async runAll(): Promise<HostCheck[]> {
    const checks: HostCheck[] = [];

    // 1. Windows 11 OS Check
    const release = os.release();
    const isWin = process.platform === 'win32';
    const build = parseInt(release.split('.').pop() || '0', 10);
    const win11Ok = isWin && (build >= 22000 || release.startsWith('10.0.2'));

    checks.push({
      id: 'os-windows11',
      title: win11Ok ? 'Windows 11 detected' : 'Windows 10 / Legacy OS',
      status: win11Ok ? 'ok' : 'attention',
      detail: `Windows NT ${release} (Build ${build}) — WHPX hypervisor and modern display pipeline supported.`,
      fixCommand: win11Ok ? undefined : 'Upgrade to Windows 11 Build 22000 or newer for full virtualization features.',
    });

    // 2. Hardware Acceleration / WHPX
    const accelCheck = await this.checkWHPX();
    checks.push(accelCheck);

    // 3. Android SDK & Platform Tools (adb)
    const adbPath = AppConfig.getAdbPath();
    const adbRes = await AdbClient.execute(['version']);
    const adbOk = adbRes.exitCode === 0;

    checks.push({
      id: 'adb',
      title: adbOk ? 'Android Platform Tools (ADB) ready' : 'ADB not found',
      status: adbOk ? 'ok' : 'attention',
      detail: adbOk
        ? (adbRes.stdout.split('\n')[0] || 'ADB ready') + ` (${adbPath})`
        : 'adb.exe not found on PATH or in Android SDK.',
      fixCommand: adbOk ? undefined : 'winget install Google.PlatformTools',
    });

    // 4. Android SDK Emulator
    const emulatorPath = AppConfig.getEmulatorPath();
    const emulatorCheckPath = AppConfig.getEmulatorCheckPath();
    const emulatorOk = emulatorCheckPath !== null;

    checks.push({
      id: 'emulator',
      title: emulatorOk ? 'Android SDK Emulator installed' : 'Android SDK Emulator not found',
      status: emulatorOk ? 'ok' : 'attention',
      detail: emulatorOk ? emulatorPath : 'emulator.exe not located in standard Android SDK path.',
      fixCommand: emulatorOk ? undefined : 'Install Android SDK Command-line Tools and Emulator via Android Studio.',
    });

    // 5. Complete Android 15 OS System Image Check
    const sysImgOk = SystemImageDownloader.isSystemImageInstalled();
    checks.push({
      id: 'android-sysimg',
      title: sysImgOk ? 'Android 15 OS System Image installed' : 'Android 15 OS Image needed for full emulator.exe boot',
      status: sysImgOk ? 'ok' : 'attention',
      detail: sysImgOk
        ? 'Complete Android 15 system image (system.img, kernel-ranchu, vendor.img) ready for WHPX.'
        : 'Missing boot partitions in Sdk/system-images. Required for native emulator.exe. You can download the official 746MB image directly.',
      fixCommand: sysImgOk ? undefined : 'npm run cli -- download-image',
    });

    // 6. iOS Strategy 1: Local WSL2 Docker-OSX KVM Virtualization
    const kvmStatus = await WSLKvmManager.getStatus();
    const kvmReady = kvmStatus.wslInstalled && kvmStatus.dockerInstalled;
    checks.push({
      id: 'ios-wsl-kvm',
      title: kvmReady ? 'iOS Virtualization Engine (WSL2 & Docker) ready' : 'iOS Virtualization Engine (WSL2 KVM / Docker)',
      status: kvmReady ? 'ok' : 'attention',
      detail: kvmReady
        ? `WSL2 active with Docker Desktop. Ready to run local iOS Virtual Machines (KVM accelerated).`
        : `WSL2: ${kvmStatus.wslInstalled ? 'Found' : 'Not installed'}; Docker: ${kvmStatus.dockerInstalled ? 'Found' : 'Not installed'}. Required for local iOS VM execution.`,
      fixCommand: kvmReady ? undefined : 'winget install Docker.DockerDesktop',
    });

    // 7. Display Mirror Engine
    const scrcpy = AppConfig.getScrcpyPath();
    const scrcpyOk = scrcpy !== null;
    checks.push({
      id: 'display-engine',
      title: scrcpyOk ? 'Hardware Display Mirror (scrcpy) available' : 'Built-in Canvas Mirror active (scrcpy optional)',
      status: 'ok',
      detail: scrcpyOk
        ? `Hardware-accelerated 60fps mirror found at ${scrcpy}`
        : 'Using embedded high-speed interactive Canvas screencap mirror. You can also install scrcpy for external 60fps window.',
      fixCommand: scrcpyOk ? undefined : 'winget install Genymobile.scrcpy',
    });

    // 8. Apple Mobile Device Support / usbmuxd
    const usbmuxOk = await this.checkUsbmux();
    checks.push({
      id: 'apple-usbmux',
      title: usbmuxOk ? 'Apple Mobile Device Support / usbmux active' : 'Apple usbmuxd not running (iOS USB bridge)',
      status: usbmuxOk ? 'ok' : 'attention',
      detail: usbmuxOk
        ? 'Apple Mobile Device USB daemon is accessible for physical iOS diagnostics.'
        : 'usbmuxd port 27015 is inactive. Required for physical iPhone/iPad USB tethering and diagnostics on Windows.',
      fixCommand: usbmuxOk ? undefined : 'winget install Apple.iTunes',
    });

    return checks;
  }

  private static checkWHPX(): Promise<HostCheck> {
    return new Promise((resolve) => {
      const checkExe = AppConfig.getEmulatorCheckPath();
      if (!checkExe) {
        resolve({
          id: 'whpx',
          title: 'Hypervisor acceleration',
          status: 'attention',
          detail: 'emulator-check.exe not found in SDK.',
          fixCommand: 'Enable "Windows Hypervisor Platform" in Windows Features.',
        });
        return;
      }

      exec(`"${checkExe}" accel`, (err, stdout) => {
        const out = stdout || '';
        const ok = out.includes('WHPX') && out.includes('usable');
        resolve({
          id: 'whpx',
          title: ok ? 'Windows Hypervisor Platform (WHPX) active' : 'Hypervisor acceleration needs attention',
          status: ok ? 'ok' : 'attention',
          detail: ok ? 'WHPX is installed and usable for hardware-accelerated guest execution.' : out.trim() || 'Acceleration check failed.',
          fixCommand: ok ? undefined : 'Enable-WindowsOptionalFeature -Online -FeatureName HypervisorPlatform',
        });
      });
    });
  }

  private static checkUsbmux(): Promise<boolean> {
    return new Promise((resolve) => {
      const cmd = `powershell -NoProfile -Command "Test-NetConnection -ComputerName 127.0.0.1 -Port 27015 -WarningAction SilentlyContinue | Select-Object -ExpandProperty TcpTestSucceeded"`;
      exec(cmd, { timeout: 3000 }, (error, stdout) => {
        resolve(stdout.trim().toLowerCase() === 'true');
      });
    });
  }
}
