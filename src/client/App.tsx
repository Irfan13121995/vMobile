import React, { useState, useEffect } from 'react';
import { TitleBar } from './components/TitleBar.js';
import { Sidebar } from './components/Sidebar.js';
import { DeviceDetailView } from './components/DeviceDetailView.js';
import { CreateWizardModal } from './components/CreateWizardModal.js';
import { HostReadinessModal } from './components/HostReadinessModal.js';
import { SettingsModal } from './components/SettingsModal.js';
import { TaskConsoleModal } from './components/TaskConsoleModal.js';
import { DeviceReport, HostCheck, TaskModel, CreateDeviceRequest, UpdateDeviceConfig } from '../shared/types.js';
import { Smartphone, Plus } from 'lucide-react';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [devices, setDevices] = useState<DeviceReport[]>([]);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [readinessChecks, setReadinessChecks] = useState<HostCheck[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [showReadiness, setShowReadiness] = useState(false);
  const [editingDevice, setEditingDevice] = useState<DeviceReport | null>(null);
  const [activeTask, setActiveTask] = useState<TaskModel | null>(null);

  // Sync theme to root DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Load devices and readiness
  const refreshDevices = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/devices');
      if (res.ok) {
        const data: DeviceReport[] = await res.json();
        setDevices(data);
        if (!selectedName && data.length > 0) {
          setSelectedName(data[0].name);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsRefreshing(false);
    }
  };

  const refreshReadiness = async () => {
    try {
      const res = await fetch('/api/readiness');
      if (res.ok) {
        setReadinessChecks(await res.json());
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refreshDevices();
    refreshReadiness();

    // 3-second heartbeat poll matching vphone-ws LibraryView.swift
    const interval = setInterval(() => {
      refreshDevices();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // WebSocket for real-time task log streaming
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'task-update') {
          setActiveTask(msg.data);
        } else if (msg.type === 'devices-changed') {
          setDevices(msg.data);
        }
      } catch {
        // ignore
      }
    };

    return () => ws.close();
  }, []);

  // Device Actions
  const handleStart = async (name: string) => {
    await fetch(`/api/devices/${encodeURIComponent(name)}/start`, { method: 'POST' });
    refreshDevices();
  };

  const handleStop = async (name: string) => {
    await fetch(`/api/devices/${encodeURIComponent(name)}/stop`, { method: 'POST' });
    refreshDevices();
  };

  const handleDelete = async (name: string) => {
    if (confirm(`Permanently remove ${name} and its virtual disk image?`)) {
      await fetch(`/api/devices/${encodeURIComponent(name)}`, { method: 'DELETE' });
      setSelectedName(null);
      refreshDevices();
    }
  };

  const handleClone = async (name: string) => {
    const newName = prompt(`Enter new name to clone ${name}:`, `${name}_Clone`);
    if (newName && newName.trim()) {
      await fetch(`/api/devices/${encodeURIComponent(name)}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName: newName.trim() }),
      });
      setSelectedName(newName.trim());
      refreshDevices();
    }
  };

  const handleRename = async (name: string) => {
    const newName = prompt(`Enter new name for ${name}:`, name);
    if (newName && newName.trim() && newName.trim() !== name) {
      await fetch(`/api/devices/${encodeURIComponent(name)}/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName: newName.trim() }),
      });
      setSelectedName(newName.trim());
      refreshDevices();
    }
  };

  const handleExport = (name: string) => {
    alert(`Exporting ${name} bundle to ~/.vmobile/exports/${name}.tar.zst`);
  };

  const handleSaveSettings = async (name: string, config: UpdateDeviceConfig) => {
    await fetch(`/api/devices/${encodeURIComponent(name)}/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    refreshDevices();
  };

  const handleCreateSubmit = async (data: CreateDeviceRequest) => {
    setShowCreate(false);
    try {
      const res = await fetch('/api/devices/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.taskId) {
        setSelectedName(data.name);
        refreshDevices();
      }
    } catch (err: any) {
      alert(`Error creating device: ${err.message}`);
    }
  };

  const handleCancelTask = async (id: string) => {
    await fetch(`/api/tasks/${id}/cancel`, { method: 'POST' });
  };

  const selectedDevice = devices.find((d) => d.name === selectedName || d.id === selectedName);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      <TitleBar
        readinessChecks={readinessChecks}
        onOpenReadiness={() => setShowReadiness(true)}
        onRefresh={() => {
          refreshDevices();
          refreshReadiness();
        }}
        isRefreshing={isRefreshing}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          devices={devices}
          selectedId={selectedName}
          onSelect={(name) => setSelectedName(name)}
          onOpenCreate={() => setShowCreate(true)}
          onImport={() => alert('Import VM feature: Select .tar.zst archive')}
        />

        {selectedDevice ? (
          <DeviceDetailView
            device={selectedDevice}
            onStart={handleStart}
            onStop={handleStop}
            onDelete={handleDelete}
            onClone={handleClone}
            onRename={handleRename}
            onExport={handleExport}
            onOpenSettings={(dev) => setEditingDevice(dev)}
          />
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--bg)',
              gap: 16,
              padding: 32,
            }}
          >
            <Smartphone size={48} color="var(--faint)" />
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--dim)' }}>
              No Mobile Device Selected
            </h3>
            <p style={{ fontSize: 13, color: 'var(--faint)', maxWidth: 360, textAlign: 'center' }}>
              Select an Android or iOS device from the library on the left, or create a new virtual device.
            </p>
            <button onClick={() => setShowCreate(true)} className="btn-primary" style={{ marginTop: 8 }}>
              <Plus size={15} />
              <span>Create New Device / VM</span>
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateWizardModal
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreateSubmit}
        />
      )}

      {showReadiness && (
        <HostReadinessModal
          checks={readinessChecks}
          onClose={() => setShowReadiness(false)}
          onRefresh={refreshReadiness}
          isRefreshing={isRefreshing}
        />
      )}

      {editingDevice && (
        <SettingsModal
          device={editingDevice}
          onClose={() => setEditingDevice(null)}
          onSave={handleSaveSettings}
        />
      )}

      {activeTask && (
        <TaskConsoleModal
          task={activeTask}
          onClose={() => setActiveTask(null)}
          onCancel={handleCancelTask}
        />
      )}
    </div>
  );
};
