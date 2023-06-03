/**
 * Defines an interface for OpenAI API configuration
 * API doc: https://platform.openai.com/docs/api-reference/completions/create
 */
export interface CreateChatCompletionConfiguration {
  apiKey: string,
  maxRetries: number,
  paramMaxTokens: number,
  paramModel: string,
  paramSystemPrompt: string,
  paramTemperature: number,
}