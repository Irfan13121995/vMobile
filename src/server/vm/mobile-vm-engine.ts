import fs from 'fs';
import path from 'path';
import { DeviceReport, Platform } from '../../shared/types.js';
import { AppConfig } from '../config.js';

export interface VMRuntimeState {
  name: string;
  platform: Platform;
  osVersion: string;
  variant: string;
  status: 'booting' | 'running' | 'stopped';
  bootProgress: number; // 0 to 100
  screen: 'home' | 'settings' | 'browser' | 'terminal' | 'store' | 'locked' | 'recents';
  battery: number;
  isCharging: boolean;
  activeInputText?: string;
  startedAt: number;
}

export class MobileVMEngine {
  private static activeVMs = new Map<string, VMRuntimeState>();
  private static readonly RUNNING_VMS_FILE = path.join(AppConfig.VMOBILE_DIR, 'running_vms.json');

  private static loadRunningNames(): Set<string> {
    try {
      if (fs.existsSync(this.RUNNING_VMS_FILE)) {
        const raw = JSON.parse(fs.readFileSync(this.RUNNING_VMS_FILE, 'utf8'));
        return new Set(Array.isArray(raw) ? raw : []);
      }
    } catch {
      // ignore
    }
    return new Set();
  }

  private static saveRunningNames(names: Set<string>) {
    try {
      fs.writeFileSync(this.RUNNING_VMS_FILE, JSON.stringify(Array.from(names), null, 2), 'utf8');
    } catch {
      // ignore
    }
  }

  public static isRunning(deviceName: string): boolean {
    const running = this.loadRunningNames();
    if (running.has(deviceName)) return true;
    const vm = this.activeVMs.get(deviceName);
    return vm !== undefined && vm.status !== 'stopped';
  }

  public static getVM(deviceName: string): VMRuntimeState | undefined {
    let vm = this.activeVMs.get(deviceName);
    if (!vm && this.loadRunningNames().has(deviceName)) {
      vm = {
        name: deviceName,
        platform: deviceName.toLowerCase().includes('ios') || deviceName.toLowerCase().includes('iphone') ? 'ios' : 'android',
        osVersion: 'Latest',
        variant: 'Developer',
        status: 'running',
        bootProgress: 100,
        screen: 'home',
        battery: 95,
        isCharging: true,
        startedAt: Date.now(),
      };
      this.activeVMs.set(deviceName, vm);
    }
    return vm;
  }

  public static startVM(device: DeviceReport): VMRuntimeState {
    const running = this.loadRunningNames();
    running.add(device.name);
    this.saveRunningNames(running);

    const existing = this.activeVMs.get(device.name);
    if (existing && existing.status !== 'stopped') {
      return existing;
    }

    const state: VMRuntimeState = {
      name: device.name,
      platform: device.platform,
      osVersion: device.osVersion,
      variant: device.variant as string,
      status: 'booting',
      bootProgress: 15,
      screen: 'home',
      battery: 94,
      isCharging: true,
      startedAt: Date.now(),
    };

    this.activeVMs.set(device.name, state);

    // Smooth boot sequence (1.2 seconds)
    setTimeout(() => {
      if (this.activeVMs.get(device.name)) {
        state.bootProgress = 60;
      }
    }, 400);

    setTimeout(() => {
      if (this.activeVMs.get(device.name)) {
        state.bootProgress = 100;
        state.status = 'running';
      }
    }, 900);

    return state;
  }

  public static stopVM(deviceName: string): boolean {
    const running = this.loadRunningNames();
    running.delete(deviceName);
    this.saveRunningNames(running);

    const vm = this.activeVMs.get(deviceName);
    if (vm) {
      vm.status = 'stopped';
      this.activeVMs.delete(deviceName);
      return true;
    }
    return false;
  }

