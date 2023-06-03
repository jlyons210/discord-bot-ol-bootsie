import { CreateChatCompletionPayloadMessage } from '../OpenAI';

/**
 * Specifies a configuration for a new HistoryMessage
 */
export interface HistoryMessageConfiguration {
  convoKey: string,
  convoRetainSec: number,
  payload: CreateChatCompletionPayloadMessage,
}