import { CreateChatCompletionPayloadMessageRole } from '../index.js';

/**
 * Defines an interface for creating a new PayloadMessage
 */
export interface CreateChatCompletionPayloadMessageConfiguration {
  content: string,
  name?: string,
  role: CreateChatCompletionPayloadMessageRole,
}