  public static handleTap(deviceName: string, x: number, y: number, devW: number = 1080, devH: number = 2400) {
    const vm = this.getVM(deviceName);
    if (!vm || vm.status !== 'running') return;

    // Normalize coordinates 0..1
    const nx = Math.max(0, Math.min(1, x / devW));
    const ny = Math.max(0, Math.min(1, y / devH));

    if (vm.screen === 'locked') {
      // Tap anywhere or swipe to unlock
      vm.screen = 'home';
      return;
    }

    // Bottom Navigation Bar area (Android or iOS Home Indicator)
    if (ny > 0.94) {
      vm.screen = 'home';
      return;
    }

    // If on home screen, check app icons tap
    if (vm.screen === 'home') {
      // Row 1 (y: 0.28 to 0.40)
      if (ny > 0.26 && ny < 0.42) {
        if (nx < 0.28) vm.screen = 'settings';
        else if (nx < 0.52) vm.screen = 'browser';
        else if (nx < 0.76) vm.screen = 'terminal';
        else vm.screen = 'store';
        return;
      }

      // Row 2 (y: 0.44 to 0.58)
      if (ny > 0.44 && ny < 0.58) {
        if (nx < 0.3) vm.screen = 'browser';
        else if (nx < 0.6) vm.screen = 'settings';
        else vm.screen = 'terminal';
        return;
      }

      // Bottom Dock (y: 0.82 to 0.93)
      if (ny > 0.82 && ny < 0.93) {
        if (nx < 0.28) vm.screen = 'browser';
        else if (nx < 0.52) vm.screen = 'settings';
        else if (nx < 0.76) vm.screen = 'terminal';
        else vm.screen = 'store';
        return;
      }
    } else {
      // Inside an app: tap header back button (top left)
      if (ny < 0.12 && nx < 0.25) {
        vm.screen = 'home';
      }
    }
  }

  public static handleKey(deviceName: string, keyCode: number) {
    const vm = this.getVM(deviceName);
    if (!vm || vm.status !== 'running') return;

    switch (keyCode) {
      case 3: // Home
        vm.screen = 'home';
        break;
      case 4: // Back
        if (vm.screen !== 'home') vm.screen = 'home';
        break;
      case 187: // Recent Apps
        vm.screen = vm.screen === 'recents' ? 'home' : 'recents';
        break;
      case 26: // Power
        vm.screen = vm.screen === 'locked' ? 'home' : 'locked';
        break;
      case 24: // Volume Up
      case 25: // Volume Down
        break;
    }
  }

  public static handleText(deviceName: string, text: string) {
    const vm = this.getVM(deviceName);
    if (!vm || vm.status !== 'running') return;
    vm.activeInputText = (vm.activeInputText || '') + text;
  }

  public static renderScreenSVG(deviceName: string, dev: DeviceReport): string {
    const vm = this.getVM(deviceName);
    const isRunning = vm && vm.status === 'running';
    const isBooting = vm && vm.status === 'booting';
    const isIos = dev.platform === 'ios';

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    // 1. Off / Stopped Screen
    if (!isRunning && !isBooting) {
      return `
        <svg width="400" height="820" viewBox="0 0 400 820" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="820" fill="#0f1115"/>
          <circle cx="200" cy="380" r="36" fill="#1b1e24" stroke="#2b303a" stroke-width="2"/>
          <path d="M192 370 L214 380 L192 390 Z" fill="#5b9bff"/>
          <text x="200" y="445" fill="#e7eaef" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="16" font-weight="600" text-anchor="middle">${dev.name}</text>
          <text x="200" y="470" fill="#69727f" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="12" text-anchor="middle">Status: Stopped</text>
          <text x="200" y="500" fill="#5b9bff" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="12" text-anchor="middle">Click 'Start' above to boot</text>
        </svg>
      `;
    }

    // 2. Booting Screen
    if (isBooting) {
      const progress = vm?.bootProgress || 30;
      if (isIos) {
        return `
          <svg width="400" height="820" viewBox="0 0 400 820" xmlns="http://www.w3.org/2000/svg">
            <rect width="400" height="820" fill="#000000"/>
            <!-- Apple Logo -->
            <path d="M200 340 C210 325 220 330 220 330 C210 340 215 355 228 360 C223 372 217 385 208 385 C200 385 197 380 188 380 C180 380 175 385 168 385 C158 385 150 368 150 350 C150 330 162 320 175 320 C185 320 193 328 200 328 C207 328 213 320 225 320 C228 320 236 322 242 328" fill="#ffffff" transform="scale(0.8) translate(50, 80)"/>
            <!-- Progress Bar -->
            <rect x="130" y="460" width="140" height="4" rx="2" fill="#333333"/>
            <rect x="130" y="460" width="${(140 * progress) / 100}" height="4" rx="2" fill="#ffffff"/>
            <text x="200" y="500" fill="#888888" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" text-anchor="middle">Booting iOS 18.2 Kernel...</text>
          </svg>
        `;
      } else {
        return `
          <svg width="400" height="820" viewBox="0 0 400 820" xmlns="http://www.w3.org/2000/svg">
            <rect width="400" height="820" fill="#121316"/>
            <!-- Android Logo / Spinner -->
            <circle cx="200" cy="380" r="40" fill="none" stroke="#222" stroke-width="4"/>
            <circle cx="200" cy="380" r="40" fill="none" stroke="#3fb950" stroke-width="4" stroke-dasharray="80 160" transform="rotate(${progress * 3.6} 200 380)"/>
            <text x="200" y="450" fill="#3fb950" font-family="sans-serif" font-size="18" font-weight="700" text-anchor="middle">android</text>
            <text x="200" y="480" fill="#8a94a3" font-family="sans-serif" font-size="12" text-anchor="middle">Starting Android 15 (VanillaIceCream)...</text>
          </svg>
        `;
      }
    }

    // 3. Active Running Screen: iOS 18.2
    if (isIos) {
      if (vm.screen === 'settings') {
        return this.renderIosSettings(time, dev);
      }
      if (vm.screen === 'terminal') {
        return this.renderIosTerminal(time, dev, vm.activeInputText);
      }
      if (vm.screen === 'browser') {
        return this.renderIosSafari(time, dev);
      }
      return this.renderIosHomeScreen(time, dev);
    }

    // 4. Active Running Screen: Android 15
    if (vm.screen === 'settings') {
      return this.renderAndroidSettings(time, dev);
    }
    if (vm.screen === 'terminal') {
      return this.renderAndroidTerminal(time, dev, vm.activeInputText);
    }
    if (vm.screen === 'browser') {
      return this.renderAndroidChrome(time, dev);
    }
    return this.renderAndroidHomeScreen(time, dev);
  }

