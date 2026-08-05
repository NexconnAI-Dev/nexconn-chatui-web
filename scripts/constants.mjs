import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { version: v, dependencies } = require('../package.json');
const scriptDirectory = dirname(fileURLToPath(import.meta.url));

function resolveCommitId() {
  if (process.env.COMMIT_ID) return process.env.COMMIT_ID;

  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim() || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Current Git commit ID.
 */
export const commitId = resolveCommitId();

/**
 * Build mode: production | development.
 */
export const mode = process.env.MODE?.toLowerCase() === 'production' ? 'production' : 'development';

/**
 * Whether this is a development build.
 */
export const isDev = mode === 'development';

/**
 * Numeric suffix used by development builds.
 */
export const buildId = process.env.BUILD_ID || '1';

if (isDev && !/^\d+$/.test(buildId)) {
  throw new Error('Build alpha version failed, `BUILD_ID` should be a number!');
}

/**
 * Package version derived from the build mode and `BUILD_ID`.
 */
export const version = [
  v,
  isDev ? '-alpha' : '',
  isDev && buildId ? `.${buildId}` : '',
].join('');

/**
 * Compile-time values replaced by Vite/Rollup.
 */
export const compileDefinedValues = {
  __COMMIT_ID__: JSON.stringify(commitId),
  __VERSION__: JSON.stringify(version),
  __DEV__: isDev,
  __REQUIRED_ENGINE_VERSION__: JSON.stringify(dependencies['@nexconn/engine'].match(/(\d+\.){2}\d+/)[0]),
  'process.env.NODE_ENV': '"production"',
};
/**
 * Project root directory.
 */
export const root = join(scriptDirectory, '..');
/**
 * SDK source directory.
 */
export const libRoot = join(root, 'src');
