/**
 * Defines an interface for OpenAI API configuration
 */
export interface ICreateChatCompletion {
  apiKey: string,
  maxRetries: number,
  paramMaxTokens: number,
  paramModel: string,
  paramSystemPrompt: string,
  paramTemperature: number,
}