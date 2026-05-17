const { spawn } = require('child_process');
const path = require('path');

const processes = [];

function start(name, cmd, args, cwd) {
  const p = spawn(cmd, args, { cwd, stdio: 'inherit', shell: true });
  p.on('exit', (code, signal) => {
    console.log(`${name} exited with ${code ?? signal}`);
  });
  p.on('error', (err) => console.error(`${name} error`, err));
  processes.push(p);
}

function shutdown() {
  console.log('Shutting down child processes...');
  processes.forEach((p) => {
    try { p.kill('SIGTERM'); } catch (e) {}
  });
  setTimeout(() => process.exit(0), 300);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

const root = __dirname;
start('backend', 'npm', ['start'], path.join(root, 'backend'));
start('frontend', 'npm', ['run', 'dev'], path.join(root, 'frontend'));

console.log('Launched backend and frontend.');
