import React from 'react';
import { Smartphone, RefreshCw, Sun, Moon, ShieldCheck, ShieldAlert, Cpu } from 'lucide-react';
import { StatusPill } from './StatusWidgets.js';
import { HostCheck } from '../../shared/types.js';

interface TitleBarProps {
  readinessChecks: HostCheck[];
  onOpenReadiness: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  readinessChecks,
  onOpenReadiness,
  onRefresh,
  isRefreshing,
  theme,
  onToggleTheme,
}) => {
  const attentionCount = readinessChecks.filter((c) => c.status === 'attention').count ||
    readinessChecks.filter((c) => c.status === 'attention').length;

  return (
    <div
      style={{
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        backgroundColor: 'var(--surface2)',
        borderBottom: '1px solid var(--border)',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: 'linear-gradient(135deg, var(--accent) 0%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
          }}
        >
          <Smartphone size={15} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', letterSpacing: 0.2 }}>
          vMobile Workstation
        </span>
        <span
          style={{
            fontSize: 11,
            color: 'var(--faint)',
            background: 'var(--inset)',
            padding: '2px 6px',
            borderRadius: 4,
            border: '1px solid var(--border)',
          }}
        >
          Windows 11
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={onOpenReadiness}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          title="Click to view host readiness diagnostics"
        >
          <StatusPill
            kind={attentionCount === 0 ? 'running' : 'warn'}
            label={attentionCount === 0 ? 'Host ready' : `${attentionCount} need attention`}
          />
        </button>

        <button
          onClick={onRefresh}
          style={{
            color: 'var(--dim)',
            padding: 6,
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Refresh device state"
        >
          <RefreshCw size={15} className={isRefreshing ? 'spin' : ''} />
        </button>

        <button
          onClick={onToggleTheme}
          style={{
            color: 'var(--dim)',
            padding: 6,
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </div>
  );
};
