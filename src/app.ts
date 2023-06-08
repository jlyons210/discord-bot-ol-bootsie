import {
  DiscordBot,
  DiscordBotEvents,
} from './lib/DiscordBot';
import {
  LogLevel,
  Logger,
} from './lib/Logger';
import { Config } from './lib/Config';
import { ConfigError } from './lib/Config/Errors';

/**
 * Main program entry point class.
 */
class Main {

  /**
   * Constructs a new Discord bot
   */
  constructor() {
    const config = this._loadConfiguration();
    const discordBot = new DiscordBot(config);

    discordBot.Events.once(DiscordBotEvents.BotReady, async user => {
      void Logger.log({
        message: `${process.env['npm_package_name']}:${process.env['npm_package_version']} ready!`,
        logLevel: LogLevel.Info,
      });
      void Logger.log({
        message: `Logged in as ${user.tag}`,
        logLevel: LogLevel.Info,
      });
    });
  }

  /**
   * Checks and loads startup configuration from configured environment variables and defaults
   * specified in ./ConfigTemplate/ConfigTemplate.json into Config object.
   * @returns Populated application Config
   */
  private _loadConfiguration(): Config {
    try {
      return new Config();
    }
    catch (e) {
      if (e instanceof ConfigError) {
        Logger.log({ message: e.message, logLevel: LogLevel.Error });
      }
      else if (e instanceof Error) {
        Logger.log({ message: e.message, logLevel: LogLevel.Error });
      }
    }
    process.exit(1);
  }

}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const main = new Main();