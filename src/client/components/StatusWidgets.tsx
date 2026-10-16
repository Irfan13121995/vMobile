import React from 'react';
import { Smartphone, CheckCircle2, Clock, AlertTriangle, AlertCircle, RefreshCw } from 'lucide-react';
import { Platform } from '../../shared/types.js';

export const StatusDot: React.FC<{ running: boolean }> = ({ running }) => (
  <span
    className={running ? 'pulse-dot' : ''}
    style={{
      display: 'inline-block',
      width: 8,
      height: 8,
      borderRadius: '50%',
      backgroundColor: running ? 'var(--good)' : 'rgba(105, 114, 127, 0.6)',
      boxShadow: running ? '0 0 8px rgba(63, 185, 80, 0.4)' : 'none',
      flexShrink: 0,
    }}
  />
);

export const StatusPill: React.FC<{
  kind: 'running' | 'stopped' | 'warn';
  label: string;
  onClick?: () => void;
}> = ({ kind, label, onClick }) => {
  const isRunning = kind === 'running';
  const isWarn = kind === 'warn';

  const color = isRunning ? 'var(--good)' : isWarn ? 'var(--warn)' : 'var(--faint)';
  const bg = isRunning
    ? 'rgba(63, 185, 80, 0.14)'
    : isWarn
    ? 'rgba(210, 153, 34, 0.16)'
    : 'var(--inset)';
  const border = isRunning
    ? 'rgba(63, 185, 80, 0.3)'
    : isWarn
    ? 'rgba(210, 153, 34, 0.35)'
    : 'var(--border)';

  return (
    <div
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px',
        borderRadius: 9999,
        backgroundColor: bg,
        border: `1px solid ${border}`,
        color: kind === 'stopped' ? 'var(--dim)' : color,
        fontSize: 12,
        fontWeight: 600,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          backgroundColor: color,
        }}
      />
      <span>{label}</span>
    </div>
  );
};

export const StageChip: React.FC<{
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}> = ({ label, status }) => {
  let color = 'var(--faint)';
  let bg = 'transparent';
  let border = 'var(--border)';
  let icon = <Clock size={12} />;

  if (status === 'completed') {
    color = 'var(--good)';
    bg = 'rgba(63, 185, 80, 0.15)';
    border = 'rgba(63, 185, 80, 0.3)';
    icon = <CheckCircle2 size={12} />;
  } else if (status === 'running') {
    color = 'var(--accent)';
    bg = 'rgba(91, 155, 255, 0.18)';
    border = 'rgba(91, 155, 255, 0.4)';
    icon = <RefreshCw size={12} className="spin" />;
  } else if (status === 'failed') {
    color = 'var(--crit)';
    bg = 'rgba(248, 81, 73, 0.15)';
    border = 'rgba(248, 81, 73, 0.3)';
    icon = <AlertCircle size={12} />;
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 9999,
        backgroundColor: bg,
        border: `1px solid ${border}`,
        color,
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
};

export const VariantBadge: React.FC<{ variant: string }> = ({ variant }) => {
  const v = variant.toLowerCase();
  let label = variant;
  let bg = 'var(--surface2)';
  let color = 'var(--text)';
  let border = 'var(--border)';

  if (v.includes('root') || v.includes('magisk') || v.includes('jb') || v.includes('jailbreak')) {
    label = 'Rooted / Jailbreak';
    bg = 'rgba(248, 81, 73, 0.15)';
    color = '#ff7b72';
    border = 'rgba(248, 81, 73, 0.3)';
  } else if (v.includes('dev') || v.includes('developer')) {
    label = 'Developer';
    bg = 'rgba(91, 155, 255, 0.15)';
    color = 'var(--accent)';
    border = 'rgba(91, 155, 255, 0.3)';
  } else if (v.includes('google') || v.includes('regular') || v.includes('stock')) {
    label = 'Stock / Google';
    bg = 'rgba(63, 185, 80, 0.15)';
    color = 'var(--good)';
    border = 'rgba(63, 185, 80, 0.3)';
  } else if (v.includes('exp') || v.includes('experimental')) {
    label = 'Experimental';
    bg = 'rgba(210, 153, 34, 0.15)';
    color = 'var(--warn)';
    border = 'rgba(210, 153, 34, 0.3)';
  }

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        backgroundColor: bg,
        color,
        border: `1px solid ${border}`,
      }}
    >
      {label}
    </span>
  );
};

export const PlatformBadge: React.FC<{ platform: Platform; small?: boolean }> = ({ platform, small }) => {
  const isAndroid = platform === 'android';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: small ? '1px 6px' : '2px 8px',
        borderRadius: 4,
        fontSize: small ? 10 : 11,
        fontWeight: 700,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
        backgroundColor: isAndroid ? 'rgba(63, 185, 80, 0.18)' : 'rgba(91, 155, 255, 0.18)',
        color: isAndroid ? '#56d364' : '#79c0ff',
        border: `1px solid ${isAndroid ? 'rgba(63, 185, 80, 0.35)' : 'rgba(91, 155, 255, 0.35)'}`,
      }}
    >
      {isAndroid ? 'Android' : 'iOS'}
    </span>
  );
};
