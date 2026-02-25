const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const logFile = path.join(__dirname, 'fix_run.log');
fs.writeFileSync(logFile, `=== Startup Fix at ${new Date().toISOString()} ===\n`);

function log(msg) {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
}

function killPort(port) {
    try {
        log(`Checking port ${port}...`);
        const output = execSync(`netstat -ano | findstr :${port}`).toString();
        const lines = output.split('\n').filter(l => l.trim());
        const pids = new Set();
        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && pid !== '0') pids.add(pid);
        }
        for (const pid of pids) {
            log(`Killing PID ${pid} on port ${port}...`);
            execSync(`taskkill /F /PID ${pid} /T`);
        }
    } catch (e) {
        log(`Port ${port} is clear.`);
    }
}

async function start() {
    log('1. Killing ghost processes...');
    killPort(5011);
    killPort(5173);

    log('2. Starting Backend (Real server)...');
    const backend = spawn('node', ['server/index.js'], {
        cwd: __dirname,
        env: { ...process.env, PORT: 5011, NODE_ENV: 'development' },
        stdio: 'inherit',
        shell: true
    });

    log('3. Starting Frontend (Vite)...');
    const frontend = spawn('npx', ['vite', '--host', '--port', '5173', '--no-open'], {
        cwd: path.join(__dirname, 'client'),
        stdio: 'inherit',
        shell: true
    });

    backend.on('error', (err) => log(`Backend Error: ${err.message}`));
    frontend.on('error', (err) => log(`Frontend Error: ${err.message}`));

    log('--- SERVICES SPAWNED ---');
    log('Admin page should be at: http://localhost:5173/views/admin.html');
    log('Backend API is at: http://localhost:5011/');
}

start();
