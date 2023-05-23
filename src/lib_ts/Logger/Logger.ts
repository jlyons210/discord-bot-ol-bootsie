import { access } from 'fs/promises';

export class Logger {

  static async log(message: string, type: string): Promise<void> {
    const timestamp: string = new Date().toISOString();

    switch (type) {
      case 'debug':
        if ((process.env.BOT_LOG_DEBUG != undefined &&
          process.env.BOT_LOG_DEBUG.toLowerCase() == 'enabled') ||
          await this._breakGlassDebugEnabled()) {
          console.log(`${timestamp} - ${type.toUpperCase()} - ${message}`);
        }
        break;

      case 'error':
        console.error(`${timestamp} - ${type.toUpperCase()} - ${message}`);
        break;

      case 'info':
        console.log(`${timestamp} - ${type.toUpperCase()} - ${message}`);
        break;

      default:
        console.log(`${timestamp} - ${type.toUpperCase()}_UNKNOWN_TYPE - ${message}`);
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