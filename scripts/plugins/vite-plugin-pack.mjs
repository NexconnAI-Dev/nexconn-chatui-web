import { execFileSync } from 'child_process';
import { writeFileSync } from 'fs';
import { createRequire } from 'module';
import { resolve } from 'path';
import { rollup } from 'rollup';
import rollupDtsModule from 'rollup-plugin-dts';
import alias from '@rollup/plugin-alias';

import {
  libRoot, root, version,
} from '../constants.mjs';
import { copyFile, rmdir } from '../helper.mjs';

const require = createRequire(import.meta.url);
const packTmp = require('../assets/package-template.json');
const packJson = require('../../package.json');
const rollupDts = typeof rollupDtsModule === 'function' ? rollupDtsModule : rollupDtsModule.default;

const generateDts = async () => {
  const dtsBundle = await rollup({
    input: resolve(libRoot, 'index.ts'),
    plugins: [
      alias({
        entries: {
          '@lib': resolve(libRoot),
        },
      }),
      rollupDts(),
    ],
    external: ['@nexconn/engine', '@nexconn/chat'],
  });
  await dtsBundle.write({
    file: resolve(root, 'release/npm/dist/index.d.ts'),
    format: 'esm',
  });
};

/**
 * Package the library output.
 */
export default function pack() {
  return {
    name: 'pack',
    buildStart() {
      // Clear the release directory before building.
      rmdir(resolve(root, 'release'));
    },
    async closeBundle() {
      // Generate the bundled declaration file.
      await generateDts();

      // Copy the npm package assets: LICENSE, README.md, and package.json.
      const assetsRoom = resolve(root, 'scripts/assets');
      const npmRoot = resolve(root, 'release/npm');
      copyFile(resolve(root, 'LICENSE'), resolve(npmRoot, 'LICENSE'));
      copyFile(resolve(assetsRoom, 'README_4_NPM_PACK.md'), resolve(npmRoot, 'README.md'));

      // Generate package.json.
      const engineVer = packJson.dependencies['@nexconn/engine'];
      const imlibVer = packJson.dependencies['@nexconn/chat'];
      const litVer = packJson.dependencies.lit;
      writeFileSync(resolve(npmRoot, 'package.json'), JSON.stringify({
        ...packTmp,
        version,
        peerDependencies: {
          '@nexconn/engine': engineVer,
          '@nexconn/chat': imlibVer,
          lit: litVer,
        },
      }, null, '  '));

      // Generate API documentation.
      execFileSync('npm', ['run', 'build:apidoc'], { stdio: 'inherit' });
    },
  };
}
