import { PayloadMessage } from '../OpenAI';

/**
 * Defines a structure for passing HistoryMessage values
 */
export interface IHistoryMessage {
  convoKey: string,
  directEngagement: boolean,
  payload: PayloadMessage,
}