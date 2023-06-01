import { CreateChatCompletionPayloadMessageRole } from './index';

/**
 * Defines an interface for creating a new PayloadMessage
 */
export interface ICreateChatCompletionPayloadMessage {
  content: string,
  name?: string,
  role: CreateChatCompletionPayloadMessageRole,
}