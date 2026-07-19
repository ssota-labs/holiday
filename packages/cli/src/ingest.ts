/**
 * Re-export the shared ingest contract. Prefer `@holiday-cfo/contracts` for new code.
 * Kept so existing imports of `./ingest.js` keep working during the adapter cutover.
 */
export {
  IngestSubmission as INGEST_SUBMISSION,
  type IngestSubmission,
  type IngestItemInput,
} from '@holiday-cfo/contracts';
