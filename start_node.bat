@echo off
echo Starting server... > server_batch.log
node server/index.js >> server_batch.log 2>&1
