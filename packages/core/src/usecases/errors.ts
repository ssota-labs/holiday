import type { ErrorCode } from '@holiday-cfo/contracts';

/**
 * Application-layer failure shared by CLI, HTTP, and MCP adapters.
 *
 * Adapters map `code` onto exit status / HTTP status / MCP error without
 * reinterpreting the message.
 */
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
