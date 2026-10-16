import React, { useState } from 'react';
import {
  Play,
  Square,
  Sliders,
  Copy,
  Edit2,
  Share2,
  Trash2,
  Info,
  Tv,
  Terminal,
  Grid,
} from 'lucide-react';
import { DeviceReport } from '../../shared/types.js';
import { StatusPill, VariantBadge, PlatformBadge } from './StatusWidgets.js';
import { DeviceScreenMirror } from './DeviceScreenMirror.js';
import { DeviceTerminal } from './DeviceTerminal.js';

interface DeviceDetailViewProps {
  device: DeviceReport;
  onStart: (name: string) => void;
  onStop: (name: string) => void;
  onDelete: (name: string) => void;
  onClone: (name: string) => void;
  onRename: (name: string) => void;
  onExport: (name: string) => void;
  onOpenSettings: (device: DeviceReport) => void;
  onLaunchIosKvm?: () => void;
}

export const DeviceDetailView: React.FC<DeviceDetailViewProps> = ({
  device,
  onStart,
  onStop,
  onDelete,
  onClone,
  onRename,
  onExport,
  onOpenSettings,
  onLaunchIosKvm,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'screen' | 'shell'>('overview');
  const isRunning = device.status === 'running';

  const specs = [
    { label: 'Platform', value: <PlatformBadge platform={device.platform} /> },
    { label: 'OS Version', value: device.osVersion },
    { label: 'OS Build', value: device.osBuild },
    { label: 'Variant', value: <VariantBadge variant={device.variant} /> },
    { label: 'CPU Cores', value: `${device.cpuCount} cores` },
    { label: 'Memory', value: `${device.memoryMB} MB` },
    { label: 'Storage', value: `${(device.diskSizeBytes / 1073741824).toFixed(0)} GB` },
    { label: 'Display', value: `${device.display.width}x${device.display.height} (${device.display.dpi} dpi)` },
    { label: 'Network', value: device.network.mode.toUpperCase() },
    { label: 'Device Model', value: device.deviceModel },
  ];

  return (
    <div
      style={{
        flex: 1,
        height: '100%',
        overflowY: 'auto',
        backgroundColor: 'var(--bg)',
        padding: '24px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: 'var(--text)',
                letterSpacing: -0.3,
              }}
            >
              {device.name}
            </h1>
            <StatusPill
              kind={isRunning ? 'running' : 'stopped'}
              label={isRunning ? 'Running' : 'Stopped'}
            />
          </div>

          <div
            className="font-mono"
            style={{
              fontSize: 12,
              color: 'var(--faint)',
              marginTop: 4,
            }}
          >
            {device.bundlePath}
          </div>
        </div>

        {/* Action Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {isRunning ? (
            <button
              onClick={() => onStop(device.name)}
              className="btn-danger"
              title="Stop virtual device"
            >
              <Square size={14} fill="currentColor" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              onClick={() => onStart(device.name)}
              className="btn-primary"
              title="Start virtual device"
            >
              <Play size={14} fill="currentColor" />
              <span>Start</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('screen')}
            className="btn-secondary"
            title="Open Interactive Screen"
          >
            <Tv size={14} />
            <span>Show screen</span>
          </button>

          <button
            onClick={() => setActiveTab('shell')}
            className="btn-secondary"
            title="Open Interactive Shell Terminal"
          >
            <Terminal size={14} />
            <span>Shell</span>
          </button>

          <button
            onClick={() => onOpenSettings(device)}
            className="btn-secondary"
            title="Edit VM Settings"
          >
            <Sliders size={14} />
            <span>Settings</span>
          </button>

          <button onClick={() => onClone(device.name)} className="btn-secondary" title="Clone Device">
            <Copy size={14} />
            <span>Clone</span>
          </button>

          <button onClick={() => onRename(device.name)} className="btn-secondary" title="Rename Device">
            <Edit2 size={14} />
            <span>Rename</span>
          </button>

          <button onClick={() => onExport(device.name)} className="btn-secondary" title="Export Device Bundle">
            <Share2 size={14} />
            <span>Export</span>
          </button>

          <button onClick={() => onDelete(device.name)} className="btn-danger" title="Delete Device">
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Info Callout Banner matching VMDetailView.swift */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: '12px 16px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'rgba(91, 155, 255, 0.12)',
          border: '1px solid rgba(91, 155, 255, 0.28)',
          color: 'var(--text)',
          fontSize: 13,
          lineHeight: 1.45,
        }}
      >
        <Info size={16} color="var(--accent)" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          The mobile screen opens inside the interactive workstation viewer or in an external window.
          vMobile Workstation manages hardware virtualization with Windows Hypervisor Platform (WHPX),
          live ADB/usbmux bridges, and device diagnostics.
        </div>
      </div>

      {/* Surface Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          borderBottom: '1px solid var(--border)',
          paddingBottom: 2,
        }}
      >
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: '6px 6px 0 0',
            backgroundColor: activeTab === 'overview' ? 'var(--surface)' : 'transparent',
            color: activeTab === 'overview' ? 'var(--accent)' : 'var(--dim)',
            borderBottom: activeTab === 'overview' ? '2px solid var(--accent)' : '2px solid transparent',
          }}
        >
          <Grid size={14} />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('screen')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: '6px 6px 0 0',
            backgroundColor: activeTab === 'screen' ? 'var(--surface)' : 'transparent',
            color: activeTab === 'screen' ? 'var(--accent)' : 'var(--dim)',
            borderBottom: activeTab === 'screen' ? '2px solid var(--accent)' : '2px solid transparent',
          }}
        >
          <Tv size={14} />
          <span>Interactive Screen</span>
        </button>

        <button
          onClick={() => setActiveTab('shell')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: '6px 6px 0 0',
            backgroundColor: activeTab === 'shell' ? 'var(--surface)' : 'transparent',
            color: activeTab === 'shell' ? 'var(--accent)' : 'var(--dim)',
            borderBottom: activeTab === 'shell' ? '2px solid var(--accent)' : '2px solid transparent',
          }}
        >
          <Terminal size={14} />
          <span>Shell Terminal</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'var(--dim)',
              letterSpacing: 0.5,
            }}
          >
            Hardware & System Specs
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 12,
            }}
          >
            {specs.map((s, idx) => (
              <div key={idx} className="card-overview">
                <span className="label">{s.label}</span>
                <span className="value">{s.value}</span>
              </div>
            ))}
          </div>

          {/* Spanning UDID Card */}
          <div className="card-overview" style={{ marginTop: 4 }}>
            <span className="label">UDID / Hardware Serial</span>
            <span className="value font-mono" style={{ fontSize: 13, color: 'var(--accent)' }}>
              {device.udid || 'N/A'}
            </span>
          </div>

          {/* Strategy 1: WSL2 Docker-OSX KVM Card for iOS */}
          {device.platform === 'ios' && (
            <div
              style={{
                marginTop: 8,
                padding: '16px 20px',
                borderRadius: 'var(--radius)',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: 'var(--accent)' }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                    Strategy 1: WSL2 Docker-OSX KVM Hypervisor Bridge
                  </span>
                </div>
                <span className="badge" style={{ backgroundColor: 'rgba(91, 155, 255, 0.15)', color: 'var(--accent)', fontSize: 11, padding: '3px 8px', borderRadius: 4 }}>
                  Local Windows 11 KVM
                </span>
              </div>

              <div style={{ fontSize: 12.5, color: 'var(--dim)', lineHeight: 1.5 }}>
                Runs Apple's official iOS Simulator runtime inside a containerized macOS environment via Windows Subsystem for Linux (WSL2) with nested KVM acceleration. Complete SpringBoard, Safari, and app testing without physical Mac hardware.
              </div>

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--dim)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>VNC Port:</span>
                  <code className="font-mono">localhost:5901</code>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--dim)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>Web Display:</span>
                  <code className="font-mono">localhost:8085</code>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  onClick={onLaunchIosKvm}
                  className="btn-primary"
                  style={{ fontSize: 12.5, padding: '7px 14px' }}
                >
                  <Play size={13} fill="currentColor" />
                  <span>Launch WSL2 iOS KVM Guest</span>
                </button>

                <a
                  href="http://localhost:8085"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                  style={{ fontSize: 12.5, padding: '7px 14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Tv size={13} />
                  <span>Open Web Stream (Port 8085)</span>
                </a>
              </div>
            </div>
          )}

          {/* Android WHPX Card */}
          {device.platform === 'android' && (
            <div
              style={{
                marginTop: 8,
                padding: '16px 20px',
                borderRadius: 'var(--radius)',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: 'var(--good)' }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                    Android Hypervisor: Windows Hypervisor Platform (WHPX)
                  </span>
                </div>
                <span className="badge" style={{ backgroundColor: 'rgba(63, 185, 80, 0.15)', color: 'var(--good)', fontSize: 11, padding: '3px 8px', borderRadius: 4 }}>
                  WHPX Accelerated
                </span>
              </div>

              <div style={{ fontSize: 12.5, color: 'var(--dim)', lineHeight: 1.5 }}>
                Operating system partitions and Linux 6.1 kernel loaded directly via WHPX. Interactive display streams into the embedded canvas mirror with sub-second touch forwarding and ADB root shell access.
              </div>

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--dim)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>ADB Endpoint:</span>
                  <code className="font-mono">{device.serial || '127.0.0.1:5555'}</code>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--dim)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>Kernel:</span>
                  <code className="font-mono">Linux ranchu x86_64</code>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'screen' && <DeviceScreenMirror device={device} />}

      {activeTab === 'shell' && <DeviceTerminal device={device} />}
    </div>
  );
};
