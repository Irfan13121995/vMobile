import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { DeviceReport, NetworkMode, UpdateDeviceConfig } from '../../shared/types.js';

interface SettingsModalProps {
  device: DeviceReport;
  onClose: () => void;
  onSave: (name: string, config: UpdateDeviceConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ device, onClose, onSave }) => {
  const [cpu, setCpu] = useState(device.cpuCount);
  const [memory, setMemory] = useState(device.memoryMB);
  const [network, setNetwork] = useState<NetworkMode>(device.network.mode);
  const [dpi, setDpi] = useState(device.display.dpi);

  const handleSave = () => {
    onSave(device.name, {
      cpuCount: cpu,
      memoryMB: memory,
      networkMode: network,
      displayDpi: dpi,
    });
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        style={{
          width: 520,
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--surface2)',
          }}
        >
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
              Device Settings: {device.name}
            </h2>
            <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 2 }}>
              Changes take effect on the next boot.
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--faint)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>CPU Cores</label>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{cpu} Cores</span>
            </div>
            <input
              type="range"
              min="1"
              max="16"
              value={cpu}
              onChange={(e) => setCpu(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Memory Allocation</label>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{memory} MB</span>
            </div>
            <input
              type="range"
              min="1024"
              max="16384"
              step="1024"
              value={memory}
              onChange={(e) => setMemory(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Network Mode
            </label>
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value as NetworkMode)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface2)',
                color: 'var(--text)',
                fontSize: 13,
              }}
            >
              <option value="nat">NAT (Shared Host Network)</option>
              <option value="bridged">Bridged (LAN IP Address)</option>
              <option value="host-only">Host-Only (Isolated Local Network)</option>
              <option value="none">Off (No Network Adapter)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Display Density (DPI)
            </label>
            <input
              type="number"
              value={dpi}
              onChange={(e) => setDpi(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface2)',
                color: 'var(--text)',
                fontSize: 13,
              }}
            />
          </div>
        </div>

        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border)',
            backgroundColor: 'var(--surface2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
          }}
        >
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary">
            <Check size={14} />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
