import {
  LogLevel,
  LoggerConfiguration,
} from './index';
import { access } from 'fs/promises';

/**
 * Centralized logging class
 */
export class Logger {
  /**
   * Centralized logging function. Logs to console depending on configured logging level.
   * @param logEntry ILogEntry containing log entry details
   */
  static async log(logEntry: LoggerConfiguration): Promise<void> {
    const timestamp: string = new Date().toISOString();

    switch (logEntry.logLevel) {
      case LogLevel.Debug:
        if (logEntry.debugEnabled || await this._breakGlassDebugEnabled()) {
          console.log(`${timestamp} - ${logEntry.logLevel.toUpperCase()} - ${logEntry.message}`);
        }
        break;

      case LogLevel.Error:
        console.error(`${timestamp} - ${logEntry.logLevel.toUpperCase()} - ${logEntry.message}`);
        break;

      case LogLevel.Info:
        console.log(`${timestamp} - ${logEntry.logLevel.toUpperCase()} - ${logEntry.message}`);
        break;
    }
  }

  /**
   * Break-glass debugging allows for debug logging to be disabled in the config, and enabled
   * during a troubleshooting scenario.
   * Break-glass within a container:
   *   docker exec -it <container_name> /bin/sh
   *   /usr/src/app # touch DEBUG
   * @returns Returns 'true' if the DEBUG file exists for break-glass debugging.
   */
  private static async _breakGlassDebugEnabled(): Promise<boolean> {
    try {
      await access(process.cwd() + '/DEBUG');
      return true;
    }
    catch (e) {
      return false;
    }
  }
}