// Launches the Expo web dev server on the port the harness assigns.
//
// `expo start` ignores $PORT and always tries 8081, then prompts to pick a
// free port — which fails outright in non-interactive mode. Passing --port
// explicitly is the only way to honour an assigned port.
const { spawn } = require('node:child_process');

const port = process.env.PORT || '8081';
const cli = require.resolve('expo/bin/cli');

const child = spawn(
  process.execPath,
  [cli, 'start', '--web', '--port', port],
  { stdio: 'inherit' },
);

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
