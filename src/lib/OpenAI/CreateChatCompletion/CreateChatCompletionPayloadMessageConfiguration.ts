import { CreateChatCompletionPayloadMessageRole } from '../index';

/**
 * Defines an interface for creating a new PayloadMessage
 */
export interface CreateChatCompletionPayloadMessageConfiguration {
  content: string,
  name?: string,
  role: CreateChatCompletionPayloadMessageRole,
}
