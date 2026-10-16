import React, { useState } from 'react';
import { Search, Plus, Download, Smartphone, Apple, Terminal } from 'lucide-react';
import { DeviceReport, Platform } from '../../shared/types.js';
import { StatusDot, PlatformBadge } from './StatusWidgets.js';

interface SidebarProps {
  devices: DeviceReport[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpenCreate: () => void;
  onImport: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  devices,
  selectedId,
  onSelect,
  onOpenCreate,
  onImport,
}) => {
  const [platformFilter, setPlatformFilter] = useState<'all' | 'android' | 'ios'>('all');
  const [query, setQuery] = useState('');

  const filtered = devices.filter((d) => {
    if (platformFilter !== 'all' && d.platform !== platformFilter) return false;
    if (query.trim() && !d.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const androidCount = devices.filter((d) => d.platform === 'android').length;
  const iosCount = devices.filter((d) => d.platform === 'ios').length;

  return (
    <div
      style={{
        width: 'var(--sidebar-w)',
        backgroundColor: 'var(--surface2)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flexShrink: 0,
      }}
    >
      {/* Platform Tabs */}
      <div
        style={{
          display: 'flex',
          padding: '8px 10px',
          gap: 4,
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--surface)',
        }}
      >
        <button
          onClick={() => setPlatformFilter('all')}
          style={{
            flex: 1,
            padding: '5px 0',
            fontSize: 11,
            fontWeight: 600,
            borderRadius: 6,
            textAlign: 'center',
            backgroundColor: platformFilter === 'all' ? 'var(--surface2)' : 'transparent',
            color: platformFilter === 'all' ? 'var(--text)' : 'var(--dim)',
            border: platformFilter === 'all' ? '1px solid var(--border)' : '1px solid transparent',
          }}
        >
          All ({devices.length})
        </button>
        <button
          onClick={() => setPlatformFilter('android')}
          style={{
            flex: 1,
            padding: '5px 0',
            fontSize: 11,
            fontWeight: 600,
            borderRadius: 6,
            textAlign: 'center',
            backgroundColor: platformFilter === 'android' ? 'rgba(63, 185, 80, 0.15)' : 'transparent',
            color: platformFilter === 'android' ? '#56d364' : 'var(--dim)',
            border: platformFilter === 'android' ? '1px solid rgba(63, 185, 80, 0.3)' : '1px solid transparent',
          }}
        >
          Android ({androidCount})
        </button>
        <button
          onClick={() => setPlatformFilter('ios')}
          style={{
            flex: 1,
            padding: '5px 0',
            fontSize: 11,
            fontWeight: 600,
            borderRadius: 6,
            textAlign: 'center',
            backgroundColor: platformFilter === 'ios' ? 'rgba(91, 155, 255, 0.15)' : 'transparent',
            color: platformFilter === 'ios' ? '#79c0ff' : 'var(--dim)',
            border: platformFilter === 'ios' ? '1px solid rgba(91, 155, 255, 0.3)' : '1px solid transparent',
          }}
        >
          iOS ({iosCount})
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ padding: '10px 10px 6px 10px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 10px',
          }}
        >
          <Search size={14} color="var(--faint)" />
          <input
            type="text"
            placeholder="Search devices..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              color: 'var(--text)',
              fontSize: 12.5,
              width: '100%',
              fontFamily: 'inherit',
            }}
          />
        </div>
      </div>

      {/* Device List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 12px', color: 'var(--faint)', fontSize: 13 }}>
            No devices found
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {filtered.map((d) => {
              const isSelected = selectedId === d.id || selectedId === d.name;
              return (
                <div
                  key={d.id}
                  onClick={() => onSelect(d.name)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isSelected ? 'rgba(91, 155, 255, 0.15)' : 'transparent',
                    border: isSelected ? '1px solid rgba(91, 155, 255, 0.3)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                  }}
                >
                  <div
                    style={{
                      color: isSelected
                        ? 'var(--accent)'
                        : d.platform === 'android'
                        ? 'var(--good)'
                        : 'var(--dim)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Smartphone size={18} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <StatusDot running={d.status === 'running'} />
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--text)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {d.name}
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginTop: 2,
                      }}
                    >
                      <PlatformBadge platform={d.platform} small />
                      <span
                        className="font-mono"
                        style={{
                          fontSize: 11,
                          color: 'var(--faint)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {d.osVersion}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div
        style={{
          padding: '10px 12px',
          borderTop: '1px solid var(--border)',
          backgroundColor: 'var(--surface2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <button
          onClick={onOpenCreate}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--accent)',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <Plus size={14} />
          <span>New Device / VM…</span>
        </button>

        <button
          onClick={onImport}
          style={{
            color: 'var(--dim)',
            padding: 4,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Import VM bundle (.tar.zst / .zip)"
        >
          <Download size={15} />
        </button>
      </div>
    </div>
  );
};
