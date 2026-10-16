import { DeviceStore } from '../server/store/device-store.js';
import { HostReadiness } from '../server/host/readiness.js';
import { AppConfig } from '../server/config.js';

AppConfig.initWorkspace();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'list';

  switch (command) {
    case 'list': {
      const isJson = args.includes('--json');
      const devices = await DeviceStore.getAllDevices();
      if (isJson) {
        console.log(JSON.stringify(devices, null, 2));
      } else {
        console.log(`\nvMobile Workstation — Mobile Device Library (${devices.length} devices)`);
        console.log('='.repeat(80));
        for (const d of devices) {
          const statusDot = d.status === 'running' ? '\x1b[32m● RUNNING\x1b[0m' : '\x1b[90m○ STOPPED\x1b[0m';
          const platformTag = d.platform === 'android' ? '\x1b[32m[Android]\x1b[0m' : '\x1b[36m[iOS]\x1b[0m';
          console.log(`${platformTag} ${d.name.padEnd(28)} ${statusDot.padEnd(20)} ${d.osVersion} (${d.variant})`);
        }
        console.log('='.repeat(80));
      }
      break;
    }

    case 'info': {
      const name = args[1];
      if (!name) {
        console.error('Usage: vmobile info <name> [--json]');
        process.exit(1);
      }
      const dev = await DeviceStore.getDevice(name);
      if (!dev) {
        console.error(`Device '${name}' not found.`);
        process.exit(1);
      }
      if (args.includes('--json')) {
        console.log(JSON.stringify(dev, null, 2));
      } else {
        console.log(`\nDevice: ${dev.name} [${dev.platform.toUpperCase()}]`);
        console.log(`Status:      ${dev.status}`);
        console.log(`OS:          ${dev.osVersion} (${dev.osBuild})`);
        console.log(`Variant:     ${dev.variant}`);
        console.log(`CPU Cores:   ${dev.cpuCount}`);
        console.log(`Memory:      ${dev.memoryMB} MB`);
        console.log(`Storage:     ${(dev.diskSizeBytes / 1073741824).toFixed(0)} GB`);
        console.log(`Display:     ${dev.display.width}x${dev.display.height} (${dev.display.dpi} dpi)`);
        console.log(`UDID:        ${dev.udid}`);
        console.log(`Bundle Path: ${dev.bundlePath}\n`);
      }
      break;
    }

    case 'start': {
      const name = args[1];
      if (!name) {
        console.error('Usage: vmobile start <name>');
        process.exit(1);
      }
      console.log(`[*] Starting ${name}...`);
      await DeviceStore.startDevice(name);
      console.log(`[+] Started ${name}`);
      break;
    }

    case 'stop': {
      const name = args[1];
      if (!name) {
        console.error('Usage: vmobile stop <name>');
        process.exit(1);
      }
      console.log(`[*] Stopping ${name}...`);
      await DeviceStore.stopDevice(name);
      console.log(`[+] Stopped ${name}`);
      break;
    }

    case 'readiness': {
      console.log('\nChecking Windows 11 Host Readiness for Android & iOS...');
      const checks = await HostReadiness.runAll();
      for (const c of checks) {
        const icon = c.status === 'ok' ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[33m[WARN]\x1b[0m';
        console.log(`${icon} ${c.title}`);
        console.log(`       ${c.detail}`);
        if (c.fixCommand) {
          console.log(`       Fix: \x1b[36m${c.fixCommand}\x1b[0m`);
        }
      }
      console.log('');
      break;
    }

    case 'help':
    default: {
      console.log(`
vMobile CLI (Windows 11 Workstation)
Usage:
  vmobile list [--json]
  vmobile info <name> [--json]
  vmobile start <name>
  vmobile stop <name>
  vmobile readiness
      `);
      break;
    }
  }
}

main().catch((err) => {
  console.error('[!] Error:', err.message);
  process.exit(1);
});
