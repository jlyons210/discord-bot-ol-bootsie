import { BotEvents, DiscordBot } from './lib/DiscordBot';
import { Config, ConfigError } from './lib/ConfigTemplate';
import { Logger, LogLevel } from './lib/Logger';
import { readPackageUpSync } from 'read-pkg-up';

/**
 * Main program entry point class.
 */
class Main {

  /**
   * Constructs a new Discord bot
   */
  constructor() {
    const {
      name: packageName,
      version: packageVersion,
    } = readPackageUpSync()?.packageJson ?? {};

    const config = this._loadConfiguration();
    const discordBot = new DiscordBot(config);

    discordBot.Events.on(BotEvents.BotReady, async user => {
      await Logger.log(`Logged in as ${user.tag}`, LogLevel.Info);
      await Logger.log(`${packageName}:${packageVersion} ready!`, LogLevel.Info);
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
        Logger.log(e.message, LogLevel.Error);
      }
    }
    process.exit(1);
  }

}

const main = new Main();