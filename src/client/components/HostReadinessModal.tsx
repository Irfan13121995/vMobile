import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, Copy, Check, RefreshCw } from 'lucide-react';
import { HostCheck } from '../../shared/types.js';

interface HostReadinessModalProps {
  checks: HostCheck[];
  onClose: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const HostReadinessModal: React.FC<HostReadinessModalProps> = ({
  checks,
  onClose,
  onRefresh,
  isRefreshing,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
          width: 640,
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
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
              Host Readiness Diagnostics
            </h2>
            <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 2 }}>
              Hardware virtualization, SDK tools, and mobile bridge checks on Windows 11.
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--faint)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Check Items List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {checks.map((c) => {
            const isOk = c.status === 'ok';
            return (
              <div
                key={c.id}
                style={{
                  padding: 14,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--surface2)',
                  border: `1px solid ${isOk ? 'var(--border)' : 'rgba(210, 153, 34, 0.4)'}`,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <div style={{ marginTop: 2 }}>
                  {isOk ? (
                    <CheckCircle2 size={18} color="var(--good)" />
                  ) : (
                    <AlertTriangle size={18} color="var(--warn)" />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>
                    {c.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 4, lineHeight: 1.4 }}>
                    {c.detail}
                  </div>

                  {c.fixCommand && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: '6px 10px',
                        borderRadius: 6,
                        backgroundColor: 'var(--inset)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <code className="font-mono" style={{ fontSize: 11.5, color: 'var(--accent)' }}>
                        {c.fixCommand}
                      </code>
                      <button
                        onClick={() => copyToClipboard(c.id, c.fixCommand!)}
                        style={{ color: 'var(--dim)', display: 'flex', padding: 2 }}
                        title="Copy fix command"
                      >
                        {copiedId === c.id ? <Check size={13} color="var(--good)" /> : <Copy size={13} />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
          <button onClick={onRefresh} className="btn-secondary">
            <RefreshCw size={13} className={isRefreshing ? 'spin' : ''} />
            <span>Re-run Diagnostics</span>
          </button>

          <button onClick={onClose} className="btn-primary">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