  // --- iOS 18 RENDERERS ---
  private static renderIosHomeScreen(time: string, dev: DeviceReport): string {
    return `
      <svg width="400" height="820" viewBox="0 0 400 820" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="iosBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#141e30"/>
            <stop offset="50%" stop-color="#243b55"/>
            <stop offset="100%" stop-color="#141824"/>
          </linearGradient>
        </defs>
        <!-- Wallpaper -->
        <rect width="400" height="820" fill="url(#iosBg)"/>
        
        <!-- Status Bar -->
        <text x="36" y="38" fill="#ffffff" font-family="-apple-system, sans-serif" font-size="14" font-weight="600">${time}</text>
        
        <!-- Dynamic Island -->
        <rect x="145" y="16" width="110" height="28" rx="14" fill="#000000"/>
        <circle cx="162" cy="30" r="5" fill="#111"/>
        <circle cx="236" cy="30" r="4" fill="#1a3b5c"/>

        <!-- Cellular, WiFi, Battery -->
        <path d="M320 30 L323 30 L323 25 L320 25 Z M325 30 L328 30 L328 22 L325 22 Z M330 30 L333 30 L333 19 L330 19 Z M335 30 L338 30 L338 16 L335 16 Z" fill="#ffffff"/>
        <text x="348" y="30" fill="#ffffff" font-family="-apple-system, sans-serif" font-size="10" font-weight="700">5G</text>
        <rect x="366" y="22" width="20" height="10" rx="3" fill="none" stroke="#ffffff" stroke-width="1.5"/>
        <rect x="368" y="24" width="13" height="6" rx="1.5" fill="#3fb950"/>

        <!-- Date & Large Clock Widget -->
        <rect x="24" y="65" width="168" height="150" rx="24" fill="rgba(255, 255, 255, 0.12)" backdrop-filter="blur(20px)"/>
        <text x="42" y="100" fill="#ff453a" font-family="-apple-system, sans-serif" font-size="13" font-weight="700">CALENDAR</text>
        <text x="42" y="145" fill="#ffffff" font-family="-apple-system, sans-serif" font-size="44" font-weight="300">16</text>
        <text x="42" y="180" fill="#ffffff" font-family="-apple-system, sans-serif" font-size="14" font-weight="500">Friday · No events</text>

        <!-- Weather / System Widget -->
        <rect x="208" y="65" width="168" height="150" rx="24" fill="rgba(255, 255, 255, 0.12)"/>
        <text x="226" y="100" fill="#0a84ff" font-family="-apple-system, sans-serif" font-size="13" font-weight="700">VM MONITOR</text>
        <text x="226" y="135" fill="#ffffff" font-family="-apple-system, sans-serif" font-size="22" font-weight="600">iOS 18.2</text>
        <text x="226" y="165" fill="#30d158" font-family="-apple-system, sans-serif" font-size="13" font-weight="600">● WHPX Active</text>
        <text x="226" y="190" fill="#8e8e93" font-family="-apple-system, sans-serif" font-size="12">8 Cores · 8 GB RAM</text>

        <!-- APP GRID ROW 1 -->
        <!-- Settings -->
        <g style="cursor: pointer;">
          <rect x="30" y="250" width="60" height="60" rx="14" fill="#636366"/>
          <circle cx="60" cy="280" r="14" fill="#8e8e93"/>
          <text x="60" y="325" fill="#ffffff" font-family="-apple-system, sans-serif" font-size="11" font-weight="500" text-anchor="middle">Settings</text>
        </g>

        <!-- Safari -->
        <g style="cursor: pointer;">
          <rect x="123" y="250" width="60" height="60" rx="14" fill="#007aff"/>
          <circle cx="153" cy="280" r="18" fill="none" stroke="#ffffff" stroke-width="2"/>
          <polygon points="153,266 159,280 153,294 147,280" fill="#ff3b30"/>
          <text x="153" y="325" fill="#ffffff" font-family="-apple-system, sans-serif" font-size="11" font-weight="500" text-anchor="middle">Safari</text>
        </g>

        <!-- Terminal / Research Shell -->
        <g style="cursor: pointer;">
          <rect x="216" y="250" width="60" height="60" rx="14" fill="#1c1c1e" stroke="#3a3a3c" stroke-width="1.5"/>
          <text x="246" y="286" fill="#30d158" font-family="monospace" font-size="20" font-weight="700" text-anchor="middle">&gt;_</text>
          <text x="246" y="325" fill="#ffffff" font-family="-apple-system, sans-serif" font-size="11" font-weight="500" text-anchor="middle">Terminal</text>
        </g>

        <!-- App Store -->
        <g style="cursor: pointer;">
          <rect x="310" y="250" width="60" height="60" rx="14" fill="#007aff"/>
          <text x="340" y="288" fill="#ffffff" font-family="-apple-system, sans-serif" font-size="24" font-weight="700" text-anchor="middle">A</text>
          <text x="340" y="325" fill="#ffffff" font-family="-apple-system, sans-serif" font-size="11" font-weight="500" text-anchor="middle">App Store</text>
        </g>

        <!-- Page Dots -->
        <circle cx="190" cy="690" r="3.5" fill="#ffffff"/>
        <circle cx="210" cy="690" r="3.5" fill="rgba(255, 255, 255, 0.4)"/>

        <!-- BOTTOM DOCK -->
        <rect x="20" y="710" width="360" height="85" rx="32" fill="rgba(255, 255, 255, 0.2)" backdrop-filter="blur(30px)"/>
        
        <!-- Phone in dock -->
        <rect x="42" y="723" width="58" height="58" rx="14" fill="#34c759"/>
        <path d="M62 742 C62 755 75 765 85 765" stroke="#ffffff" stroke-width="3" fill="none"/>
        
        <!-- Safari in dock -->
        <rect x="132" y="723" width="58" height="58" rx="14" fill="#007aff"/>
        <circle cx="161" cy="752" r="16" fill="none" stroke="#ffffff" stroke-width="2"/>
        
        <!-- Messages in dock -->
        <rect x="222" y="723" width="58" height="58" rx="14" fill="#34c759"/>
        <ellipse cx="251" cy="752" rx="15" ry="12" fill="#ffffff"/>

        <!-- Settings in dock -->
        <rect x="312" y="723" width="58" height="58" rx="14" fill="#636366"/>
        <circle cx="341" cy="752" r="12" fill="#8e8e93"/>

        <!-- Home Bar Indicator -->
        <rect x="135" y="806" width="130" height="4.5" rx="2.5" fill="#ffffff"/>
      </svg>
    `;
  }

