import { ConfigError } from './index';
import { ConfigTemplate } from './ConfigTemplate.json';
import { Logger } from '../Logger';

/**
 * Loads the Discord bot's running configuration from environment variables and validates against
 * and loads defaults from ConfigTemplate.json where needed.
 */
export class Config {

  private _logger = new Logger();
  private _settings: Record<string, string | number | boolean> = {};

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

    ConfigTemplate.forEach(setting => {
      /*
       * All environment variables come in as strings. Setting userValue to the correct type up
       * front saves a lot of type-checking later.
       */
      const userValue =
        this._isNumber(process.env[setting.name]) ?
          Number(process.env[setting.name]) :
          process.env[setting.name];

      // User configured a setting, validate it
      if (userValue !== undefined) {
        if ((setting.allowedValues && this._isAllowedValue(userValue, setting.allowedValues)) ||
            (typeof userValue === typeof setting.allowedValues)) {

          this._settings[setting.name] = userValue;
          process.env[setting.name] = undefined;

          const safeOutput = (setting.secret) ? '*'.repeat(10) : userValue;
          void this._logger.logInfo(`${setting.name} = ${safeOutput}`);
        }
        // User setting is invalid
        else {
          if (setting.allowedValues && !this._isAllowedValue(userValue, setting.allowedValues)) {
            void this._logger.logError(
              `${setting.name}=${userValue} is invalid - allowed value(s): ${setting.allowedValues}`
            );
          }
          else if (typeof userValue !== typeof setting.allowedValues) {
            void this._logger.logError(
              `${setting.name}=${userValue} '${typeof userValue}' is invalid - expected type: ` +
              `${typeof setting.allowedValues}`
            );
          }
          validationFailed = true;
        }
      }
      // User did not configure an optional setting, use template default
      else if (!setting.required) {
        void this._logger.logInfo(
          `${setting.name} not set - using template default: ${setting.defaultValue}`
        );
        this._settings[setting.name] = setting.defaultValue;
      }

      // User did not configure a required setting
      else {
        void this._logger.logError(`${setting.name} not set and is required.`);
        validationFailed = true;
      }
    });

    // Throw an error if startup validation fails
    if (validationFailed) {
      throw (new ConfigError('Startup settings are not configured correctly. See documentation on GitHub.'));
    }
  }

  /**
   * Validates a value as numeric
   * @param value value to validate
   * @returns true if value is numeric
   */
  private _isNumber(value: string | number | undefined): boolean {
    return (!Number.isNaN(Number(value)));
  }

  /**
   * Validates a user setting value against allowed values in the configuration template
   * @param userValue string or number defined at app startup
   * @param allowedValues Values allowed by the template allowedValues parameter
   * @returns true if user value is valid
   */
  private _isAllowedValue(userValue: string | number, allowedValues: string | number | object): boolean {
    switch (typeof allowedValues) {
      case 'string':
        return (typeof userValue === 'string');

      case 'number':
        return (typeof userValue === 'number');

      case 'object':
        return (
          (allowedValues instanceof Array && allowedValues.includes(userValue)) ||
          (allowedValues instanceof Array && allowedValues.includes(Boolean(userValue)))
        );

      default:
        return false;
    }
  }

  /**
   * Returns populated configuration settings
   * @returns Record of configuration settings
   */
  get Settings(): Record<string, string | number | boolean> {
    return this._settings;
  }

}