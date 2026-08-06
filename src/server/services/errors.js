/**
 * Thrown when form metadata returned by the manager fails schema validation.
 * The raw Joi error is kept as `cause`; the message carries Joi's own summary
 * so log lines still say which fields are wrong.
 */
export class MetadataValidationError extends Error {
  /**
   * @param {import('joi').ValidationError} cause
   */
  constructor(cause) {
    super(`Invalid form metadata: ${cause.message}`, { cause })
    this.name = 'MetadataValidationError'
  }
}
