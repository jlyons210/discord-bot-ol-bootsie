import { OpenAIError } from './OpenAIError';

/**
 * To be thrown for unexpected errors in the OpenAI module.
 */
export class OpenAIUnexpectedError extends OpenAIError {
  /**
   * Constructs an OpenAIUnexpectedError
   * @param message Error message
   */
  constructor(message: string) {
    super(message);
    this.name = 'OpenAIUnexpectedError';
  }
}