import { configTemplate } from '../../.config-template.json';
import { log } from '../../lib/lib-bot';

export class ConfigTemplate {

  constructor() {
    return;
  }

  // Validate startup settings againts extensible .config-template.json
  function validateStartupSettings() {

    let validationFailed = false;
  
    // Iterate through all settings defined in .config-template.json
    configTemplate.forEach(setting => {
  
      const userValue = process.env[setting.name];
  
      // If the user provided a setting value
      if (userValue) {
  
        // ...and the template only allows specific values:
        if (setting.allowedValues) {
  
          // ...and that user-provided value is allowed (valid):
          if (setting.allowedValues.includes(userValue)) {
            // Mask secrets
            const safeOutput = (setting.secret) ? '*'.repeat(10) : userValue;
            log(`${setting.name} = ${safeOutput}`, 'info');
          }
          // ...or the user-provided value is not allowed (invalid):
          else {
            log(`${setting.name}=${userValue} is invalid - allowed value(s): ${setting.allowedValues}`, 'error');
            validationFailed = true;
          }
  
        }
        // ...or the template allows any value matching its value type (valid):
        else if (typeof setting.allowedValues == 'number' && !isNaN(userValue) ||
                 typeof setting.allowedValues == 'string' && isNaN(userValue)) {
  
          const valueOutput = (setting.secret) ? '*'.repeat(10) : userValue;
          log(`${setting.name} = ${valueOutput}`, 'info');
        }
        // ...or the user-provided value doesn't match the template's value type (invalid):
        else {
          log(`${setting.name}=${userValue} is invalid - expected type: ${typeof setting.allowedValues}`, 'error');
          validationFailed = true;
        }
  
      }
      // If the user did not provide a value, but the template has a default value (valid/default)
      else if (!setting.required) {
  
        log(`${setting.name} not set - using template default: ${setting.defaultValue}`, 'info');
        process.env[setting.name] = setting.defaultValue;
  
      }
      // If the user did not provide a value, but the setting is required (invalid)
      else {
  
        log(`${setting.name} not set and is required.`, 'error');
        validationFailed = true;
  
      }
  
    });
  
    // Throw an error if startup validation fails
    if (validationFailed) {
      log('Startup settings are not configured correctly. See documentation on GitHub.', 'error');
      throw (new Error('Configuration error exit.'));
    }
  
  };
}