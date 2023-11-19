import { CreateChatCompletionPayloadMessage } from '../../OpenAI';

/**
 * Specifies a configuration for a new HistoryMessage
 */
export interface HistoryMessageConfiguration {
  conversationKey: string,
  payload: CreateChatCompletionPayloadMessage,
}
