const http = require('http');
const fs = require('fs');

const options = {
  hostname: 'localhost',
  port: 5011,
  path: '/',
  method: 'GET',
  timeout: 5000
};

const logFile = 'server_test_result.txt';
fs.writeFileSync(logFile, `Test started at ${new Date().toISOString()}\n`);

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    fs.appendFileSync(logFile, `SUCCESS: Status ${res.statusCode}\n`);
    fs.appendFileSync(logFile, `BODY: ${data}\n`);
    process.exit(0);
  });
});

req.on('error', (e) => {
  fs.appendFileSync(logFile, `ERROR: ${e.message}\n`);
  process.exit(1);
});

req.on('timeout', () => {
  fs.appendFileSync(logFile, `ERROR: Timeout\n`);
  req.destroy();
});

req.end();
