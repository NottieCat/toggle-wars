import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    vite: 'src/vite/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['react', 'react-dom', 'flagsmith', 'flagsmith/react', 'vite'],
  loader: {
    '.css': 'text',
  },
  esbuildPlugins: [
    {
      name: 'toggledock-raw-css',
      setup(build) {
        build.onResolve({ filter: /\.css\?raw$/ }, (args) => {
          const cleanPath = args.path.replace(/\?raw$/, '');
          return {
            path: path.resolve(args.resolveDir, cleanPath),
            namespace: 'toggledock-raw-css',
          };
        });
        build.onLoad({ filter: /.*/, namespace: 'toggledock-raw-css' }, async (args) => {
          const contents = await fs.promises.readFile(args.path, 'utf8');
          return {
            contents,
            loader: 'text',
          };
        });
      },
    },
  ],
});
