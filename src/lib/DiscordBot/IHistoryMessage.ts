import { PayloadMessage } from '../OpenAI';

/**
 * Defines a structure for passing HistoryMessage values
 */
export interface IHistoryMessage {
  directEngagement: boolean,
  payload: PayloadMessage,
  threadSignature: string,
}