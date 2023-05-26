import { defaults } from './ConfigTemplate.json';
import { LogLevel, Logger } from '../Logger';

export class ConfigTemplate {

  // Validate startup settings againts extensible .config-template.json
  public validateStartupSettings() {

    let validationFailed = false;

    // Iterate through all settings defined in .config-template.json
    defaults.forEach(setting => {
      const userValue = process.env[setting.name];

      // If the user provided a setting value
      if (userValue) {
        // ...and the template only allows specific values:
        if (setting.allowedValues) {
          // ...and that user-provided value is allowed (valid):
          if (typeof setting.allowedValues !== 'number' && setting.allowedValues.includes(userValue)) {
            const safeOutput = (setting.secret) ? '*'.repeat(10) : userValue;
            Logger.log(`${setting.name} = ${safeOutput}`, LogLevel.Info);
          }
          // ...or the user-provided value is not allowed (invalid):
          else {
            Logger.log(`${setting.name}=${userValue} is invalid - allowed value(s): ${setting.allowedValues}`, LogLevel.Error);
            validationFailed = true;
          }
        }
        // ...or the template allows any value matching its value type (valid):
        else if ((typeof setting.allowedValues === 'number' && typeof userValue === 'number') ||
                 (typeof setting.allowedValues === 'string' && typeof userValue !== 'number')) {
          const valueOutput = (setting.secret) ? '*'.repeat(10) : userValue;
          Logger.log(`${setting.name} = ${valueOutput}`, LogLevel.Info);
        }
        // ...or the user-provided value doesn't match the template's value type (invalid):
        else {
          Logger.log(`${setting.name}=${userValue} is invalid - expected type: ${typeof setting.allowedValues}`, LogLevel.Error);
          validationFailed = true;
        }

      }
      // If the user did not provide a value, but the template has a default value (valid/default)
      else if (!setting.required) {
        Logger.log(`${setting.name} not set - using template default: ${setting.defaultValue}`, LogLevel.Info);
        process.env[setting.name] = setting.defaultValue.toString();
      }
      // If the user did not provide a value, but the setting is required (invalid)
      else {
        Logger.log(`${setting.name} not set and is required.`, LogLevel.Error);
        validationFailed = true;
      }
    });

    // Throw an error if startup validation fails
    if (validationFailed) {
      Logger.log('Startup settings are not configured correctly. See documentation on GitHub.', LogLevel.Error);
      throw (new Error('Configuration error exit.'));
    }
  }

}