/**
 * ═══════════════════════════════════════════════════════════════
 *  UNIFIED DEV LAUNCHER — One command to rule them all
 *  Starts: MongoDB ➜ Backend (Express) ➜ Frontend (Vite)
 *  Usage:  npm run dev
 * ═══════════════════════════════════════════════════════════════
 */
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');

// ── Configuration ────────────────────────────────────────────
const BACKEND_PORT = 5011;
const FRONTEND_PORT = 5173;
const MONGO_PORT = 27017;
const MONGO_DB_PATH = 'C:\\data\\db'; // use existing MongoDB data folder with historic data

// ── Color helpers for console ────────────────────────────────
const c = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    red: '\x1b[31m',
    bgGreen: '\x1b[42m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
};

function tag(label, color) {
    return `${color}${c.bold}[${label}]${c.reset}`;
}

const MONGO_TAG   = tag('MongoDB ', c.green);
const BACKEND_TAG = tag('Backend ', c.cyan);
const FRONTEND_TAG = tag('Frontend', c.magenta);
const SYSTEM_TAG  = tag('System  ', c.yellow);

// Track child processes for cleanup
const children = [];

// ── Utility: Check if a port is in use ───────────────────────
function isPortInUse(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', () => resolve(true));
        server.once('listening', () => {
            server.close();
            resolve(false);
        });
        server.listen(port, '127.0.0.1');
    });
}

// ── Utility: Kill process on a port (Windows) ────────────────
function killPort(port) {
    try {
        const result = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { encoding: 'utf8' });
        const lines = result.trim().split('\n');
        const pids = new Set();
        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && pid !== '0') pids.add(pid);
        }
        for (const pid of pids) {
            try {
                execSync(`taskkill /F /PID ${pid}`, { encoding: 'utf8' });
                console.log(`${SYSTEM_TAG} Killed stale process PID ${pid} on port ${port}`);
            } catch (e) { /* process might already be gone */ }
        }
    } catch (e) {
        // No process found on port — that's fine
    }
}

// ── Spawn helper with live output ────────────────────────────
function spawnProcess(label, tagStr, command, args, options = {}) {
    const proc = spawn(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
        ...options,
    });

    proc.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(l => l.trim());
        for (const line of lines) {
            console.log(`${tagStr} ${line}`);
        }
    });

    proc.stderr.on('data', (data) => {
        const lines = data.toString().split('\n').filter(l => l.trim());
        for (const line of lines) {
            // Filter out noisy warnings, show actual errors
            if (line.includes('DeprecationWarning') || line.includes('ExperimentalWarning')) return;
            console.log(`${tagStr} ${c.red}${line}${c.reset}`);
        }
    });

    proc.on('error', (err) => {
        console.error(`${tagStr} ${c.red}Failed to start: ${err.message}${c.reset}`);
    });

    proc.on('exit', (code, signal) => {
        if (code !== null && code !== 0) {
            console.log(`${tagStr} ${c.yellow}Exited with code ${code}${c.reset}`);
        }
    });

    children.push(proc);
    return proc;
}

