/**
 * Error raised for unexpected errors in the OpenAI module.
 * @class
 */
export class OpenAIUnexpectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenAIUnexpectedError';
  }
}