import {
  DiscordBot,
  DiscordBotEvents,
} from './lib/DiscordBot';

import { Config } from './lib/Config';
import { Logger } from './lib/Logger';

/**
 * Main program entry point class.
 */
class Main {
  private logger: Logger;
  private npmPackageName = process.env['npm_package_name'];
  private npmPackageVersion = process.env['npm_package_version'];

  /**
   * Constructs a Main instance and starts the application
   */
  constructor() {
    const config = this._loadConfiguration();
    const discordBot = new DiscordBot(config);
    this.logger = new Logger(Boolean(config.Settings['bot_log_debug']));

    discordBot.Events.once(DiscordBotEvents.BotReady, async user => {
      void this.logger.logInfo(`${this.npmPackageName}:${this.npmPackageVersion} ready!`);
      void this.logger.logInfo(`Logged in as ${user.tag}`);
    });
  }

  /**
   * Checks and loads startup configuration from configured environment variables and defaults
   * specified in ./ConfigTemplate/ConfigTemplate.json into Config object.
   * @returns Populated application Config
   * @throws ConfigError if configuration is invalid
   */
  private _loadConfiguration(): Config {
    return new Config();
  }
}

new Main();
