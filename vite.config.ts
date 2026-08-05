import { resolve } from 'path';
import { defineConfig } from 'vite';
import { ModuleFormat } from 'rollup';
import pack from './scripts/plugins/vite-plugin-pack.mjs';
import { compileDefinedValues, mode } from './scripts/constants.mjs';

export default defineConfig({
  plugins: [
    pack(),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      fileName(format: ModuleFormat, entryName: string) {
        return format === 'es' || format === 'esm' ? 'index.esm.js' : 'index.cjs.js';
      },
      name: 'NexconnChatUI',
      formats: ['es', 'cjs'],
    },
    sourcemap: false,
    copyPublicDir: false,
    emptyOutDir: false,
    minify: true,
    outDir: './release/npm/dist',
    rollupOptions: {
      external: ['@nexconn/engine', '@nexconn/chat', 'lit'],
      output: {},
    },
  },
  resolve: {
    alias: {
      '@lib': resolve('./src'),
    },
  },
  mode,
  define: compileDefinedValues,
});