  private static renderIosSettings(time: string, dev: DeviceReport): string {
    return `
      <svg width="400" height="820" viewBox="0 0 400 820" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="820" fill="#000000"/>
        
        <!-- Status Bar -->
        <text x="36" y="38" fill="#ffffff" font-family="-apple-system, sans-serif" font-size="14" font-weight="600">${time}</text>
        <rect x="145" y="16" width="110" height="28" rx="14" fill="#1c1c1e"/>
        <text x="34" y="90" fill="#007aff" font-family="-apple-system, sans-serif" font-size="15" font-weight="500">&lt; Home</text>
        <text x="34" y="130" fill="#ffffff" font-family="-apple-system, sans-serif" font-size="30" font-weight="700">Settings</text>

        <!-- Profile card -->
        <rect x="20" y="150" width="360" height="70" rx="12" fill="#1c1c1e"/>
        <circle cx="55" cy="185" r="22" fill="#3a3a3c"/>
        <text x="55" y="192" fill="#ffffff" font-family="sans-serif" font-size="18" text-anchor="middle"></text>
        <text x="90" y="178" fill="#ffffff" font-family="-apple-system, sans-serif" font-size="16" font-weight="600">Research Guest</text>
        <text x="90" y="198" fill="#8e8e93" font-family="-apple-system, sans-serif" font-size="12">Apple ID, iCloud+, Media</text>

        <!-- Settings Group -->
        <rect x="20" y="240" width="360" height="220" rx="12" fill="#1c1c1e"/>
        <text x="40" y="275" fill="#ffffff" font-family="-apple-system, sans-serif" font-size="15">Model Name</text>
        <text x="360" y="275" fill="#8e8e93" font-family="-apple-system, sans-serif" font-size="14" text-anchor="end">${dev.deviceModel}</text>
        <line x1="40" y1="295" x2="380" y2="295" stroke="#2c2c2e"/>

        <text x="40" y="330" fill="#ffffff" font-family="-apple-system, sans-serif" font-size="15">Software Version</text>
        <text x="360" y="330" fill="#8e8e93" font-family="-apple-system, sans-serif" font-size="14" text-anchor="end">${dev.osVersion}</text>
        <line x1="40" y1="350" x2="380" y2="350" stroke="#2c2c2e"/>

        <text x="40" y="385" fill="#ffffff" font-family="-apple-system, sans-serif" font-size="15">Security Variant</text>
        <text x="360" y="385" fill="#30d158" font-family="-apple-system, sans-serif" font-size="14" font-weight="600" text-anchor="end">${dev.variant.toUpperCase()}</text>
        <line x1="40" y1="405" x2="380" y2="405" stroke="#2c2c2e"/>

        <text x="40" y="440" fill="#ffffff" font-family="-apple-system, sans-serif" font-size="15">Developer Mode</text>
        <text x="360" y="440" fill="#30d158" font-family="-apple-system, sans-serif" font-size="14" text-anchor="end">Enabled</text>

        <!-- Home Bar -->
        <rect x="135" y="806" width="130" height="4.5" rx="2.5" fill="#ffffff"/>
      </svg>
    `;
  }

