const { configTemplate } = require('../.config-template.json');

async function checkStartupEnvironment() {

  configTemplate.forEach(setting => {

    if (setting.required) {

      if (process.env[setting.name]) {

        /*
         * I'm too tired to build a coherent validation list at the moment,
         * and I don't want a rat's nest, so I'm calling it a night! :)
         */

      }

    }

    if (process.env[setting.name]) {

      const settingValue = (setting.secret) ? '*'.repeat(10) : process.env[setting.name];
      console.log(`process.env['${setting.name}'] is set to '${settingValue}'`);
      console.log(`setting.allowedValues = ${setting.allowedValues}`);

      if (!setting.required && process.env[setting.name] in setting.allowedValues) {
        console.log('I\'ll allow it..');
      }
      else {
        console.log(`Setting is misconfigured. Assigning default setting ${setting.defaultValue}`);
        process.env[setting.name] = setting.defaultValue;
        console.log(`process.env['${setting.name}'] is set to '${settingValue}'`);
      }

    }
    else {

      console.log(`process.env['${setting.name}'] not set`);

      if (setting.required) {
        console.log('Setting is required. Startup will fail.');
      }
      else {
        console.log(`Setting process.env['${setting.name}'] to '${setting.defaultValue}'`);
      }

    }

  });

}

checkStartupEnvironment();