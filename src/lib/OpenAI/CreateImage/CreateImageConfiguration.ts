/**
 * Defines an interface for OpenAI API configuration
 */
export interface CreateImageConfiguration {
  apiKey: string,
  maxRetries: number,
  paramModel: string,
  timeoutSec: number,
}
