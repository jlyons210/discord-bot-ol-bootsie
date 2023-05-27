import { ConfigError, ConfigSetting } from './index';
import { ConfigTemplate as template } from './ConfigTemplate.json';
import { LogLevel, Logger } from '../Logger';

/**
 * Loads the Discord bot's running configuration from environment variables and validates against
 * and loads defaults from ConfigTemplate.json where needed.
 */
export class Config {

  private _settings: ConfigSetting = {};

  /**
   * Constructs a Config object containing the merged (provided & defaults) application configuration.
   */
  constructor() {
    this._validateStartupSettings();
  }

  /**
   * Validate startup settings against extensible ConfigTemplate.json
   */
  private _validateStartupSettings(): void {
    let validationFailed = false;

    // Iterate through all settings defined in ConfigTemplate.json
    template.forEach(async setting => {
      const userValue = process.env[setting.name];

      // If the user provided a setting value
      if (userValue) {
        // ...and the template only allows specific values (implies string type):
        if (setting.allowedValues) {
          // ...and that userValue is allowed (valid):
          if (typeof setting.allowedValues === 'string' && setting.allowedValues.includes(userValue)) {
            // Add to config and clear environment variable
            this._settings[setting.name] = userValue;
            process.env[setting.name] = undefined;

            // Log startup config
            const safeOutput = (setting.secret) ? '*'.repeat(10) : userValue;
            await Logger.log(`${setting.name} = ${safeOutput}`, LogLevel.Info);
          }
          // ...or the user-provided value is not allowed (invalid):
          else {
            await Logger.log(`${setting.name}=${userValue} is invalid - allowed value(s): ${setting.allowedValues}`, LogLevel.Error);
            validationFailed = true;
          }
        }
        // ...or the template allows any value matching its value type (valid):
        else if ((typeof setting.allowedValues === 'number' && typeof userValue === 'number') ||
                 (typeof setting.allowedValues === 'string' && typeof userValue !== 'number')) {
          // Add to config and clear environment variable
          this._settings[setting.name] = userValue;
          process.env[setting.name] = undefined;

          // Log startup config
          const valueOutput = (setting.secret) ? '*'.repeat(10) : userValue;
          await Logger.log(`${setting.name} = ${valueOutput}`, LogLevel.Info);
        }
        // ...or the user-provided value doesn't match the template's value type (invalid):
        else {
          await Logger.log(`${setting.name}=${userValue} is invalid - expected type: ${typeof setting.allowedValues}`, LogLevel.Error);
          validationFailed = true;
        }

      }
      // If the user did not provide a value, but the template has a default value (valid/default)
      else if (!setting.required) {
        await Logger.log(`${setting.name} not set - using template default: ${setting.defaultValue}`, LogLevel.Info);
        this._settings[setting.name] = setting.defaultValue;
      }
      // If the user did not provide a value, but the setting is required (invalid)
      else {
        await Logger.log(`${setting.name} not set and is required.`, LogLevel.Error);
        validationFailed = true;
      }
    });

    // Throw an error if startup validation fails
    if (validationFailed) {
      throw (new ConfigError('Startup settings are not configured correctly. See documentation on GitHub.'));
    }
  }

  /**
   * Returns populated configuration settings
   * @returns ConfigSetting of configuration settings
   */
  get Settings(): ConfigSetting {
    return this._settings;
  }

}