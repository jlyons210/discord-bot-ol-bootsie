import { PayloadMessage } from '../OpenAI';
import { IHistoryMessage } from './index';

/**
 * A message that is used as history for chaining conversations with the OpenAI API.
 */
export class HistoryMessage {

  private _historyMessage: IHistoryMessage;
  private _timestamp: number;

  /**
   * Constructs a HistoryMessage object
   * @param historyMessage A populated IHistoryMessage instance
   */
  constructor(historyMessage: IHistoryMessage) {
    this._historyMessage = historyMessage;
    this._timestamp = new Date().getTime();
  }

  /**
   * Gets convoKey
   * @returns string
   */
  get convoKey(): string {
    return this._historyMessage.convoKey;
  }

  /**
   * Gets payload
   * @returns OpenAI PayloadMessage
   */
  get payload(): PayloadMessage {
    return this._historyMessage.payload;
  }

  /**
   * Gets timestamp
   * @returns number (Unix epoch time)
   */
  get timestamp(): number {
    return this._timestamp;
  }

  /**
   * Gets ttl (time to live)
   * @returns number (of seconds before expiry)
   */
  get ttl(): number {
    const expireTime = this._timestamp + (this._historyMessage.convoRetainSec * 1000);
    return (expireTime - new Date().getTime());
  }

}