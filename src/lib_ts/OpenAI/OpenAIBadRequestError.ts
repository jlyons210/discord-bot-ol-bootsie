/**
 * Error raised for bad request errors in the OpenAI module.
 * @class
 */
export class OpenAIBadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenAIBadRequestError';
  }
}