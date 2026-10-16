import React, { useState } from 'react';
import { Terminal, Send, Trash2 } from 'lucide-react';
import { DeviceReport } from '../../shared/types.js';

interface DeviceTerminalProps {
  device: DeviceReport;
}

export const DeviceTerminal: React.FC<DeviceTerminalProps> = ({ device }) => {
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<Array<{ cmd: string; out: string; err: string }>>([
    {
      cmd: 'uname -a',
      out: `Linux localhost 6.1.0-android14-x86_64 #1 SMP PREEMPT Wed Oct 14 00:00:00 UTC 2026 x86_64`,
      err: '',
    },
  ]);
  const [isRunning, setIsRunning] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = command.trim();
    if (!cmd) return;

    setIsRunning(true);
    try {
      const res = await fetch(`/api/devices/${encodeURIComponent(device.name)}/shell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd }),
      });
      const data = await res.json();
      setHistory((prev) => [...prev, { cmd, out: data.stdout || '', err: data.stderr || '' }]);
      setCommand('');
    } catch (err: any) {
      setHistory((prev) => [...prev, { cmd, out: '', err: err.message }]);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--log-bg)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        height: 380,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--surface2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}>
          <Terminal size={14} color="var(--accent)" />
          <span>Interactive Shell — {device.name}</span>
        </div>
        <button
          onClick={() => setHistory([])}
          style={{ color: 'var(--faint)', padding: 4 }}
          title="Clear Terminal"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <div
        className="font-mono"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          fontSize: 12,
          lineHeight: 1.5,
          color: 'var(--log-text)',
        }}
      >
        {history.map((h, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ color: 'var(--accent)' }}>
              $ {h.cmd}
            </div>
            {h.out && <pre style={{ whiteSpace: 'pre-wrap', color: 'var(--log-text)', marginTop: 2 }}>{h.out}</pre>}
            {h.err && <pre style={{ whiteSpace: 'pre-wrap', color: 'var(--crit)', marginTop: 2 }}>{h.err}</pre>}
          </div>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          borderTop: '1px solid var(--border)',
          backgroundColor: 'var(--surface)',
          gap: 8,
        }}
      >
        <span className="font-mono" style={{ color: 'var(--accent)', fontWeight: 700 }}>$</span>
        <input
          type="text"
          placeholder="Enter shell command (e.g. getprop, pm list packages, ls /sdcard)..."
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          disabled={isRunning}
          className="font-mono"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text)',
            fontSize: 12,
          }}
        />
        <button type="submit" disabled={isRunning || !command.trim()} className="btn-secondary" style={{ padding: '4px 10px' }}>
          <Send size={12} />
        </button>
      </form>
    </div>
  );
};
