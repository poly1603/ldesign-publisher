import { defineConfig } from 'tsup'

const sharedExternal = [
  /^node:/,
  'path',
  'fs',
  'events',
  'crypto',
  'url',
  'os',
  'util',
  'child_process',
  'chalk',
  'commander',
  'ora',
  'inquirer',
  'execa',
  'semver',
  'fast-glob',
  'fs-extra',
  'zod',
  'boxen',
  'cli-table3',
  'listr2',
  'pretty-ms',
  /^conventional-/,
]

const sharedBuildOptions = {
  target: 'node18' as const,
  platform: 'node' as const,
  bundle: true,
  tsconfig: 'tsconfig.json',
  minify: false,
  keepNames: true,
  treeshake: true,
  esbuildOptions(options: any) {
    options.packages = 'external'
    options.logLevel = 'warning'
    options.logLimit = 0
    options.legalComments = 'none'
    options.charset = 'utf8'
  }
}

const sharedOutExtension = ({ format }: { format: string }) => ({
  js: format === 'esm' ? '.js' : '.cjs'
})

export default defineConfig({
  entry: ['src/**/*.ts', '!src/**/*.test.ts', '!src/**/__tests__/**'],
  format: ['esm', 'cjs'],
  outDir: 'dist',
  dts: {
    resolve: true,
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  outExtension: sharedOutExtension,
  external: sharedExternal,
  ...sharedBuildOptions,
})

