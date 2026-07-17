import datasets from '../data/ledger.json';
import spec from '../data/spec.json';
import { Dashboard } from './dashboard.js';

/**
 * The whole dashboard — a server component that only reads two files.
 *
 *   data/ledger.json  the FIGURES.  Baked by `holiday dash data`, from the ledger.
 *   data/spec.json    the LAYOUT.   Written by the agent, from the catalog.
 *
 * It opens no database, which is what lets one build run both locally and on Codex
 * Sites (no filesystem, no Node runtime). The render layer is client-only, so it
 * comes in through ./dashboard — a 'use client' boundary — and the server just
 * hands it the two JSON blobs.
 */
export default function Page() {
  return <Dashboard datasets={datasets} spec={spec as never} />;
}
