import { CreateChatCompletionPayloadMessage } from '../../OpenAI/index.js';
import { ExpirableObject } from '../ExpirableObject.js';
import { HistoryMessageConfiguration } from '../index.js';

/**
 * A message that is used as history for chaining conversations with the OpenAI API.
 */
export class HistoryMessage extends ExpirableObject {
  private config: HistoryMessageConfiguration;

  /**
   * Constructs a HistoryMessage object
   * @param {HistoryMessageConfiguration} config A populated HistoryMessageConfiguration
   */
  constructor(config: HistoryMessageConfiguration) {
    super();
    this.config = config;
  }

  /**
   * Gets conversationKey
   * @returns {string} Conversation key
   */
  get conversationKey(): string {
    return this.config.conversationKey;
  }

  /**
   * Gets payload
   * @returns {CreateChatCompletionPayloadMessage} OpenAI PayloadMessage
   */
  get payload(): CreateChatCompletionPayloadMessage {
    return this.config.payload;
  }
}
