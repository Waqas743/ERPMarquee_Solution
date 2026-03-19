// Render by default looks for and runs `node index.js` if no start command is provided.
// This file acts as a bridge to automatically start our TypeScript server using our npm script.

import { spawn } from 'child_process';

console.log("==> Starting ERP Marquee Server via index.js bridge...");

const child = spawn('npm', ['run', 'start'], { 
    stdio: 'inherit',
    shell: true 
});

child.on('error', (err) => {
    console.error('==> Failed to start server:', err);
});

child.on('exit', (code, signal) => {
    if (code !== null) {
        process.exit(code);
    } else if (signal) {
        process.kill(process.pid, signal);
    } else {
        process.exit(0);
    }
});