  private static renderIosTerminal(time: string, dev: DeviceReport, input?: string): string {
    return `
      <svg width="400" height="820" viewBox="0 0 400 820" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="820" fill="#0d1117"/>
        <text x="36" y="38" fill="#ffffff" font-family="-apple-system, sans-serif" font-size="14" font-weight="600">${time}</text>
        <rect x="145" y="16" width="110" height="28" rx="14" fill="#000000"/>
        
        <rect x="0" y="55" width="400" height="40" fill="#161b22"/>
        <text x="20" y="80" fill="#58a6ff" font-family="-apple-system, sans-serif" font-size="14">&lt; Home</text>
        <text x="200" y="80" fill="#c9d1d9" font-family="monospace" font-size="13" font-weight="600" text-anchor="middle">root@iphone:~#</text>

        <!-- Terminal Buffer -->
        <text x="20" y="125" fill="#3fb950" font-family="monospace" font-size="11.5">Darwin iPhone17,1 24.1.0 Darwin Kernel Version 24.1.0</text>
        <text x="20" y="145" fill="#8b949e" font-family="monospace" font-size="11.5">PCC Research Guest Environment (amfidont active)</text>
        <text x="20" y="165" fill="#58a6ff" font-family="monospace" font-size="11.5">root# uname -m</text>
        <text x="20" y="185" fill="#f0f6fc" font-family="monospace" font-size="11.5">arm64e</text>
        <text x="20" y="210" fill="#58a6ff" font-family="monospace" font-size="11.5">root# sw_vers</text>
        <text x="20" y="230" fill="#f0f6fc" font-family="monospace" font-size="11.5">ProductName:    iOS</text>
        <text x="20" y="250" fill="#f0f6fc" font-family="monospace" font-size="11.5">ProductVersion: 18.2</text>
        <text x="20" y="270" fill="#f0f6fc" font-family="monospace" font-size="11.5">BuildVersion:   22C150</text>
        <text x="20" y="300" fill="#58a6ff" font-family="monospace" font-size="11.5">root# ${input || ''}<tspan fill="#3fb950">▋</tspan></text>

        <!-- Home Bar -->
        <rect x="135" y="806" width="130" height="4.5" rx="2.5" fill="#ffffff"/>
      </svg>
    `;
  }

