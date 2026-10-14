// Boots a throwaway stack for the smoke tests: an in-memory MongoDB, the API against it,
// and the web dev server proxying /api to that API. Playwright starts this script before
// the tests and stops it afterwards; on SIGTERM/SIGINT everything is shut down.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { MongoMemoryServer } from 'mongodb-memory-server';

const API_PORT = process.env.E2E_API_PORT ?? '3100';
const WEB_PORT = process.env.E2E_WEB_PORT ?? '4300';

const children = [];

function start(name, workspace, command, args, env) {
  const bin = fileURLToPath(new URL(`../${workspace}/node_modules/.bin/${command}`, import.meta.url));
  // Each child leads its own process group, so stopping it also stops what it spawned.
  const child = spawn(bin, args, {
    cwd: fileURLToPath(new URL(`../${workspace}`, import.meta.url)),
    env: { ...process.env, ...env },
    stdio: 'inherit',
    detached: true,
  });
  child.on('exit', (code) => {
    if (!stopping) {
      console.error(`[e2e] ${name} exited early with code ${code}`);
      void stop(1);
    }
  });
  children.push(child);
}

let stopping = false;
let mongo;

async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      // Already gone.
    }
  }
  await mongo?.stop();
  process.exit(code);
}

process.on('SIGTERM', () => void stop());
process.on('SIGINT', () => void stop());

mongo = await MongoMemoryServer.create();
console.log(`[e2e] MongoDB at ${mongo.getUri()}`);

start('api', 'api', 'nest', ['start'], { MONGODB_URI: mongo.getUri('stylevault-e2e'), PORT: API_PORT });
start('web', 'web', 'ng', ['serve', '--port', WEB_PORT], {
  API_PORT,
  NG_CLI_ANALYTICS: 'false',
});
