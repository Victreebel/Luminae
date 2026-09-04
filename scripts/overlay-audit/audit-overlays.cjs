/**
 * Compatibility entry point for the maintained mobile presentation audit.
 *
 * The executable assertions live in overlay-centering.spec.ts. Keeping one
 * implementation prevents this legacy command from drifting back to retired
 * centered Harness/Reserve assumptions.
 */

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const scriptsRoot = path.resolve(__dirname, '..');
const result = spawnSync(
  'pnpm',
  [
    'exec',
    'playwright',
    'test',
    '--config=playwright.config.ts',
    'overlay-audit/overlay-centering.spec.ts',
  ],
  {
    cwd: scriptsRoot,
    env: process.env,
    stdio: 'inherit',
  },
);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
