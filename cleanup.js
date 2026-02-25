const fs = require('fs');
const path = require('path');

const filesToUpdate = [
    'server/routes/authRoutes.js',
    'server/routes/support.js',
    'server/index.js'
];

const itemsToDelete = [
    'backend_log.txt',
    'check-port.js',
    'check-vite.js',
    'check_user.js',
    'dev_js_log.txt',
    'dir_output.txt',
    'force_delete.js',
    'index.html',
    'install-test.js',
    'install_log.txt',
    'manual-install.js',
    'node-debug.js',
    'node_version.txt',
    'port_5000_status.txt',
    'test-network.js',
    'test-node.js',
    'test_fail.txt',
    'vite.config.js',
    'console.log(`${u.email}',
    'dist',
    'fintech-pro',
    'public',
    'src',
    'views',
    'server/server-shim.js'
];

itemsToDelete.forEach(item => {
    const fullPath = path.join(process.cwd(), item);
    try {
        if (fs.existsSync(fullPath)) {
            const stats = fs.statSync(fullPath);
            if (stats.isDirectory()) {
                fs.rmSync(fullPath, { recursive: true, force: true });
                console.log(`Deleted directory: ${item}`);
            } else {
                fs.unlinkSync(fullPath);
                console.log(`Deleted file: ${item}`);
            }
        }
    } catch (err) {
        console.error(`Failed to delete ${item}: ${err.message}`);
    }
});
