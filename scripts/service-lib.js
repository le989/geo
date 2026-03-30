const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn, execFileSync } = require('node:child_process');

const ROOT = process.cwd();
const PORT = 3301;
const PID_FILE = path.join(ROOT, '.service-3301.pid');
const LOG_FILE = path.join(ROOT, '.service-3301.log');
const ERR_FILE = path.join(ROOT, '.service-3301.err.log');
const NEXT_BIN = path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');

function readPid() {
  if (!fs.existsSync(PID_FILE)) return null;
  const raw = fs.readFileSync(PID_FILE, 'utf8').trim();
  const pid = Number(raw);
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

function writePid(pid) {
  fs.writeFileSync(PID_FILE, String(pid), 'utf8');
}

function clearPid() {
  if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
}

function isProcessAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function findPidOnPort(port) {
  try {
    const output = execFileSync('cmd', ['/c', 'netstat', '-ano', '-p', 'tcp'], {
      cwd: ROOT,
      encoding: 'utf8',
      windowsHide: true,
    });
    const lines = output
      .split(/\r?\n/)
      .filter((line) => line.includes(`:${port}`) && line.includes('LISTENING'));
    const first = lines[0];
    if (!first) return null;
    const parts = first.trim().split(/\s+/);
    const pid = Number(parts[parts.length - 1]);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function isPortReachable(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    };

    socket.setTimeout(750);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

function taskkill(pid) {
  return new Promise((resolve, reject) => {
    const child = spawn('cmd', ['/c', 'taskkill', '/PID', String(pid), '/F', '/T'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`taskkill exit ${code}`))));
    child.on('error', reject);
  });
}

async function startService() {
  const pid = readPid();
  if (pid && isProcessAlive(pid)) {
    console.log(`Service already running on port ${PORT} (PID ${pid})`);
    return;
  }

  if (await isPortReachable(PORT)) {
    const pidOnPort = findPidOnPort(PORT);
    if (pidOnPort && isProcessAlive(pidOnPort)) {
      console.log(`Port ${PORT} is already in use by PID ${pidOnPort}`);
      return;
    }
    console.log(`Port ${PORT} is already in use`);
    return;
  }

  const out = fs.openSync(LOG_FILE, 'a');
  const err = fs.openSync(ERR_FILE, 'a');
  const child = spawn(process.execPath, [NEXT_BIN, 'start', '-p', String(PORT)], {
    cwd: ROOT,
    detached: true,
    stdio: ['ignore', out, err],
    windowsHide: true,
  });
  child.unref();
  writePid(child.pid);
  console.log(`Service started on http://localhost:${PORT} (PID ${child.pid})`);
}

async function stopService() {
  let pid = readPid();
  if (pid && !isProcessAlive(pid)) {
    clearPid();
    pid = null;
  }

  if (!pid) {
    const pidOnPort = findPidOnPort(PORT);
    if (pidOnPort && isProcessAlive(pidOnPort)) {
      pid = pidOnPort;
    } else if (await isPortReachable(PORT)) {
      console.log(`Service is responding on port ${PORT}, but no manageable PID was found`);
      return;
    } else {
      console.log('Service is not running');
      return;
    }
  }

  if (process.platform === 'win32') {
    await taskkill(pid);
  } else {
    process.kill(pid, 'SIGTERM');
  }
  clearPid();
  console.log(`Service stopped (PID ${pid})`);
}

async function serviceStatus() {
  const pid = readPid();
  if (pid && isProcessAlive(pid)) {
    console.log(`Service running on port ${PORT} (PID ${pid})`);
    return;
  }
  if (pid) clearPid();

  const pidOnPort = findPidOnPort(PORT);
  if (pidOnPort && isProcessAlive(pidOnPort)) {
    console.log(`Service running on port ${PORT} (PID ${pidOnPort}, unmanaged)`);
    return;
  }

  if (await isPortReachable(PORT)) {
    console.log(`Service responding on port ${PORT} (PID unavailable)`);
    return;
  }

  console.log('Service is not running');
}

module.exports = {
  PORT,
  PID_FILE,
  LOG_FILE,
  ERR_FILE,
  readPid,
  writePid,
  clearPid,
  isProcessAlive,
  findPidOnPort,
  isPortReachable,
  startService,
  stopService,
  serviceStatus,
};
