import { defineConfig } from 'tsup';

/**
 * Bundles the CLI into `plugin/bin/holiday.mjs` — one file, no dependencies.
 *
 * This is what a Claude Code plugin actually needs. Plugins are copied into a
 * versioned cache with NO install step, so there is no `pnpm install` and no
 * postinstall to compile anything. Whatever is committed is what runs.
 *
 * That constraint is why the SQLite adapter uses `node:sqlite` rather than
 * better-sqlite3: a native addon cannot be bundled, and shipping per-platform
 * prebuilds or a vendored node_modules into a plugin is not a thing. node:sqlite
 * is a builtin, so it stays external here and resolves at runtime.
 *
 * The committed output rots if nobody watches it, so CI re-bundles and diffs
 * against the committed file.
 */
export default defineConfig({
  entry: { holiday: 'src/main.ts' },
  format: ['esm'],
  platform: 'node',
  target: 'node24',
  outDir: '../../plugin/bin',
  outExtension: () => ({ js: '.mjs' }),
  // Everything that is not a Node builtin gets inlined: @holiday/core,
  // @holiday/store-sqlite, commander, zod.
  noExternal: [/^@holiday\//, 'commander', 'zod'],
  /**
   * The `createRequire` line is not decoration.
   *
   * commander is CJS. Inlined into an ESM bundle, esbuild emits a `__require`
   * shim that throws "Dynamic require of node:events is not supported" — the
   * bundle builds clean and dies on the first run. That shim is written as
   * `typeof require !== "undefined" ? require : <throwing stub>` and evaluates at
   * module init, so defining a real `require` ABOVE it makes the shim resolve to
   * the real thing instead of the stub. Order matters; this must stay in the
   * banner. (tsup's `shims` option does not cover this — it handles __dirname and
   * __filename.)
   */
  banner: {
    js: [
      '#!/usr/bin/env node',
      // Aliased: bundled source imports createRequire under its own name, and two
      // top-level declarations of it is a SyntaxError that only appears in the
      // bundle.
      "import { createRequire as __nodeCreateRequire } from 'node:module';",
      'const require = __nodeCreateRequire(import.meta.url);',
    ].join('\n'),
  },
  /**
   * Load-bearing. tsup defaults this to true and rewrites `node:sqlite` to
   * `sqlite`, which does not resolve — newer builtins are reachable ONLY via the
   * prefix. The bundle builds clean, reports success, and then dies on the first
   * run with "Cannot find package 'sqlite'".
   *
   * (esbuild itself preserves the prefix at every target; this is tsup's own
   * rewrite, kept for backwards compatibility with old Node.)
   */
  removeNodeProtocol: false,
  clean: true,
  minify: false, // A human should be able to read what a plugin is about to run.
  sourcemap: false,
  splitting: false,
  dts: false,
});
