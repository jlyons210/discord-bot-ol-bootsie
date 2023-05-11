// Import modules
const configTemplate = require('./lib/lib-config-template');
const { DiscordBot } = require('./lib/DiscordBot');

// Ensure all required environment variables are set
configTemplate.validateStartupSettings();

// Create bot instance
const discordBot = new DiscordBot();