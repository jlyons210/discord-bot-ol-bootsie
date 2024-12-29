import { CreateChatCompletionPayloadMessage } from '../../OpenAI/index.js';

/**
 * Specifies a configuration for a new HistoryMessage
 */
export interface HistoryMessageConfiguration {
  conversationKey: string,
  payload: CreateChatCompletionPayloadMessage,
}
