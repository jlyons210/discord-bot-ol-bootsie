/**
 * To be thrown for bad request errors in the OpenAI module.
 */
export class OpenAIBadRequestError extends Error {
  /**
   * Constructs an OpenAIBadRequestError
   * @param message Error message
   */
  constructor(message: string) {
    super(message);
    this.name = 'OpenAIBadRequestError';
  }
}