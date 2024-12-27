import { access } from 'fs/promises';

/**
 * Centralized logging class
 */
export class Logger {
  private debugLoggingIsEnabled: boolean;

  /**
   * Creates a Logger instance and sets debug logging enabled state
   * @param {boolean} [debugLoggingIsEnabled]
   *   boolean indicating whether or not debug logging is to be enabled.
   */
  constructor(debugLoggingIsEnabled = false) {
    this.debugLoggingIsEnabled = debugLoggingIsEnabled;
  }

  /**
   * Logs a debug message to console if debug logging is enabled. Checks break-glass debug
   * configuration on every run as the DEBUG file may be created or deleted at any time.
   * @param {string} message string containing debug message to log
   */
  public async logDebug(message: string): Promise<void> {
    const timestamp = new Date().toISOString();
    if (this.debugLoggingIsEnabled || await this.breakGlassDebugLoggingIsEnabled()) {
      console.log(`${timestamp} - DEBUG - ${message}`);
    }
  }

  /**
   * Logs an error message to console.
   * @param {string} message string containing error message to log
   */
  public async logError(message: string): Promise<void> {
    const timestamp = new Date().toISOString();
    console.error(`${timestamp} - ERROR - ${message}`);
  }

  /**
   * Logs an info message to console.
   * @param {string} message string containing info message to log
   */
  public async logInfo(message: string): Promise<void> {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} - INFO - ${message}`);
  }

  /**
   * Break-glass debugging allows debug logging to be enabled during a live troubleshooting
   * scenario.
   *
   * To enable within a running container:
   *   docker exec -it <container_name> /bin/sh
   *   /usr/src/app # touch DEBUG
   * @returns {boolean} boolean indicating whether or not the DEBUG file exists
   */
  private async breakGlassDebugLoggingIsEnabled(): Promise<boolean> {
    try {
      await access(process.cwd() + '/DEBUG');
      return true;
    }
    catch {
      return false;
    }
  }
}
