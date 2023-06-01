import { CreateChatCompletionPayloadMessageRole } from './index';

/**
 * Defines an interface for creating a new PayloadMessage
 */
export interface IChatCompletionPayloadMessage {
  content: string,
  name?: string,
  role: CreateChatCompletionPayloadMessageRole,
}