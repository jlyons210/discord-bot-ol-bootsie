import { configTemplate } from './lib_ts/ConfigTemplate';
import { DiscordBot } from './lib_ts/DiscordBot';

// Check startup environment
configTemplate.validateStartupSettings();

// Start bot
const discordBot = new DiscordBot();