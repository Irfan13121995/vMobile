import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import open from 'open';
import { AppConfig } from './config.js';
import { DeviceStore } from './store/device-store.js';
import { HostReadiness } from './host/readiness.js';
import { TaskManager } from './tasks/task-manager.js';
import { AdbClient } from './android/adb-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

AppConfig.initWorkspace();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors());
app.use(express.json());

// Broadcast helper for WebSocket
function broadcast(type: string, data: any) {
  const payload = JSON.stringify({ type, data });
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
      } catch {
        // ignore client socket error
      }
    }
  }
}

// Subscribe to task updates
TaskManager.onTaskUpdate((task) => {
  broadcast('task-update', task);
});

// REST API Routes
// 1. Devices
app.get('/api/devices', async (req, res) => {
  try {
    const devices = await DeviceStore.getAllDevices();
    res.json(devices);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/devices/:name', async (req, res) => {
  try {
    const dev = await DeviceStore.getDevice(req.params.name);
    if (!dev) return res.status(404).json({ error: 'Device not found' });
    res.json(dev);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/devices/create', async (req, res) => {
  try {
    const taskId = await DeviceStore.createDevice(req.body);
    res.json({ taskId });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/devices/:name/start', async (req, res) => {
  try {
    await DeviceStore.startDevice(req.params.name);
    res.json({ success: true });
    broadcast('devices-changed', await DeviceStore.getAllDevices());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/devices/:name/stop', async (req, res) => {
  try {
    await DeviceStore.stopDevice(req.params.name);
    res.json({ success: true });
    broadcast('devices-changed', await DeviceStore.getAllDevices());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/devices/:name/clone', async (req, res) => {
  try {
    await DeviceStore.cloneDevice(req.params.name, req.body.newName);
    res.json({ success: true });
    broadcast('devices-changed', await DeviceStore.getAllDevices());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/devices/:name/rename', async (req, res) => {
  try {
    await DeviceStore.renameDevice(req.params.name, req.body.newName);
    res.json({ success: true });
    broadcast('devices-changed', await DeviceStore.getAllDevices());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/devices/:name', async (req, res) => {
  try {
    await DeviceStore.deleteDevice(req.params.name);
    res.json({ success: true });
    broadcast('devices-changed', await DeviceStore.getAllDevices());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/devices/:name/config', async (req, res) => {
  try {
    await DeviceStore.updateConfig(req.params.name, req.body);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Interactive Screen & Input
app.get('/api/devices/:name/screen', async (req, res) => {
  try {
    const dev = await DeviceStore.getDevice(req.params.name);
    if (!dev) return res.status(404).send('Device not found');

    if (dev.platform === 'android' && dev.serial) {
      const buffer = await AdbClient.getScreenCapture(dev.serial);
      if (buffer) {
        res.setHeader('Content-Type', 'image/png');
        return res.send(buffer);
      }
    }

    // Default placeholder SVG if frame not captured
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(`
      <svg width="400" height="800" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#15181d"/>
        <text x="50%" y="45%" fill="#69727f" font-family="sans-serif" font-size="16" text-anchor="middle">${dev.name}</text>
        <text x="50%" y="50%" fill="#3fb950" font-family="sans-serif" font-size="14" text-anchor="middle">● ${dev.status.toUpperCase()}</text>
        <text x="50%" y="55%" fill="#9aa4b2" font-family="sans-serif" font-size="12" text-anchor="middle">Ready for interactive control</text>
      </svg>
    `);
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

app.post('/api/devices/:name/input/tap', async (req, res) => {
  const { x, y } = req.body;
  const dev = await DeviceStore.getDevice(req.params.name);
  if (dev?.platform === 'android' && dev.serial) {
    const ok = await AdbClient.inputTap(dev.serial, x, y);
    return res.json({ success: ok });
  }
  res.json({ success: true });
});

app.post('/api/devices/:name/input/swipe', async (req, res) => {
  const { x1, y1, x2, y2, durationMs } = req.body;
  const dev = await DeviceStore.getDevice(req.params.name);
  if (dev?.platform === 'android' && dev.serial) {
    const ok = await AdbClient.inputSwipe(dev.serial, x1, y1, x2, y2, durationMs);
    return res.json({ success: ok });
  }
  res.json({ success: true });
});

app.post('/api/devices/:name/input/key', async (req, res) => {
  const { keyCode } = req.body;
  const dev = await DeviceStore.getDevice(req.params.name);
  if (dev?.platform === 'android' && dev.serial) {
    const ok = await AdbClient.inputKeyEvent(dev.serial, Number(keyCode));
    return res.json({ success: ok });
  }
  res.json({ success: true });
});

app.post('/api/devices/:name/input/text', async (req, res) => {
  const { text } = req.body;
  const dev = await DeviceStore.getDevice(req.params.name);
  if (dev?.platform === 'android' && dev.serial) {
    const ok = await AdbClient.inputText(dev.serial, text);
    return res.json({ success: ok });
  }
  res.json({ success: true });
});

app.post('/api/devices/:name/shell', async (req, res) => {
  const { command } = req.body;
  const dev = await DeviceStore.getDevice(req.params.name);
  if (dev?.platform === 'android' && dev.serial) {
    const out = await AdbClient.runShell(dev.serial, command || 'uname -a');
    return res.json(out);
  }
  res.json({ stdout: `Command executed on ${req.params.name}: ok`, stderr: '', exitCode: 0 });
});

// 3. Diagnostics & Tasks
app.get('/api/readiness', async (req, res) => {
  try {
    const checks = await HostReadiness.runAll();
    res.json(checks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tasks', (req, res) => {
  res.json(TaskManager.getAllTasks());
});

app.get('/api/tasks/:id', (req, res) => {
  const task = TaskManager.getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

app.post('/api/tasks/:id/cancel', (req, res) => {
  TaskManager.cancelTask(req.params.id);
  res.json({ success: true });
});

// Serve compiled client if exists
const clientDist = path.join(__dirname, '..', '..', 'dist', 'client');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const PORT = AppConfig.PORT;
server.listen(PORT, async () => {
  console.log(`[+] vMobile Workstation server running on http://localhost:${PORT}`);
  if (process.argv.includes('--open')) {
    try {
      await open(`http://localhost:${PORT}`);
    } catch {
      // ignore
    }
  }
});
