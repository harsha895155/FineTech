const fs = require('fs');
const path = require('path');

const rootFilesToDelete = [
    'FIX_AND_RUN.js',
    'backend_log.txt',
    'check-port.js',
    'check-vite.js',
    'check_user.js',
    'cleanup.js',
    'dev_js_log.txt',
    'dir_output.txt',
    'fix_run.log',
    'force_delete.js',
    'install-test.js',
    'install_log.txt',
    'kill_and_start.js',
    'manual-install.js',
    'node-debug.js',
    'node_version.txt',
    'port_5000_status.txt',
    'replace_shims.js',
    'start_node.bat',
    'test-network.js',
    'test-node.js',
    'test_fail.txt',
    'test_server_port.js',
    'startup_debug.log',
    'port_check.txt',
    'simple_test.txt',
    'server_batch.log',
    'server_exec.log',
    'server_running.log',
    'server_start.log',
    'root_server.log',
    'server_test_result.txt'
];

const serverFilesToDelete = [
    'check-users-detailed.js',
    'check_fs.js',
    'db_test.js',
    'debug-db.js',
    'debug_update.js',
    'diag.js',
    'force_start.bat',
    'list-users.js',
    'run_safe.js',
    'server-shim.js',
    'start_server.bat',
    'test-controller-logic.js',
    'test-db-simple.js',
    'test-db.js',
    'test-mail.js',
    'test_server_local.js',
    'test_update.js',
    'server_test_result.txt'
];

const foldersToDelete = [
    'fintech-pro',
    path.join('client', 'src', 'shims')
];

function deleteFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Deleted: ${filePath}`);
        }
    } catch (e) {
        console.error(`Error deleting ${filePath}: ${e.message}`);
    }
}

function deleteFolderRecursive(folderPath) {
    try {
        if (fs.existsSync(folderPath)) {
            fs.readdirSync(folderPath).forEach((file) => {
                const curPath = path.join(folderPath, file);
                if (fs.lstatSync(curPath).isDirectory()) {
                    deleteFolderRecursive(curPath);
                } else {
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(folderPath);
            console.log(`Deleted Folder: ${folderPath}`);
        }
    } catch (e) {
        console.error(`Error deleting folder ${folderPath}: ${e.message}`);
    }
}

// 1. Delete root files
rootFilesToDelete.forEach(f => deleteFile(path.join(__dirname, f)));

// 2. Delete server files
serverFilesToDelete.forEach(f => deleteFile(path.join(__dirname, 'server', f)));

// 3. Delete folders
foldersToDelete.forEach(f => deleteFolderRecursive(path.join(__dirname, f)));

// 4. Handle weird names
const allFiles = fs.readdirSync(__dirname);
allFiles.forEach(f => {
    if (f.startsWith('console.log') || f === '{"' || f.startsWith('server_batch')) {
        deleteFile(path.join(__dirname, f));
    }
});

const serverDir = path.join(__dirname, 'server');
const serverFiles = fs.readdirSync(serverDir);
serverFiles.forEach(f => {
    if (f === '{"') {
        deleteFile(path.join(serverDir, f));
    }
});

console.log('Cleanup complete.');