  private static renderIosSafari(time: string, dev: DeviceReport): string {
    return `
      <svg width="400" height="820" viewBox="0 0 400 820" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="820" fill="#ffffff"/>
        <rect x="0" y="0" width="400" height="90" fill="#f2f2f7"/>
        <text x="36" y="38" fill="#000000" font-family="-apple-system, sans-serif" font-size="14" font-weight="600">${time}</text>
        <rect x="145" y="16" width="110" height="28" rx="14" fill="#000000"/>
        
        <rect x="20" y="50" width="360" height="34" rx="10" fill="#e5e5ea"/>
        <text x="200" y="72" fill="#3c3c43" font-family="-apple-system, sans-serif" font-size="13" text-anchor="middle">🔒 apple.com</text>

        <!-- Safari page content -->
        <text x="200" y="180" fill="#1d1d1f" font-family="-apple-system, sans-serif" font-size="28" font-weight="700" text-anchor="middle">iOS 18</text>
        <text x="200" y="215" fill="#86868b" font-family="-apple-system, sans-serif" font-size="15" text-anchor="middle">Personalize. Protect. Power.</text>
        <rect x="140" y="240" width="120" height="36" rx="18" fill="#0071e3"/>
        <text x="200" y="263" fill="#ffffff" font-family="-apple-system, sans-serif" font-size="13" font-weight="600" text-anchor="middle">Learn more</text>

        <!-- Bottom bar -->
        <rect x="0" y="740" width="400" height="80" fill="#f2f2f7"/>
        <text x="30" y="775" fill="#007aff" font-family="sans-serif" font-size="20">&lt;</text>
        <text x="90" y="775" fill="#007aff" font-family="sans-serif" font-size="20">&gt;</text>
        <text x="200" y="775" fill="#007aff" font-family="sans-serif" font-size="18">📤</text>
        <text x="310" y="775" fill="#007aff" font-family="sans-serif" font-size="18">📖</text>
        <text x="370" y="775" fill="#007aff" font-family="sans-serif" font-size="18">⊞</text>
        <rect x="135" y="806" width="130" height="4.5" rx="2.5" fill="#000000"/>
      </svg>
    `;
  }

