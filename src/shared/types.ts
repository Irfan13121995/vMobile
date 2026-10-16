export type Platform = 'android' | 'ios';
export type DeviceStatus = 'running' | 'stopped' | 'starting' | 'stopping';
export type NetworkMode = 'nat' | 'bridged' | 'host-only' | 'none';

export type DeviceVariant =
  | 'stock'
  | 'google-apis'
  | 'regular'
  | 'developer'
  | 'root-magisk'
  | 'jailbreak'
  | 'experimental'
  | 'less';

export interface DisplayInfo {
  width: number;
  height: number;
  dpi: number;
}

export interface NetworkInfo {
  mode: NetworkMode;
  ip?: string;
}

export interface DeviceReport {
  id: string;
  name: string;
  platform: Platform;
  status: DeviceStatus;
  cpuCount: number;
  memoryMB: number;
  diskSizeBytes: number;
  variant: DeviceVariant | string;
  osVersion: string;
  osBuild: string;
  deviceModel: string;
  udid: string;
  serial?: string;
  network: NetworkInfo;
  display: DisplayInfo;
  bundlePath: string;
  adbPort?: number;
  isPhysical?: boolean;
  batteryLevel?: number;
  isCharging?: boolean;
  developerMode?: boolean;
}

export interface HostCheck {
  id: string;
  title: string;
  status: 'ok' | 'attention';
  detail: string;
  fixCommand?: string;
}

export interface TaskStage {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface TaskModel {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  stages: TaskStage[];
  currentStageId?: string;
  logs: string[];
  startTime: number;
  endTime?: number;
  exitCode?: number;
  error?: string;
}

export interface CreateDeviceRequest {
  name: string;
  platform: Platform;
  osVersion: string;
  variant: string;
  cpuCount: number;
  memoryMB: number;
  diskGB: number;
  displayWidth: number;
  displayHeight: number;
  displayDpi: number;
  presetModel?: string;
  firmwareSource?: string;
  kernelSource?: string;
}

export interface UpdateDeviceConfig {
  cpuCount?: number;
  memoryMB?: number;
  networkMode?: NetworkMode;
  displayDpi?: number;
}
