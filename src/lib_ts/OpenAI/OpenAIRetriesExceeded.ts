/**
 * Error raised when maximum retries are exceeded in the OpenAI module.
 * @class
 */
export class OpenAIRetriesExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenAIRetriesExceededError';
  }
}