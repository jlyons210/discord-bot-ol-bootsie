// Import modules
const { access } = require('fs/promises');

// Centralized logging function
module.exports.log = async function(message, type) {

  // Log in ISO 8601 time format
  const timestamp = new Date().toISOString();

  switch (type) {
    case 'error':
      console.error(`${timestamp} - ${type.toUpperCase()} - ${message}`);
      break;

    case 'debug':
      if ((process.env.BOT_LOG_DEBUG != undefined &&
        process.env.BOT_LOG_DEBUG.toLowerCase() == 'enabled') ||
        await breakGlassDebugEnabled()) {
        console.log(`${timestamp} - ${type.toUpperCase()} - ${message}`);
      }
      break;

    case 'info':
      console.log(`${timestamp} - ${type.toUpperCase()} - ${message}`);
      break;

    default:
      console.log(`${timestamp} - ${type.toUpperCase()}_UNKNOWN_TYPE - ${message}`);
      break;
  }

};

// Break-glass debugging allows for debug logging to be disabled in the config,
// and enabled during a troubleshooting scenario.
// Containerized:
//   docker exec -it <container_name> /bin/sh
//   /usr/src/app # touch DEBUG
async function breakGlassDebugEnabled() {

  try {
    await access(process.cwd() + '/DEBUG');
    return true;
  }
  catch (err) {
    return false;
  }

}