import { OpenAIError } from './OpenAIError';

/**
 * To be thrown when maximum retries are exceeded in the OpenAI module.
 */
export class OpenAIRetriesExceededError extends OpenAIError {
  /**
   * Constructs an OpenAIRetriesExceededError
   * @param message Error message
   */
  constructor(message: string) {
    super(message);
    this.name = 'OpenAIRetriesExceededError';
  }
}