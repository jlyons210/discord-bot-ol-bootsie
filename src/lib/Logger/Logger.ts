import { access } from 'fs/promises';
import { LogLevel } from './index';

/**
 * Centralized logging class
 */
export class Logger {
  /**
   * Centralized logging function. Logs to console depending on configured logging level.
   * @param message Message string to log.
   * @param logLevel Logs are output at LogLevel.
   * @param debugConfigured boolean passed from application configuration
   */
  static async log(message: string, logLevel: LogLevel, debugConfigured = false): Promise<void> {
    const timestamp: string = new Date().toISOString();

    switch (logLevel) {
      case LogLevel.Debug:
        if (debugConfigured || await this._breakGlassDebugEnabled()) {
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

  /**
   * Break-glass debugging allows for debug logging to be disabled in the config, and enabled
   * during a troubleshooting scenario.
   * Break-glass within a container:
   *   docker exec -it <container_name> /bin/sh
   *   /usr/src/app/src # touch DEBUG
   * @returns Returns 'true' if the DEBUG file exists for break-glass debugging.
   */
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