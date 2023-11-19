import { DiscordBotConversationMode } from './index';
import { Message } from 'discord.js';

/**
 * Specifies a configuration for a new DiscordBotMessageConfiguration
 */
export interface DiscordBotMessageConfiguration {
  discordMessage: Message,
  botUserId: string,
  botConversationMode: DiscordBotConversationMode,
}