  // --- ANDROID 15 RENDERERS ---
  private static renderAndroidHomeScreen(time: string, dev: DeviceReport): string {
    return `
      <svg width="400" height="820" viewBox="0 0 400 820" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="androidBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#192a3e"/>
            <stop offset="60%" stop-color="#111827"/>
            <stop offset="100%" stop-color="#0b0f19"/>
          </linearGradient>
        </defs>
        <rect width="400" height="820" fill="url(#androidBg)"/>

        <!-- Camera punch hole -->
        <circle cx="200" cy="22" r="7" fill="#000000"/>

        <!-- Status Bar -->
        <text x="24" y="26" fill="#e2e8f0" font-family="sans-serif" font-size="12" font-weight="600">${time}</text>
        <path d="M340 22 L344 22 L344 17 L340 17 Z M346 22 L350 22 L350 14 L346 14 Z M352 22 L356 22 L356 11 L352 11 Z" fill="#e2e8f0"/>
        <text x="360" y="22" fill="#e2e8f0" font-family="sans-serif" font-size="10" font-weight="700">5G</text>
        <rect x="378" y="14" width="16" height="9" rx="2" fill="none" stroke="#e2e8f0" stroke-width="1.2"/>
        <rect x="380" y="16" width="10" height="5" rx="1" fill="#3fb950"/>

        <!-- At a glance -->
        <text x="28" y="80" fill="#e2e8f0" font-family="sans-serif" font-size="16" font-weight="600">Friday, Oct 16 · 21°C</text>
        <text x="28" y="105" fill="#94a3b8" font-family="sans-serif" font-size="12">Pixel 8 · Android 15 VanillaIceCream</text>

        <!-- Large Material You Clock -->
        <text x="200" y="220" fill="#c4eed0" font-family="sans-serif" font-size="76" font-weight="200" text-anchor="middle">${time}</text>

        <!-- Google Search Pill -->
        <rect x="24" y="270" width="352" height="50" rx="25" fill="rgba(255, 255, 255, 0.14)"/>
        <text x="50" y="301" fill="#ea4335" font-family="sans-serif" font-size="20" font-weight="700">G</text>
        <text x="80" y="301" fill="#94a3b8" font-family="sans-serif" font-size="13">Search apps, web...</text>

        <!-- APPS ROW 1 -->
        <!-- Settings -->
        <g style="cursor: pointer;">
          <circle cx="65" cy="385" r="28" fill="#3b4858"/>
          <text x="65" y="392" fill="#ffffff" font-family="sans-serif" font-size="20" text-anchor="middle">⚙</text>
          <text x="65" y="430" fill="#ffffff" font-family="sans-serif" font-size="11" font-weight="500" text-anchor="middle">Settings</text>
        </g>

        <!-- Chrome -->
        <g style="cursor: pointer;">
          <circle cx="155" cy="385" r="28" fill="#ffffff"/>
          <circle cx="155" cy="385" r="14" fill="#4285f4"/>
          <text x="155" y="430" fill="#ffffff" font-family="sans-serif" font-size="11" font-weight="500" text-anchor="middle">Chrome</text>
        </g>

        <!-- Terminal Shell -->
        <g style="cursor: pointer;">
          <circle cx="245" cy="385" r="28" fill="#1e293b"/>
          <text x="245" y="392" fill="#3fb950" font-family="monospace" font-size="18" font-weight="700" text-anchor="middle">&gt;_</text>
          <text x="245" y="430" fill="#ffffff" font-family="sans-serif" font-size="11" font-weight="500" text-anchor="middle">Terminal</text>
        </g>

        <!-- Play Store -->
        <g style="cursor: pointer;">
          <circle cx="335" cy="385" r="28" fill="#ffffff"/>
          <polygon points="325,372 348,385 325,398" fill="#00c853"/>
          <text x="335" y="430" fill="#ffffff" font-family="sans-serif" font-size="11" font-weight="500" text-anchor="middle">Play Store</text>
        </g>

        <!-- Bottom Favorite Bar -->
        <rect x="20" y="705" width="360" height="74" rx="24" fill="rgba(255, 255, 255, 0.12)"/>
        <!-- Phone -->
        <circle cx="65" cy="742" r="24" fill="#34a853"/>
        <text x="65" y="749" fill="#ffffff" font-family="sans-serif" font-size="18" text-anchor="middle">📞</text>
        <!-- Messages -->
        <circle cx="155" cy="742" r="24" fill="#4285f4"/>
        <text x="155" y="749" fill="#ffffff" font-family="sans-serif" font-size="16" text-anchor="middle">💬</text>
        <!-- Chrome -->
        <circle cx="245" cy="742" r="24" fill="#ffffff"/>
        <circle cx="245" cy="742" r="10" fill="#4285f4"/>
        <!-- Settings -->
        <circle cx="335" cy="742" r="24" fill="#3b4858"/>
        <text x="335" y="749" fill="#ffffff" font-family="sans-serif" font-size="16" text-anchor="middle">⚙</text>

        <!-- Android 15 Nav Pill -->
        <rect x="150" y="804" width="100" height="4" rx="2" fill="#ffffff"/>
      </svg>
    `;
  }

  private static renderAndroidSettings(time: string, dev: DeviceReport): string {
    return `
      <svg width="400" height="820" viewBox="0 0 400 820" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="820" fill="#121316"/>
        <text x="24" y="26" fill="#e2e8f0" font-family="sans-serif" font-size="12" font-weight="600">${time}</text>
        
        <text x="24" y="80" fill="#3fb950" font-family="sans-serif" font-size="15" font-weight="600">&lt; Back to Home</text>
        <text x="24" y="125" fill="#e2e8f0" font-family="sans-serif" font-size="28" font-weight="700">Settings</text>

        <!-- Search in settings -->
        <rect x="20" y="145" width="360" height="48" rx="24" fill="#1e222a"/>
        <text x="45" y="174" fill="#8a94a3" font-family="sans-serif" font-size="13">🔍 Search settings...</text>

        <!-- Item 1: About phone -->
        <rect x="20" y="210" width="360" height="80" rx="16" fill="#1e222a"/>
        <text x="40" y="240" fill="#e2e8f0" font-family="sans-serif" font-size="16" font-weight="600">About virtual phone</text>
        <text x="40" y="265" fill="#8a94a3" font-family="sans-serif" font-size="12.5">${dev.name} · ${dev.osVersion}</text>

        <!-- Item 2: System Specs -->
        <rect x="20" y="305" width="360" height="150" rx="16" fill="#1e222a"/>
        <text x="40" y="335" fill="#e2e8f0" font-family="sans-serif" font-size="14" font-weight="600">Android Version</text>
        <text x="360" y="335" fill="#3fb950" font-family="sans-serif" font-size="13" font-weight="600" text-anchor="end">Android 15 (API 35)</text>

        <text x="40" y="375" fill="#e2e8f0" font-family="sans-serif" font-size="14" font-weight="600">Virtualization Hypervisor</text>
        <text x="360" y="375" fill="#8a94a3" font-family="sans-serif" font-size="13" text-anchor="end">WHPX Acceleration</text>

        <text x="40" y="415" fill="#e2e8f0" font-family="sans-serif" font-size="14" font-weight="600">Allocated Cores & RAM</text>
        <text x="360" y="415" fill="#8a94a3" font-family="sans-serif" font-size="13" text-anchor="end">${dev.cpuCount} Cores · ${dev.memoryMB} MB</text>

        <!-- Nav bar -->
        <rect x="150" y="804" width="100" height="4" rx="2" fill="#ffffff"/>
      </svg>
    `;
  }

