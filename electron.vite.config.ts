import { resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

const alias = {
  '@shared': resolve(import.meta.dirname, 'src/shared'),
  '@main': resolve(import.meta.dirname, 'src/main'),
  '@renderer': resolve(import.meta.dirname, 'src/renderer'),
};

export default defineConfig({
  main: {
    resolve: { alias },
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve(import.meta.dirname, 'src/main/main.ts'),
      },
      rollupOptions: { output: { format: 'es' } },
    },
  },
  preload: {
    resolve: { alias },
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: { entry: resolve(import.meta.dirname, 'src/preload/bridge.ts') },
      rollupOptions: { output: { format: 'cjs', entryFileNames: 'bridge.cjs' } },
    },
  },
  renderer: {
    resolve: { alias },
    plugins: [react()],
    root: resolve(import.meta.dirname, 'src/renderer'),
    css: {
      modules: {
        localsConvention: 'camelCase',
      },
    },
    build: {
      rollupOptions: { input: resolve(import.meta.dirname, 'src/renderer/index.html') },
    },
  },
});
