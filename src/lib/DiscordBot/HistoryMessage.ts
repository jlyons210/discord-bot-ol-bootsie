import { PayloadMessage } from '../OpenAI';
import { IHistoryMessage } from './index';

/**
 * A message that is used as history for chaining conversations with the OpenAI API.
 */
export class HistoryMessage {

  private _botThreadRetainSec: number;
  private _historyMessage: IHistoryMessage;
  private _timestamp: number;

  /**
   * Constructs a HistoryMessage object
   * @param historyMessage A populated IHistoryMessage instance
   * @param botThreadRetainSec number of seconds to retain HistoryMessages
   */
  constructor(historyMessage: IHistoryMessage, botThreadRetainSec: number) {
    this._botThreadRetainSec = botThreadRetainSec;
    this._historyMessage = historyMessage;
    this._timestamp = new Date().getTime();
  }

  /**
   * Gets isDirectEngagement
   * @returns boolean
   */
  get isDirectEngagement(): boolean {
    return this._historyMessage.directEngagement;
  }

  /**
   * Gets payload
   * @returns OpenAI PayloadMessage
   */
  get payload(): PayloadMessage {
    return this._historyMessage.payload;
  }

  /**
   * Gets threadSignature
   * @returns string
   */
  get threadSignature(): string {
    return this._historyMessage.threadSignature;
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
    const expireTime = this._timestamp + (this._botThreadRetainSec * 1000);
    return (expireTime - new Date().getTime());
  }

}