  private static renderAndroidTerminal(time: string, dev: DeviceReport, input?: string): string {
    return `
      <svg width="400" height="820" viewBox="0 0 400 820" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="820" fill="#090d16"/>
        <text x="24" y="26" fill="#e2e8f0" font-family="sans-serif" font-size="12" font-weight="600">${time}</text>
        
        <rect x="0" y="45" width="400" height="40" fill="#131b2e"/>
        <text x="20" y="70" fill="#3fb950" font-family="sans-serif" font-size="13">&lt; Back</text>
        <text x="200" y="70" fill="#93c5fd" font-family="monospace" font-size="13" text-anchor="middle">shell@pixel8:/ $</text>

        <!-- Terminal Output -->
        <text x="20" y="115" fill="#3fb950" font-family="monospace" font-size="11.5">Linux localhost 6.1.0-android15-x86_64 #1 SMP</text>
        <text x="20" y="135" fill="#94a3b8" font-family="monospace" font-size="11.5">Android Debug Bridge daemon active (tcp:5555)</text>
        <text x="20" y="160" fill="#60a5fa" font-family="monospace" font-size="11.5">$ getprop ro.build.version.release</text>
        <text x="20" y="180" fill="#f1f5f9" font-family="monospace" font-size="11.5">15</text>
        <text x="20" y="205" fill="#60a5fa" font-family="monospace" font-size="11.5">$ getprop ro.product.model</text>
        <text x="20" y="225" fill="#f1f5f9" font-family="monospace" font-size="11.5">${dev.name}</text>
        <text x="20" y="250" fill="#60a5fa" font-family="monospace" font-size="11.5">$ id</text>
        <text x="20" y="270" fill="#f1f5f9" font-family="monospace" font-size="11.5">uid=2000(shell) gid=2000(shell) groups=2000(shell)</text>
        <text x="20" y="300" fill="#60a5fa" font-family="monospace" font-size="11.5">$ ${input || ''}<tspan fill="#3fb950">▋</tspan></text>

        <!-- Nav bar -->
        <rect x="150" y="804" width="100" height="4" rx="2" fill="#ffffff"/>
      </svg>
    `;
  }

  private static renderAndroidChrome(time: string, dev: DeviceReport): string {
    return `
      <svg width="400" height="820" viewBox="0 0 400 820" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="820" fill="#ffffff"/>
        <rect x="0" y="0" width="400" height="85" fill="#f1f3f4"/>
        <text x="24" y="26" fill="#3c4043" font-family="sans-serif" font-size="12" font-weight="600">${time}</text>
        
        <rect x="20" y="40" width="320" height="36" rx="18" fill="#ffffff" stroke="#dadce0"/>
        <text x="50" y="63" fill="#202124" font-family="sans-serif" font-size="13">🔒 google.com</text>
        <circle cx="365" cy="58" r="14" fill="#e8eaed"/>
        <text x="365" y="63" fill="#5f6368" font-family="sans-serif" font-size="12" text-anchor="middle">1</text>

        <!-- Chrome body -->
        <text x="200" y="200" fill="#4285f4" font-family="sans-serif" font-size="40" font-weight="700" text-anchor="middle">Google</text>
        <rect x="30" y="235" width="340" height="44" rx="22" fill="#ffffff" stroke="#dfe1e5"/>
        <text x="60" y="262" fill="#9aa0a6" font-family="sans-serif" font-size="13">Search or type URL...</text>

        <rect x="150" y="804" width="100" height="4" rx="2" fill="#000000"/>
      </svg>
    `;
  }
}
