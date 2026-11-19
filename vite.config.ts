import { resolve } from 'path';
import { defineConfig } from 'vite';
import pack from './scripts/plugins/vite-plugin-pack.mjs';
import { compileDefinedValues, mode } from './scripts/constants.mjs';

export default defineConfig({
  plugins: [
    pack(),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      fileName: () => 'index.js',
      formats: ['es'],
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
