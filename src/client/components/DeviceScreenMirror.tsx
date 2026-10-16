import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Smartphone,
  Play,
  RotateCcw,
  ArrowLeft,
  Circle,
  Square,
  Power,
  Volume2,
  Volume1,
  Maximize2,
  Send,
} from 'lucide-react';
import { DeviceReport } from '../../shared/types.js';

interface DeviceScreenMirrorProps {
  device: DeviceReport;
  onClose?: () => void;
}

export const DeviceScreenMirror: React.FC<DeviceScreenMirrorProps> = ({ device }) => {
  const [screenUrl, setScreenUrl] = useState<string>('');
  const [inputText, setInputText] = useState<string>('');
  const dragStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const fetchFrame = useCallback(async () => {
    try {
      const res = await fetch(`/api/devices/${encodeURIComponent(device.name)}/screen?t=${Date.now()}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setScreenUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      }
    } catch {
      // ignore
    }
  }, [device.name]);

  // Poll screen frames at ~600ms when running
  useEffect(() => {
    let active = true;
    let timer: NodeJS.Timeout;

    const poll = async () => {
      if (!active) return;
      await fetchFrame();
      if (active) {
        timer = setTimeout(poll, device.status === 'running' ? 600 : 2000);
      }
    };

    poll();

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [fetchFrame, device.status]);

  // Handle touch tap or swipe forwarding
  const handleMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const devW = device.display.width || 1080;
    const devH = device.display.height || 2400;

    const scaleX = devW / rect.width;
    const scaleY = devH / rect.height;

    dragStartRef.current = {
      x: clickX * scaleX,
      y: clickY * scaleY,
      time: Date.now(),
    };
  };

  const handleMouseUp = async (e: React.MouseEvent<HTMLImageElement>) => {
    if (!dragStartRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const devW = device.display.width || 1080;
    const devH = device.display.height || 2400;

    const scaleX = devW / rect.width;
    const scaleY = devH / rect.height;

    const endX = clickX * scaleX;
    const endY = clickY * scaleY;
    const startX = dragStartRef.current.x;
    const startY = dragStartRef.current.y;
    const duration = Date.now() - dragStartRef.current.time;

    dragStartRef.current = null;

    const distance = Math.hypot(endX - startX, endY - startY);

    try {
      if (distance < 10) {
        // Tap
        await fetch(`/api/devices/${encodeURIComponent(device.name)}/input/tap`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ x: startX, y: startY }),
        });
      } else {
        // Swipe
        await fetch(`/api/devices/${encodeURIComponent(device.name)}/input/swipe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            x1: startX,
            y1: startY,
            x2: endX,
            y2: endY,
            durationMs: Math.max(100, duration),
          }),
        });
      }
      setTimeout(fetchFrame, 80);
    } catch {
      // ignore
    }
  };

  const sendKey = async (keyCode: number) => {
    try {
      await fetch(`/api/devices/${encodeURIComponent(device.name)}/input/key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyCode }),
      });
      setTimeout(fetchFrame, 80);
    } catch {
      // ignore
    }
  };

  const sendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    try {
      await fetch(`/api/devices/${encodeURIComponent(device.name)}/input/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });
      setInputText('');
      setTimeout(fetchFrame, 80);
    } catch {
      // ignore
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px',
        backgroundColor: 'var(--inset)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        gap: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Smartphone size={16} color="var(--accent)" />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Interactive Display & Touch Control</span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--faint)' }}>Click or drag screen to interact</span>
      </div>

      {/* Phone Screen Mockup Window */}
      <div
        style={{
          width: 280,
          height: 560,
          backgroundColor: '#000',
          borderRadius: 36,
          border: '5px solid var(--border-strong)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.55)',
        }}
      >
        {/* Notch / Dynamic Island */}
        <div
          style={{
            position: 'absolute',
            top: 7,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 84,
            height: 16,
            backgroundColor: '#000',
            borderRadius: 10,
            zIndex: 10,
          }}
        />

        {/* Display Canvas / Image */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0e1014',
            cursor: 'pointer',
          }}
        >
          {screenUrl ? (
            <img
              src={screenUrl}
              alt="Device Screen"
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              draggable={false}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                userSelect: 'none',
              }}
            />
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--faint)', fontSize: 12 }}>
              Connecting display...
            </div>
          )}
        </div>
      </div>

      {/* Hardware Buttons Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '6px 14px',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 9999,
        }}
      >
        <button
          onClick={() => sendKey(4)} // Back
          title="Back (Keycode 4)"
          style={{ padding: 6, color: 'var(--text)', display: 'flex' }}
        >
          <ArrowLeft size={16} />
        </button>

        <button
          onClick={() => sendKey(3)} // Home
          title="Home (Keycode 3)"
          style={{ padding: 6, color: 'var(--text)', display: 'flex' }}
        >
          <Circle size={16} />
        </button>

        <button
          onClick={() => sendKey(187)} // App Switcher
          title="Recent Apps (Keycode 187)"
          style={{ padding: 6, color: 'var(--text)', display: 'flex' }}
        >
          <Square size={15} />
        </button>

        <div style={{ width: 1, height: 16, backgroundColor: 'var(--border)' }} />

        <button
          onClick={() => sendKey(24)} // Vol Up
          title="Volume Up"
          style={{ padding: 6, color: 'var(--text)', display: 'flex' }}
        >
          <Volume2 size={16} />
        </button>

        <button
          onClick={() => sendKey(25)} // Vol Down
          title="Volume Down"
          style={{ padding: 6, color: 'var(--text)', display: 'flex' }}
        >
          <Volume1 size={16} />
        </button>

        <button
          onClick={() => sendKey(26)} // Power
          title="Power Button"
          style={{ padding: 6, color: 'var(--crit)', display: 'flex' }}
        >
          <Power size={15} />
        </button>
      </div>

      {/* Quick Text Input to Device */}
      <form
        onSubmit={sendText}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          maxWidth: 380,
        }}
      >
        <input
          type="text"
          placeholder="Type text to send to device keyboard..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          style={{
            flex: 1,
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 10px',
            color: 'var(--text)',
            fontSize: 12.5,
            outline: 'none',
          }}
        />
        <button type="submit" className="btn-secondary" style={{ padding: '6px 12px' }}>
          <Send size={13} />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};
