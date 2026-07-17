#!/usr/bin/env node
/**
 * The bin entry point.
 *
 * The shebang is load-bearing and tsc preserves it (it special-cases a leading
 * `#!`). It used to come from the tsup banner; when the committed bundle was
 * dropped for npm delivery (ADR-007), the compiled dist/main.js lost its shebang
 * and `npx @holiday-cfo/cli` could not exec it. Nothing but running the published
 * bin catches that — typecheck and tests import the module, which does not need a
 * shebang.
 *
 * `./env.js` must come first: its module body installs the stderr warning filter,
 * and module bodies run in import order. It does not need to beat node:sqlite's
 * linking — see the comment in env.ts for why that turned out not to matter.
 */
import './env.js';

import './cli.js';
