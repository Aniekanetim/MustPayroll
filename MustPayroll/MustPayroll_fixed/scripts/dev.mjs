import { spawn } from 'node:child_process';
import { BUILD_INFO } from '../server/build-info.mjs';
const children = [spawn(process.execPath, ['server/index.mjs'], { stdio: 'inherit', env: process.env }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1'], { stdio: 'inherit', env: { ...process.env, PAYROLL_API_PORT: String(BUILD_INFO.defaultPort) } })];
let stopping = false;
function stop(code = 0) { if (stopping) return; stopping = true; for (const child of children) child.kill(); process.exitCode = code; }
for (const child of children) { child.on('error', error => { console.error(error); stop(1); }); child.on('exit', code => stop(code ?? 0)); }
process.on('SIGINT', () => stop()); process.on('SIGTERM', () => stop());
