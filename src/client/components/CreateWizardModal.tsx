import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Check, Smartphone, Apple, Cpu, HardDrive, Shield } from 'lucide-react';
import { CreateDeviceRequest, Platform } from '../../shared/types.js';

interface CreateWizardModalProps {
  onClose: () => void;
  onSubmit: (data: CreateDeviceRequest) => void;
}

export const CreateWizardModal: React.FC<CreateWizardModalProps> = ({ onClose, onSubmit }) => {
  const [step, setStep] = useState(0);

  // Form State
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<Platform>('android');
  const [osVersion, setOsVersion] = useState('15');
  const [variant, setVariant] = useState('google-apis');
  const [cpuCount, setCpuCount] = useState(4);
  const [memoryMB, setMemoryMB] = useState(4096);
  const [diskGB, setDiskGB] = useState(32);
  const [displayPreset, setDisplayPreset] = useState('phone');
  const [displayWidth, setDisplayWidth] = useState(1080);
  const [displayHeight, setDisplayHeight] = useState(2400);
  const [displayDpi, setDisplayDpi] = useState(420);

  const steps = ['Platform & Name', 'OS & Variant', 'Resources', 'Review'];

  const nameValid = name.trim().length > 0 && !name.includes('/') && !name.startsWith('.');

  const handlePresetChange = (preset: string) => {
    setDisplayPreset(preset);
    if (preset === 'phone') {
      setDisplayWidth(1080);
      setDisplayHeight(2400);
      setDisplayDpi(420);
    } else if (preset === 'flagship') {
      setDisplayWidth(1440);
      setDisplayHeight(3120);
      setDisplayDpi(500);
    } else if (preset === 'tablet') {
      setDisplayWidth(1600);
      setDisplayHeight(2560);
      setDisplayDpi(320);
    } else if (preset === 'foldable') {
      setDisplayWidth(1812);
      setDisplayHeight(2176);
      setDisplayDpi(374);
    }
  };

  const handleFinish = () => {
    onSubmit({
      name: name.trim(),
      platform,
      osVersion,
      variant,
      cpuCount,
      memoryMB,
      diskGB,
      displayWidth,
      displayHeight,
      displayDpi,
      presetModel: displayPreset === 'tablet' ? 'Pixel Tablet' : 'Google Pixel 8',
    });
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
          width: 680,
          maxHeight: '90vh',
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
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Create Virtual Device</h2>
            <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 2 }}>
              Step {step + 1} of {steps.length}: {steps[step]}
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--faint)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Step Rail Indicator */}
        <div style={{ display: 'flex', padding: '0 20px', borderBottom: '1px solid var(--border)' }}>
          {steps.map((st, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                padding: '10px 0',
                fontSize: 12,
                fontWeight: 600,
                textAlign: 'center',
                color: i === step ? 'var(--accent)' : i < step ? 'var(--good)' : 'var(--faint)',
                borderBottom: i === step ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              {st}
            </div>
          ))}
        </div>

        {/* Body Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* STEP 0: Platform & Name */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>
                  Target Mobile Platform
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div
                    onClick={() => {
                      setPlatform('android');
                      setOsVersion('15');
                      setVariant('google-apis');
                    }}
                    style={{
                      padding: 16,
                      borderRadius: 'var(--radius-sm)',
                      border: `2px solid ${platform === 'android' ? 'var(--good)' : 'var(--border)'}`,
                      backgroundColor: platform === 'android' ? 'rgba(63, 185, 80, 0.1)' : 'var(--surface2)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--good)' }}>
                      <Smartphone size={20} />
                      <span style={{ fontWeight: 700, fontSize: 15 }}>Android</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--dim)', marginTop: 6 }}>
                      Android Virtual Device (AVD) with WHPX acceleration, Google Play services, or Magisk root.
                    </p>
                  </div>

                  <div
                    onClick={() => {
                      setPlatform('ios');
                      setOsVersion('18.2');
                      setVariant('developer');
                    }}
                    style={{
                      padding: 16,
                      borderRadius: 'var(--radius-sm)',
                      border: `2px solid ${platform === 'ios' ? 'var(--accent)' : 'var(--border)'}`,
                      backgroundColor: platform === 'ios' ? 'rgba(91, 155, 255, 0.1)' : 'var(--surface2)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)' }}>
                      <Apple size={20} />
                      <span style={{ fontWeight: 700, fontSize: 15 }}>iOS</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--dim)', marginTop: 6 }}>
                      Virtual iPhone / Research VM pairing iOS with cloudOS, PCC research tools, or connected device.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
                  Device Name
                </label>
                <input
                  type="text"
                  placeholder={platform === 'android' ? 'Pixel_8_Pro_Dev' : 'iPhone_16_Pro_Dev'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface2)',
                    color: 'var(--text)',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: 11, color: 'var(--faint)', marginTop: 4, display: 'block' }}>
                  Use letters, numbers, underscores or hyphens.
                </span>
              </div>
            </div>
          )}

          {/* STEP 1: OS & Variant */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>
                  Operating System Version
                </label>
                <select
                  value={osVersion}
                  onChange={(e) => setOsVersion(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface2)',
                    color: 'var(--text)',
                    fontSize: 13,
                  }}
                >
                  {platform === 'android' ? (
                    <>
                      <option value="15">Android 15 (VanillaIceCream - API 35)</option>
                      <option value="14">Android 14 (UpsideDownCake - API 34)</option>
                      <option value="13">Android 13 (Tiramisu - API 33)</option>
                      <option value="12">Android 12 (S - API 31)</option>
                    </>
                  ) : (
                    <>
                      <option value="18.2">iOS 18.2 (Build 22C150)</option>
                      <option value="18.0">iOS 18.0 (Build 22A3354)</option>
                      <option value="17.5">iOS 17.5 (Build 21F79)</option>
                      <option value="16.6">iOS 16.6 (Build 20G75)</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>
                  Security & Build Variant
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    {
                      id: platform === 'android' ? 'google-apis' : 'regular',
                      name: platform === 'android' ? 'Google APIs & Play Store' : 'Regular (Production)',
                      desc: 'Standard mobile environment with official security sandbox enabled.',
                    },
                    {
                      id: 'developer',
                      name: 'Developer (Eng / Debug)',
                      desc: 'Relaxed permissions, debug symbols, developer options, and adb root capabilities.',
                    },
                    {
                      id: platform === 'android' ? 'root-magisk' : 'jailbreak',
                      name: platform === 'android' ? 'Rooted / Magisk Privileged' : 'Jailbreak / Research',
                      desc: 'Full root access, bypasses kernel constraints for security auditing and reverse engineering.',
                    },
                  ].map((v) => (
                    <div
                      key={v.id}
                      onClick={() => setVariant(v.id)}
                      style={{
                        padding: 12,
                        borderRadius: 'var(--radius-sm)',
                        border: `1px solid ${variant === v.id ? 'var(--accent)' : 'var(--border)'}`,
                        backgroundColor: variant === v.id ? 'rgba(91, 155, 255, 0.12)' : 'var(--surface2)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{v.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--dim)', marginTop: 2 }}>{v.desc}</div>
                      </div>
                      {variant === v.id && <Check size={16} color="var(--accent)" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Resources & Display */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>CPU Cores</label>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{cpuCount} Cores</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="16"
                  value={cpuCount}
                  onChange={(e) => setCpuCount(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Memory (RAM)</label>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{memoryMB} MB ({(memoryMB / 1024).toFixed(1)} GB)</span>
                </div>
                <input
                  type="range"
                  min="1024"
                  max="16384"
                  step="1024"
                  value={memoryMB}
                  onChange={(e) => setMemoryMB(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Virtual Storage</label>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{diskGB} GB</span>
                </div>
                <input
                  type="range"
                  min="16"
                  max="128"
                  step="16"
                  value={diskGB}
                  onChange={(e) => setDiskGB(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: 'block' }}>Display Preset</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {[
                    { id: 'phone', label: 'Phone', res: '1080x2400' },
                    { id: 'flagship', label: 'Pro/Ultra', res: '1440x3120' },
                    { id: 'tablet', label: 'Tablet', res: '1600x2560' },
                    { id: 'foldable', label: 'Foldable', res: '1812x2176' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handlePresetChange(p.id)}
                      style={{
                        padding: '8px 4px',
                        borderRadius: 'var(--radius-sm)',
                        border: `1px solid ${displayPreset === p.id ? 'var(--accent)' : 'var(--border)'}`,
                        backgroundColor: displayPreset === p.id ? 'rgba(91, 155, 255, 0.15)' : 'var(--surface2)',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{p.label}</div>
                      <div style={{ fontSize: 10, color: 'var(--faint)' }}>{p.res}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Review */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: 14, backgroundColor: 'var(--surface2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: 'var(--accent)' }}>Configuration Summary</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12.5 }}>
                  <div><span style={{ color: 'var(--dim)' }}>Name:</span> <strong>{name}</strong></div>
                  <div><span style={{ color: 'var(--dim)' }}>Platform:</span> <strong>{platform.toUpperCase()}</strong></div>
                  <div><span style={{ color: 'var(--dim)' }}>OS Version:</span> <strong>{osVersion}</strong></div>
                  <div><span style={{ color: 'var(--dim)' }}>Variant:</span> <strong>{variant}</strong></div>
                  <div><span style={{ color: 'var(--dim)' }}>CPU:</span> <strong>{cpuCount} Cores</strong></div>
                  <div><span style={{ color: 'var(--dim)' }}>Memory:</span> <strong>{memoryMB} MB</strong></div>
                  <div><span style={{ color: 'var(--dim)' }}>Storage:</span> <strong>{diskGB} GB</strong></div>
                  <div><span style={{ color: 'var(--dim)' }}>Display:</span> <strong>{displayWidth}x{displayHeight} ({displayDpi} dpi)</strong></div>
                </div>
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: 'var(--dim)',
                  lineHeight: 1.5,
                  padding: '10px 14px',
                  backgroundColor: 'rgba(91, 155, 255, 0.08)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                Clicking Create will allocate virtual storage, configure hardware settings, apply the selected security variant, and register the VM into vMobile Workstation.
              </div>
            </div>
          )}
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
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="btn-secondary"
          >
            <ChevronLeft size={14} />
            <span>Back</span>
          </button>

          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 0 && !nameValid}
              className="btn-primary"
            >
              <span>Continue</span>
              <ChevronRight size={14} />
            </button>
          ) : (
            <button onClick={handleFinish} className="btn-primary">
              <Check size={14} />
              <span>Create Device</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
