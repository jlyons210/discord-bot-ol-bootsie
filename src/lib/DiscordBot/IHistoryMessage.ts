import { PayloadMessage } from '../OpenAI';

/**
 * Defines an interface for creating a new HistoryMessage
 */
export interface IHistoryMessage {
  convoKey: string,
  convoRetainSec: number,
  payload: PayloadMessage,
}