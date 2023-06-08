import { OpenAIError } from './OpenAIError';

/**
 * To be thrown for bad request errors in the OpenAI module.
 */
export class OpenAIBadRequestError extends OpenAIError {
  /**
   * Constructs an OpenAIBadRequestError
   * @param message Error message
   */
  constructor(message: string) {
    super(message);
    this.name = 'OpenAIBadRequestError';
  }
}