import { CreateChatCompletionPayloadMessage } from '../OpenAI';
import { ExpirableObject } from '../ExpirableObject';
import { HistoryMessageConfiguration } from './index';

/**
 * A message that is used as history for chaining conversations with the OpenAI API.
 */
export class HistoryMessage extends ExpirableObject {

  private _config: HistoryMessageConfiguration;

  /**
   * Constructs a HistoryMessage object
   * @param config A populated HistoryMessageConfiguration
   */
  constructor(config: HistoryMessageConfiguration) {
    super();
    this._config = config;
  }

  /**
   * Gets convoKey
   * @returns string
   */
  get convoKey(): string {
    return this._config.convoKey;
  }

  /**
   * Gets payload
   * @returns OpenAI PayloadMessage
   */
  get payload(): CreateChatCompletionPayloadMessage {
    return this._config.payload;
  }

}