/**
 * Type structure for OpenAI API configuration
 */
export type OpenAIConfig = {
  apiKey: string,
  maxRetries: number,
  paramMaxTokens: number,
  paramModel: string,
  paramSystemPrompt: string,
  paramTemperature: number,
}