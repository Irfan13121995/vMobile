import React, { useEffect, useRef } from 'react';
import { X, CheckCircle2, AlertCircle, RefreshCw, Download, Ban } from 'lucide-react';
import { TaskModel } from '../../shared/types.js';
import { StageChip } from './StatusWidgets.js';

interface TaskConsoleModalProps {
  task: TaskModel;
  onClose: () => void;
  onCancel: (id: string) => void;
}

export const TaskConsoleModal: React.FC<TaskConsoleModalProps> = ({ task, onClose, onCancel }) => {
  const logEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [task.logs.length]);

  const exportLog = () => {
    const text = task.logs.join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${task.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_log.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isRunning = task.status === 'running';

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
          width: 720,
          maxHeight: '85vh',
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{task.title}</h2>
            {task.status === 'running' && (
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 9999, backgroundColor: 'rgba(91, 155, 255, 0.2)', color: 'var(--accent)', fontWeight: 600 }}>
                Running
              </span>
            )}
            {task.status === 'completed' && (
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 9999, backgroundColor: 'rgba(63, 185, 80, 0.2)', color: 'var(--good)', fontWeight: 600 }}>
                Completed
              </span>
            )}
            {task.status === 'failed' && (
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 9999, backgroundColor: 'rgba(248, 81, 73, 0.2)', color: 'var(--crit)', fontWeight: 600 }}>
                Failed
              </span>
            )}
          </div>
          <button onClick={onClose} style={{ color: 'var(--faint)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Stage Chips */}
        {task.stages.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 20px',
              borderBottom: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              overflowX: 'auto',
            }}
          >
            {task.stages.map((st) => (
              <StageChip key={st.id} label={st.label} status={st.status} />
            ))}
          </div>
        )}

        {/* Terminal Logs */}
        <div
          className="font-mono"
          style={{
            flex: 1,
            overflowY: 'auto',
            backgroundColor: 'var(--log-bg)',
            padding: '16px 20px',
            fontSize: 12,
            lineHeight: 1.55,
            color: 'var(--log-text)',
            minHeight: 280,
          }}
        >
          {task.logs.map((line, idx) => {
            let color = 'var(--log-text)';
            if (line.startsWith('[+]')) color = 'var(--good)';
            else if (line.startsWith('[*]')) color = 'var(--accent)';
            else if (line.startsWith('[!]')) color = 'var(--crit)';
            else if (line.startsWith('[-]')) color = 'var(--faint)';
            else if (line.startsWith('===')) color = '#d29922';

            return (
              <div key={idx} style={{ color }}>
                {line}
              </div>
            );
          })}
          <div ref={logEndRef} />
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border)',
            backgroundColor: 'var(--surface2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={exportLog} className="btn-secondary">
              <Download size={13} />
              <span>Export Log…</span>
            </button>
            {isRunning && (
              <button onClick={() => onCancel(task.id)} className="btn-danger">
                <Ban size={13} />
                <span>Cancel</span>
              </button>
            )}
          </div>

          <button onClick={onClose} className="btn-primary">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
