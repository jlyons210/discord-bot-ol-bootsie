import { access } from 'fs/promises';

/**
 * Centralized logging class
 */
export class Logger {

  private debugLoggingIsEnabled: boolean;

  /**
   * Creates a Logger instance and sets debug logging enabled state
   * @param debugLoggingIsEnabled boolean indicating whether or not debug logging is to be
   *   enabled.
   */
  constructor(debugLoggingIsEnabled = false) {
    this.debugLoggingIsEnabled = debugLoggingIsEnabled;
  }

  /**
   * Logs a debug message to console if debug logging is enabled. Checks break-glass debug
   * configuration on every run as the DEBUG file may be created or deleted at any time.
   * @param message string containing debug message to log
   */
  public logDebug(message: string): void {
    const timestamp = new Date().toISOString();
    if (this.debugLoggingIsEnabled || this.breakGlassDebugLoggingIsEnabled()) {
      console.log(`${timestamp} - DEBUG - ${message}`);
    }
  }

  /**
   * Logs an error message to console.
   * @param message string containing error message to log
   */
  public logError(message: string): void {
    const timestamp = new Date().toISOString();
    console.error(`${timestamp} - ERROR - ${message}`);
  }

  /**
   * Logs an info message to console.
   * @param message string containing info message to log
   */
  public logInfo(message: string): void {
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
   * @returns boolean indicating whether or not the DEBUG file exists
   */
  private breakGlassDebugLoggingIsEnabled(): boolean {
    try {
      access(process.cwd() + '/DEBUG');
      return true;
    }
    catch (e) {
      return false;
    }
  }
}