const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'startup_debug.log');
fs.writeFileSync(logFile, `Starting clean startup at ${new Date().toISOString()}\n`);

function log(msg) {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
}

try {
    log('Checking for processes on port 5011...');
    try {
        const output = execSync('netstat -ano | findstr :5011').toString();
        const lines = output.split('\n').filter(l => l.trim());
        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && pid !== '0') {
                log(`Killing process ${pid} on port 5011...`);
                execSync(`taskkill /F /PID ${pid}`);
            }
        }
    } catch (err) {
        log('No process found on port 5011 or error searching.');
    }

    log('Starting real backend server (server/index.js)...');
    const backend = spawn('node', ['server/index.js'], {
        cwd: __dirname,
        detached: true,
        stdio: 'pipe'
    });

    backend.stdout.on('data', (data) => {
        log(`[BACKEND]: ${data}`);
    });

    backend.stderr.on('data', (data) => {
        log(`[BACKEND ERROR]: ${data}`);
    });

    backend.unref();
    log(`Backend spawned. PID: ${backend.pid}`);

} catch (err) {
    log(`CRITICAL STARTUP ERROR: ${err.message}`);
}