// ── Graceful Shutdown ────────────────────────────────────────
function shutdown(signal) {
    console.log(`\n${SYSTEM_TAG} ${c.yellow}Shutting down all services (${signal})...${c.reset}`);
    for (const child of children) {
        try {
            // On Windows, we need taskkill to kill process trees
            if (child.pid) {
                try {
                    execSync(`taskkill /F /T /PID ${child.pid}`, { encoding: 'utf8', stdio: 'ignore' });
                } catch (e) { /* already dead */ }
            }
        } catch (e) { /* ignore */ }
    }
    console.log(`${SYSTEM_TAG} ${c.green}All services stopped. Goodbye! 👋${c.reset}`);
    process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGHUP', () => shutdown('SIGHUP'));

// ── Main Startup Sequence ────────────────────────────────────
async function main() {
    console.log('');
    console.log(`${c.bold}${c.cyan}  ╔═══════════════════════════════════════════════╗${c.reset}`);
    console.log(`${c.bold}${c.cyan}  ║   🚀  FintechPro Unified Dev Launcher  🚀    ║${c.reset}`);
    console.log(`${c.bold}${c.cyan}  ╚═══════════════════════════════════════════════╝${c.reset}`);
    console.log('');

    // ────────────────────────────────────────────────────────
    // STEP 1: Clear stale processes on required ports
    // ────────────────────────────────────────────────────────
    console.log(`${SYSTEM_TAG} Checking for port conflicts...`);

    const backendBusy = await isPortInUse(BACKEND_PORT);
    if (backendBusy) {
        console.log(`${SYSTEM_TAG} Port ${BACKEND_PORT} is busy — freeing it...`);
        killPort(BACKEND_PORT);
        // Small delay to let the OS release the port
        await new Promise(r => setTimeout(r, 1000));
    }

    const frontendBusy = await isPortInUse(FRONTEND_PORT);
    if (frontendBusy) {
        console.log(`${SYSTEM_TAG} Port ${FRONTEND_PORT} is busy — freeing it...`);
        killPort(FRONTEND_PORT);
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`${SYSTEM_TAG} ${c.green}Ports are clear ✓${c.reset}\n`);

    // ────────────────────────────────────────────────────────
    // STEP 2: Start MongoDB
    // ────────────────────────────────────────────────────────
    const mongoRunning = await isPortInUse(MONGO_PORT);

    if (mongoRunning) {
        console.log(`${MONGO_TAG} ${c.green}Already running on port ${MONGO_PORT} ✓${c.reset}`);
    } else {
        console.log(`${MONGO_TAG} Starting MongoDB...`);

        // Ensure data directory exists
        if (!fs.existsSync(MONGO_DB_PATH)) {
            fs.mkdirSync(MONGO_DB_PATH, { recursive: true });
            console.log(`${MONGO_TAG} Created data directory: ${MONGO_DB_PATH}`);
        }

        // Use the existing data folder directly (no quoting needed)
        const mongoProc = spawnProcess('MongoDB', MONGO_TAG, 'C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.exe', [
            '--dbpath', MONGO_DB_PATH,
            '--port', String(MONGO_PORT),
            '--quiet'
        ]);

        // Wait for MongoDB to become available
        console.log(`${MONGO_TAG} Waiting for MongoDB to be ready...`);
        let mongoReady = false;
        for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 1000));
            const ready = await isPortInUse(MONGO_PORT);
            if (ready) {
                mongoReady = true;
                break;
            }
        }

        if (mongoReady) {
            console.log(`${MONGO_TAG} ${c.green}MongoDB is ready on port ${MONGO_PORT} ✓${c.reset}`);
        } else {
            console.error(`${MONGO_TAG} ${c.red}MongoDB failed to start within 30 seconds!${c.reset}`);
            console.error(`${MONGO_TAG} ${c.red}Make sure 'mongod' is installed and in your PATH.${c.reset}`);
            console.error(`${MONGO_TAG} ${c.yellow}Tip: Download MongoDB Community Server from https://www.mongodb.com/try/download/community${c.reset}`);
            console.error(`${MONGO_TAG} ${c.yellow}Continuing anyway (your .env may point to a remote DB)...${c.reset}\n`);
        }
    }
    console.log('');

    // ────────────────────────────────────────────────────────
    // STEP 3: Start Backend (Express API on port 5011)
    // ────────────────────────────────────────────────────────
    console.log(`${BACKEND_TAG} Starting Express API server on port ${BACKEND_PORT}...`);

    const backend = spawnProcess('Backend', BACKEND_TAG, 'npx', ['nodemon', '--watch', 'server', 'server/index.js']);

    // Wait a moment for backend to boot
    await new Promise(r => setTimeout(r, 3000));

    const backendUp = await isPortInUse(BACKEND_PORT);
    if (backendUp) {
        console.log(`${BACKEND_TAG} ${c.green}API server running at http://localhost:${BACKEND_PORT} ✓${c.reset}`);
    } else {
        console.log(`${BACKEND_TAG} ${c.yellow}Server may still be starting (check logs above)${c.reset}`);
    }
    console.log('');

    // ────────────────────────────────────────────────────────
    // STEP 4: Start Frontend (Vite on port 5173)
    // ────────────────────────────────────────────────────────
    console.log(`${FRONTEND_TAG} Starting Vite dev server on port ${FRONTEND_PORT}...`);

    const frontend = spawnProcess('Frontend', FRONTEND_TAG, 'npx', [
        'vite', '--host', '--port', String(FRONTEND_PORT), '--no-open'
    ], {
        cwd: path.join(__dirname, 'client'),
    });

    // Wait a moment for Vite to boot
    await new Promise(r => setTimeout(r, 3000));

    console.log('');
    console.log(`${c.bold}${c.green}  ╔═══════════════════════════════════════════════╗${c.reset}`);
    console.log(`${c.bold}${c.green}  ║        ✅  All Services Are Running!          ║${c.reset}`);
    console.log(`${c.bold}${c.green}  ╠═══════════════════════════════════════════════╣${c.reset}`);
    console.log(`${c.bold}${c.green}  ║  🗄️  MongoDB:   mongodb://localhost:${MONGO_PORT}     ║${c.reset}`);
    console.log(`${c.bold}${c.green}  ║  ⚡ Backend:   http://localhost:${BACKEND_PORT}        ║${c.reset}`);
    console.log(`${c.bold}${c.green}  ║  🌐 Frontend:  http://localhost:${FRONTEND_PORT}        ║${c.reset}`);
    console.log(`${c.bold}${c.green}  ╠═══════════════════════════════════════════════╣${c.reset}`);
    console.log(`${c.bold}${c.green}  ║  Press Ctrl+C to stop all services            ║${c.reset}`);
    console.log(`${c.bold}${c.green}  ╚═══════════════════════════════════════════════╝${c.reset}`);
    console.log('');
}

main().catch(err => {
    console.error(`${SYSTEM_TAG} ${c.red}Fatal error: ${err.message}${c.reset}`);
    shutdown('ERROR');
});
