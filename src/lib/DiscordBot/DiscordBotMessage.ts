import {
  ChannelType,
  Message,
} from 'discord.js';

import {
  DiscordBotConversationMode,
  DiscordBotMessageConfiguration,
  DiscordBotMessageType,
} from './index';

/**
 * A wrapper for Discord's Message class that contains bot metadata and extra functionality
 */
export class DiscordBotMessage {
  private discordBotMessageConfig: DiscordBotMessageConfiguration;
  private sanitizedMessageContent = '';

  /**
   * Constructs a new DiscordBotMessage
   * @param config DiscordBotMessageConfiguration
   */
  constructor(config: DiscordBotMessageConfiguration) {
    this.discordBotMessageConfig = config;
    this.sanitizeMessageContent();
  }

  /**
   * Indicates whether the message author is *a* bot, not necessarily *this* bot
   * @returns boolean
   */
  get AuthorIsABot(): boolean {
    return this.DiscordMessage.author.bot;
  }

  /**
   * Returns a message's conversation key based upon the bot's configured conversation mode
   * (channel, user).
   * @returns A colon-delimited string representing the Discord guild, channel, and (optionally)
   *  the user that the message was sent from.
   */
  get ConversationKey(): string {
    switch (this.discordBotMessageConfig.botConversationMode) {
      case DiscordBotConversationMode.Channel:
        return `${this.DiscordMessage.guildId}:${this.DiscordMessage.channelId}`;
      case DiscordBotConversationMode.User:
        return `${this.DiscordMessage.guildId}:${this.DiscordMessage.channelId}:${this.DiscordMessage.author.id}`;
    }
  }

  /**
   * Gets the original Discord Message object used to create this DiscordBotMessage
   * @returns (Discord) Message object
   */
  get DiscordMessage(): Message {
    return this.discordBotMessageConfig.discordMessage;
  }

  /**
   * Gets message content that has been sanitized by internal functions
   * @returns string
   */
  get MessageContentSanitized(): string {
    return this.sanitizedMessageContent;
  }

  /**
   * Returns a message's DiscordBotMessageType, which is used to determine the correct handling of
   * an incoming message.
   * @returns DiscordBotMessageType
   */
  get MessageType(): DiscordBotMessageType {
    if (this.ThisBotIsMentioned) {
      return DiscordBotMessageType.AtMention;
    }
    else if (this.AuthorIsABot) {
      return (this.DiscordMessage.author.id === this.discordBotMessageConfig.botUserId)
        ? DiscordBotMessageType.OwnMessage
        : DiscordBotMessageType.BotMessage;
    }
    else if (this.DiscordMessage.channel.type === ChannelType.DM) {
      return DiscordBotMessageType.DirectMessage;
    }
    else {
      return DiscordBotMessageType.UserMessage;
    }
  }

  /**
   * Returns the message author's display name, or username if no display name is available
   * @returns Discord username string
   */
  get MessageUsername(): string {
    return this.DiscordMessage.member?.displayName || this.DiscordMessage.author.username;
  }

  /**
   * Indicates whether or not this bot instance was mentioned in a Discord message.
   * @returns boolean
   */
  get ThisBotIsMentioned(): boolean {
    return Boolean(
      this.DiscordMessage.mentions.users
        .filter(users =>
          users.id === this.discordBotMessageConfig.botUserId
        ).size
    );
  }

  /**
   * Cleans up Discord message text @-mentions
   * @returns Sanitized message text string
   */
  private cleanupMessageAtMentions(): string {
    let messageContent = this.DiscordMessage.content;

    /* Strip bot @-mention (not useful in OpenAI prompt) and replace other @-mentions with display
     * name, useful in OpenAI prompt/response */
    this.DiscordMessage.mentions.users.forEach(async mention => {
      messageContent = (mention.bot)
        ? messageContent.replace(`<@${mention.id}>`, '')
        : messageContent.replace(`<@${mention.id}>`, `${mention.username}`);
    });

    return messageContent;
  }

  /**
   * Entry point for any number of message sanitizing functions
   */
  private sanitizeMessageContent(): void {
    this.sanitizedMessageContent = this.cleanupMessageAtMentions();
  }
}
