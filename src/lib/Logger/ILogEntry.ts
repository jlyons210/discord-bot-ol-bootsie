import { LogLevel } from './index';

/**
 * Defines an interface for creating a new HistoryMessage
 */
export interface ILogEntry {
  message: string,
  logLevel: LogLevel,
  debugEnabled?: boolean,
}