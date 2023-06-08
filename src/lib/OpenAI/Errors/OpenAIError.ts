/**
 * Base error class for the OpenAI module. This should not be used for new errors, but it can be
 * used to catch all sub-class errors.
 */
export class OpenAIError extends Error {
  /**
   * Constructs an OpenAIError
   * @param message Error message
   */
  constructor(message: string) {
    super(message);
    this.name = 'OpenAIError';
  }
}