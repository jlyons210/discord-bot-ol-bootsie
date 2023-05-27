/**
 * To be thrown for unexpected errors in the OpenAI module.
 */
export class OpenAIUnexpectedError extends Error {
  /**
   * Constructs an OpenAIUnexpectedError
   * @param message Error message
   */
  constructor(message: string) {
    super(message);
    this.name = 'OpenAIUnexpectedError';
  }
}