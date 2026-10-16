import fs from 'fs';
import path from 'path';
import https from 'https';
import { exec } from 'child_process';
import { AppConfig } from '../config.js';
import { TaskManager } from '../tasks/task-manager.js';
import { AvdManager } from './avd-manager.js';

export class SystemImageDownloader {
  public static readonly ANDROID_15_URL = 'https://dl.google.com/android/repository/sys-img/android/x86_64-35_r02.zip';
  public static readonly TARGET_REL_PATH = path.join('system-images', 'android-35', 'default', 'x86_64');

  public static isSystemImageInstalled(): boolean {
    const sdk = AppConfig.getAndroidSdkPath();
    if (!sdk) return false;
    const dest = path.join(sdk, this.TARGET_REL_PATH);
    return fs.existsSync(dest) && fs.existsSync(path.join(dest, 'system.img'));
  }

  public static async installAndroid15Image(taskId?: string): Promise<string> {
    const sdk = AppConfig.getAndroidSdkPath();
    if (!sdk) throw new Error('Android SDK root path not found.');

    const activeTaskId = taskId || TaskManager.createTask('Download & Install Android 15 Complete OS Image', [
      'Validating SDK destination',
      'Downloading Android 15 OS (746 MB)',
      'Extracting system partitions & kernel',
      'Configuring AVD hardware pointers',
      'Ready for WHPX execution',
    ]).id;

    const destDir = path.join(sdk, this.TARGET_REL_PATH);
    const tempZip = path.join(AppConfig.VMOBILE_DIR, 'android-15-sysimg.zip');

    try {
      TaskManager.addLog(activeTaskId, '=== Stage: Validating SDK destination ===');
      TaskManager.addLog(activeTaskId, `[*] Destination: ${destDir}`);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      // Download
      TaskManager.addLog(activeTaskId, '=== Stage: Downloading Android 15 OS (746 MB) ===');
      TaskManager.addLog(activeTaskId, `[*] Fetching from Google repository: ${this.ANDROID_15_URL}`);
      
      await this.downloadFile(this.ANDROID_15_URL, tempZip, (pct, mb, totalMb) => {
        if (pct % 15 === 0) {
          TaskManager.addLog(activeTaskId, `[*] Downloaded ${mb.toFixed(1)} MB / ${totalMb.toFixed(1)} MB (${pct}%)`);
        }
      });

      // Extract
      TaskManager.addLog(activeTaskId, '=== Stage: Extracting system partitions & kernel ===');
      TaskManager.addLog(activeTaskId, '[*] Unpacking system.img, vendor.img, kernel-ranchu, and ramdisk.img...');
      
      await this.unzip(tempZip, destDir);
      TaskManager.addLog(activeTaskId, '[+] Partitions extracted successfully.');

      // If zip contains a subfolder like 'x86_64', move files up if needed
      const nested = path.join(destDir, 'x86_64');
      if (fs.existsSync(nested) && fs.existsSync(path.join(nested, 'system.img'))) {
        const files = fs.readdirSync(nested);
        for (const f of files) {
          fs.renameSync(path.join(nested, f), path.join(destDir, f));
        }
        try { fs.rmdirSync(nested); } catch {}
      }

      // Clean up temp zip
      try {
        if (fs.existsSync(tempZip)) fs.unlinkSync(tempZip);
      } catch {}

      // Configure AVDs to use this image
      TaskManager.addLog(activeTaskId, '=== Stage: Configuring AVD hardware pointers ===');
      const avds = AvdManager.listAvds();
      for (const avd of avds) {
        const configPath = path.join(avd.path, 'config.ini');
        if (fs.existsSync(configPath)) {
          const cfg = AvdManager.parseIni(fs.readFileSync(configPath, 'utf8'));
          cfg['image.sysdir.1'] = `system-images\\android-35\\default\\x86_64\\`;
          cfg['tag.id'] = 'default';
          cfg['tag.display'] = 'Android 15 OS';
          cfg['abi.type'] = 'x86_64';
          cfg['hw.gpu.enabled'] = 'yes';
          cfg['hw.gpu.mode'] = 'auto';
          fs.writeFileSync(configPath, AvdManager.formatIni(cfg), 'utf8');
        }
      }

      TaskManager.addLog(activeTaskId, '=== Stage: Ready for WHPX execution ===');
      TaskManager.addLog(activeTaskId, '[+] Complete Android 15 OS installed and linked to virtual devices!');
      TaskManager.completeTask(activeTaskId, true);

      return destDir;
    } catch (err: any) {
      TaskManager.completeTask(activeTaskId, false, err.message);
      throw err;
    }
  }

  private static downloadFile(
    url: string,
    dest: string,
    onProgress: (pct: number, mb: number, totalMb: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest);

      const request = (targetUrl: string) => {
        https.get(targetUrl, (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return request(res.headers.location);
          }
          if (res.statusCode !== 200) {
            return reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          }

          const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
          const totalMb = totalBytes / (1024 * 1024);
          let downloaded = 0;
          let lastReportedPct = -1;

          res.on('data', (chunk) => {
            downloaded += chunk.length;
            file.write(chunk);
            if (totalBytes > 0) {
              const pct = Math.floor((downloaded / totalBytes) * 100);
              if (pct !== lastReportedPct && pct % 5 === 0) {
                lastReportedPct = pct;
                onProgress(pct, downloaded / (1024 * 1024), totalMb);
              }
            }
          });

          res.on('end', () => {
            file.end();
            resolve();
          });

          res.on('error', (err) => {
            file.close();
            reject(err);
          });
        }).on('error', reject);
      };

      request(url);
    });
  }

  private static unzip(zipPath: string, destDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const cmd = `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`;
      exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        resolve();
      });
    });
  }
}
