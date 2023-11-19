import { CreateChatCompletionPayloadMessage } from '../../OpenAI';
import { ExpirableObject } from '../ExpirableObject';
import { HistoryMessageConfiguration } from '../index';

/**
 * A message that is used as history for chaining conversations with the OpenAI API.
 */
export class HistoryMessage extends ExpirableObject {
  private config: HistoryMessageConfiguration;

  /**
   * Constructs a HistoryMessage object
   * @param config A populated HistoryMessageConfiguration
   */
  constructor(config: HistoryMessageConfiguration) {
    super();
    this.config = config;
  }

  /**
   * Gets conversationKey
   * @returns string
   */
  get conversationKey(): string {
    return this.config.conversationKey;
  }

  /**
   * Gets payload
   * @returns OpenAI PayloadMessage
   */
  get payload(): CreateChatCompletionPayloadMessage {
    return this.config.payload;
  }
}
