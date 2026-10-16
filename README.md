# vMobile Workstation

<div align="center">

<img src="docs/logo.png" width="132" alt="vMobile Workstation icon">

### **A native Workstation for Windows 11 to create, manage, mirror, and audit virtual & connected Android and iOS mobile devices.**

[![Windows 11](https://img.shields.io/badge/Platform-Windows%2011-0078D4?logo=windows11&logoColor=white)](#)
[![Android](https://img.shields.io/badge/Guest-Android%2011--15-3DDC84?logo=android&logoColor=white)](#)
[![iOS](https://img.shields.io/badge/Guest-iOS%2016--18-000000?logo=apple&logoColor=white)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

---

## 📌 Reference & Attribution

This project is a Windows 11 native evolution and multi-platform port inspired by **[vphone-ws](https://github.com/zqxwce/vphone-ws.git)** (originally designed by `zqxwce` as a macOS SwiftUI workstation for `vphone-cli` PCC research VMs). 

While the original `vphone-ws` was strictly limited to Apple Silicon macOS and Virtualization.framework, **vMobile Workstation** brings the workstation paradigm to **Windows 11**, extending it to support **both Android and iOS** environments natively with Windows Hypervisor Platform (WHPX) acceleration, real-time screen streaming, interactive touch forwarding, and host diagnostics.

---

## 🚀 Key Features

- **Unified Multi-Platform Library**:
  - Filter devices across **Android** and **iOS** or view all in one consolidated library.
  - Live status tracking (`Running` / `Stopped`) with polling probes matching open ports and hypervisor locks.
- **Hardware & System Overview**:
  - 5-column metric card grid: Platform, OS Version & Build, Security Variant, CPU cores, Memory (RAM), Virtual Storage, Display Resolution & DPI, Network mode, Device Model, and UDID / Serial.
- **Interactive Live Screen Mirror**:
  - Real-time embedded display canvas.
  - Full mouse-to-touch translation: **click** to tap, **drag** to swipe/scroll with configurable duration.
  - Quick virtual hardware keys: Back (`Keycode 4`), Home (`Keycode 3`), App Switcher (`Keycode 187`), Power (`Keycode 26`), and Volume Up/Down.
  - Direct keyboard forwarding: type text in the workstation to send keystrokes directly into device text fields.
  - One-click launcher for `scrcpy` for hardware-accelerated 60fps external windowing.
- **Interactive In-App Shell Terminal**:
  - Run terminal commands (`uname -a`, `getprop`, `pm list packages`, etc.) directly on the active mobile device.
- **4-Step Device Provisioning Wizard**:
  - **Platform & Name**: Choose Android or iOS with real-time validation.
  - **OS & Variant Selection**:
    - **Android**: Android 15 (VanillaIceCream), Android 14 (UpsideDownCake), Android 13 (Tiramisu), Android 12 (S). Variants: *Google APIs & Play*, *Developer (Eng/Debug)*, or *Rooted (Magisk Privileged)*.
    - **iOS**: iOS 18.2, iOS 18.0, iOS 17.5, iOS 16.6. Variants: *Regular (Production)*, *Developer (Debug)*, or *Jailbreak / Research*.
  - **Resources & Display**: Sliders for CPU cores, RAM size, storage allocation, and display presets (*Phone*, *Flagship Pro*, *Tablet*, *Foldable*).
  - **Review & Create**: Live stage chips (`=== Stage: Validating ===`, `=== Stage: Allocating Storage ===`, etc.) and real-time ANSI terminal logs with cancellation and log export.
- **Windows 11 Host Readiness Diagnostics**:
  - Evaluates Windows 11 Build (>= 22000).
  - Verifies Windows Hypervisor Platform (WHPX / Hyper-V) hardware acceleration via `emulator-check.exe accel`.
  - Probes Android Platform Tools (`adb.exe`) and SDK Emulator (`emulator.exe`).
  - Validates display mirror engine (`scrcpy` / Canvas WebGL bridge).
  - Detects Apple Mobile Device Support (`usbmuxd` port 27015 / Windows USB PnP).
  - Every check provides status (`[PASS]` / `[WARN]`), details, and one-click copyable fix commands.
- **vMobile CLI Suite (`vmobile`)**:
  - Terminal-first command-line tool matching the `vphone-cli` interface:
    - `vmobile list [--json]`
    - `vmobile info <name> [--json]`
    - `vmobile start <name>`
    - `vmobile stop <name>`
    - `vmobile readiness`

---

## 💻 System Architecture

```
┌────────────────────────────────────────────────────────┐
│             vMobile Workstation UI (Fluent)            │
│    (Sidebar · Overview Grid · Screen Mirror · Shell)   │
└───────────────────────────┬────────────────────────────┘
                            │ REST / WebSocket (port 5995)
┌───────────────────────────▼────────────────────────────┐
│              vMobile Workstation Engine                │
├───────────────────────────┬────────────────────────────┤
│      Android Subsystem    │        iOS Subsystem       │
│  - AVD Manager (.ini)     │  - Virtual iOS Store       │
│  - Emulator Runner (WHPX) │  - Windows USB PnP Monitor │
│  - ADB Client & Screencap │  - usbmuxd Bridge (27015)  │
│  - Input Tap/Swipe Engine │  - Remote vPhone Bridge    │
├───────────────────────────┴────────────────────────────┤
│         Windows 11 Host Readiness Diagnostics          │
│   (WHPX · Windows NT 10.0.26220+ · ADB · scrcpy · USB) │
└────────────────────────────────────────────────────────┘
```

---

## 🛠️ Prerequisites

1. **Operating System**: Windows 11 (64-bit, Build 22000 or newer).
2. **Virtualization**: Windows Hypervisor Platform enabled:
   ```powershell
   Enable-WindowsOptionalFeature -Online -FeatureName HypervisorPlatform
   ```
3. **Node.js**: Node.js 18+ (tested on Node v24).
4. **Android SDK** (Optional for Android virtualization):
   - Located automatically in `$env:LOCALAPPDATA\Android\Sdk`.
   - Platform-tools (`adb.exe`) and `emulator.exe`.
5. **Display Acceleration** (Optional):
   - `scrcpy` for 60fps external windowing:
     ```powershell
     winget install Genymobile.scrcpy
     ```
6. **Apple Device Bridge** (Optional for physical iOS sync):
   - Apple Mobile Device Support / iTunes:
     ```powershell
     winget install Apple.iTunes
     ```

---

## 📦 Installation & Setup Guide

### 1. Clone the Repository
```powershell
git clone https://github.com/Irfan13121995/vMobile.git
cd vMobile
```

### 2. Install Dependencies
```powershell
npm install
```

### 3. Build the Frontend
```powershell
npm run build
```

### 4. Run Host Readiness Diagnostic
Check your Windows 11 environment to ensure WHPX and SDK tools are ready:
```powershell
npm run cli -- readiness
```

### 5. Launch vMobile Workstation
Start the workstation server and open the interface:
```powershell
npm start
```
By default, the workstation starts at:
👉 **`http://localhost:5995`**

---

## ⌨️ Command-Line Interface (`vmobile`)

The included `vmobile` CLI lets you control devices directly from PowerShell or Command Prompt:

| Command | Description |
|---|---|
| `vmobile list` | Print formatted device library with platform tags and live status |
| `vmobile list --json` | Output full machine-readable JSON list of all devices |
| `vmobile info <name>` | Display detailed hardware and system specs for a device |
| `vmobile start <name>` | Boot an Android AVD or start an iOS virtual instance |
| `vmobile stop <name>` | Gracefully stop a running device via ADB emu kill / hypervisor |
| `vmobile readiness` | Run Windows 11 host diagnostics and view actionable fix commands |

You can run commands using:
```powershell
npx tsx src/cli/vmobile.ts list
```
or via the bundled batch runner:
```powershell
.\bin\vmobile.cmd list
```

---

## 🎨 Design System

vMobile Workstation matches the exact dark/light aesthetic defined in `vphone-ws`'s `Theme.swift`:

| Role | Dark Token | Light Token |
|---|---|---|
| **Background** | `#101216` | `#eef0f4` |
| **Surface** | `#1b1e24` | `#ffffff` |
| **Surface Secondary** | `#21252c` | `#f6f7f9` |
| **Border** | `#2b303a` | `#dfe3ea` |
| **Accent** | `#5b9bff` | `#2f6fe0` |
| **Success (Good)** | `#3fb950` | `#1f9d40` |
| **Warning (Attention)**| `#d29922` | `#b57d00` |
| **Danger (Crit)** | `#f85149` | `#cf2231` |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
Portions and design patterns referenced from [zqxwce/vphone-ws](https://github.com/zqxwce/vphone-ws.git).
