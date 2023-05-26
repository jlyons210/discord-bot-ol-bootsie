import { access } from 'fs/promises';
import { LogLevel } from '.';

export class Logger {
  /**
   * Centralized logging function. Logs to console depending on configured logging level.
   * @param {string} message Message string to log.
   * @param logLevel Log level to log using LogLevel.
   */
  static async log(message: string, logLevel: LogLevel): Promise<void> {
    const timestamp: string = new Date().toISOString();

    switch (logLevel) {
      case LogLevel.Debug:
        if ((process.env.BOT_LOG_DEBUG !== undefined &&
          process.env.BOT_LOG_DEBUG.toLowerCase() == 'enabled') ||
          await this._breakGlassDebugEnabled()) {
          console.log(`${timestamp} - ${logLevel.toUpperCase()} - ${message}`);
        }
        break;

      case LogLevel.Error:
        console.error(`${timestamp} - ${logLevel.toUpperCase()} - ${message}`);
        break;

      case LogLevel.Info:
        console.log(`${timestamp} - ${logLevel.toUpperCase()} - ${message}`);
        break;
    }
  }

  // Break-glass debugging allows for debug logging to be disabled in the config,
  // and enabled during a troubleshooting scenario.
  // Containerized:
  //   docker exec -it <container_name> /bin/sh
  //   /usr/src/app # touch DEBUG
  private static async _breakGlassDebugEnabled(): Promise<boolean> {
    try {
      await access(process.cwd() + '/DEBUG');
      return true;
    }
    catch (err) {
      return false;
    }
  }
}