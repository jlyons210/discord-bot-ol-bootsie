import {
  ChannelType,
  Client,
  DiscordAPIError,
  EmojiIdentifierResolvable,
  Events,
  GatewayIntentBits,
  Message,
  Partials,
} from 'discord.js';

import {
  OpenAIConfig,
  PayloadMessage,
  PayloadMessageRole,
  OpenAI,
} from '../OpenAI';

import {
  BotEvents,
  DiscordBotConvoMode,
  DiscordBotUnexpectedError,
  DiscordMessageType,
  HistoryMessage,
} from './index';

import { Config } from '../ConfigTemplate';
import { EventEmitter } from 'events';
import { inspect } from 'util';
import { LogLevel, Logger } from '../Logger';

/**
 * This Discord bot listens for channel events and interfaces with the OpenAI API to provide
 * message and channel interaction.
 */
export class DiscordBot {
  public Events = new EventEmitter();
  private _botConfig: Config;
  private _discordClient: Client;
  private _discordMaxMessageLength = 2000;
  private _messageHistory: HistoryMessage[] = [];
  private _openAiConfig: OpenAIConfig;

  /**
   * Creates an instance of the DiscordBot class with required configuration to authenticate the
   * bot's Discord client and operate within a channel. Establishes event listeners.
   * @param botConfig A populated Config object
   */
  constructor(botConfig: Config) {
    this._botConfig = botConfig;
    this._openAiConfig = {
      apiKey: String(this._botConfig.Settings.OPENAI_API_KEY),
      maxRetries: Number(this._botConfig.Settings.OPENAI_MAX_RETRIES),
      paramMaxTokens: Number(this._botConfig.Settings.OPENAI_PARAM_MAX_TOKENS),
      paramModel: String(this._botConfig.Settings.OPENAI_PARAM_MODEL),
      paramSystemPrompt: String(this._botConfig.Settings.OPENAI_PARAM_SYSTEM_PROMPT),
      paramTemperature: Number(this._botConfig.Settings.OPENAI_PARAM_TEMPERATURE),
    };

    this._discordClient = new Client({
      intents: [
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
      partials: [ Partials.Channel ],
    });
    this._discordClient.login(String(this._botConfig.Settings.DISCORD_BOT_TOKEN));

    this._registerEventHandlers();
  }

  /**
   * Indicates whether or not this bot instance was mentioned in a Discord message.
   * @param discordMessage Discord message from event source
   * @returns boolean
   */
  private async _botIsMentionedInMessage(discordMessage: Message): Promise<boolean> {
    let isMentioned = false;

    discordMessage.mentions.users.forEach(async mention => {
      if (mention.id === this._discordClient.user?.id) isMentioned = true;
    });

    return isMentioned;
  }

  /**
   * Cleans up Discord message text @-mentions
   * @param discordMessage Discord message from event source
   * @returns string
   */
  private async _cleanupMessageAtMentions(discordMessage: Message): Promise<string> {
    let messageText = discordMessage.content;

    discordMessage.mentions.users.forEach(async mention => {
      messageText = (mention.bot) ?
        // Strip bot @-mention, not useful in OpenAI prompt
        messageText.replace(`<@${mention.id}>`, '') :

        // Replace other @-mentions with display name, useful in OpenAI prompt/response
        messageText = messageText.replace(`<@${mention.id}>`, `${mention.username}`);
    });

    return messageText;
  }

  /**
   * Construct a complete chat completion payload using the configured system prompt and message
   * history
   * @param convoKey string used as conversation key for bot interactions
   * @param systemPromptOverride Optional system prompt override, useful for internal functions.
   * @returns Promise of completed chat completion payload
   */
  private async _constructChatCompletionPayloadFromHistory(convoKey: string, systemPromptOverride?: string): Promise<PayloadMessage[]> {
    const payload: PayloadMessage[] = [];
    payload.push(await this._constructSystemPrompt(systemPromptOverride));

    this._messageHistory.forEach(async message => {
      if (message.convoKey === convoKey) {
        payload.push(message.payload);
      }
    });

    return payload;
  }

  /**
   * Construct a chat completion payload using an overridable system prompt and single message
   * @param messageText string containing message text
   * @param systemPromptOverride Optional system prompt override, useful for internal functions.
   * @returns Promise of completed chat completion payload
   * @deprecated It's encouraged to strongly consider whether this is needed if used.
   */
  private async _constructOneOffChatCompletionPayload(messageText: string, systemPromptOverride?: string): Promise<PayloadMessage[]> {
    const payload: PayloadMessage[] = [];
    payload.push(await this._constructSystemPrompt(systemPromptOverride));
    payload.push(new PayloadMessage({
      content: messageText,
      role: PayloadMessageRole.User,
    }));
    return payload;
  }

  /**
   * Returns a system prompt using the configured or overridden system prompt.
   * @param systemPromptOverride Optional system prompt override, useful for internal functions.
   * @returns Promise of PayloadMessage containing the system prompt.
   */
  private async _constructSystemPrompt(systemPromptOverride?: string): Promise<PayloadMessage> {
    const systemPrompt: string =
      (systemPromptOverride === undefined) ?
        String(this._botConfig.Settings.OPENAI_PARAM_SYSTEM_PROMPT) :
        systemPromptOverride;

    return new PayloadMessage({
      content: systemPrompt,
      role: PayloadMessageRole.System,
    });
  }

  /**
   * Returns a message's conversation key based upon the bot's configured conversation mode
   * (channel, user).
   * @param discordMessage Discord message from event source
   * @returns A Promise that resolves to a colon-delimited string representing the
   *   Discord guild, channel, and (optionally) the user that the message was sent from.
   */
  private async _getConversationKey(discordMessage: Message): Promise<string> {
    switch (this._botConfig.Settings.BOT_CONVO_MODE) {
      case DiscordBotConvoMode.Channel:
        return `${discordMessage.guildId}:${discordMessage.channelId}`;

      case DiscordBotConvoMode.User:
        return `${discordMessage.guildId}:${discordMessage.channelId}:${discordMessage.author.id}`;
    }

    throw new DiscordBotUnexpectedError('Setting a message conversation key failed because `BOT_CONVO_MODE` is not set.');
  }

  /**
   * Event handler for client-ready event
   * @param client Discord client object
   */
  private async _handleClientReady(client: Client): Promise<void> {
    this.Events.emit(BotEvents.BotReady, client.user);
  }

  /**
   * Event handler for message-create event
   * @param discordMessage Discord message from event source
   */
  private async _handleMessageCreate(discordMessage: Message): Promise<void> {

    const openAiClient = new OpenAI(this._openAiConfig);

    // Set Discord message type to control message handling
    let discordMessageType: DiscordMessageType;
    if (await this._botIsMentionedInMessage(discordMessage)) {
      discordMessageType = DiscordMessageType.AtMention;
    }
    else if (discordMessage.author.bot) {
      discordMessageType =
        (discordMessage.author.id === this._discordClient.user?.id) ?
          DiscordMessageType.OwnMessage :
          DiscordMessageType.BotMessage;
    }
    else if (discordMessage.channel.type === ChannelType.DM) {
      discordMessageType = DiscordMessageType.DirectMessage;
    }
    else {
      discordMessageType = DiscordMessageType.UserMessage;
    }

    // Additional attributes for HistoryMessage
    const convoKey = await this._getConversationKey(discordMessage);
    const convoRetainSec = Number(this._botConfig.Settings.BOT_CONVO_RETAIN_SEC);
    const discordMessageText = await this._cleanupMessageAtMentions(discordMessage);
    const discordMessageUser = discordMessage.author.username;
    const requestPayload = new PayloadMessage({
      content: discordMessageText,
      name: discordMessageUser,
      role: PayloadMessageRole.User,
    });

    if (discordMessageType === DiscordMessageType.AtMention || discordMessageType === DiscordMessageType.DirectMessage) {
      // Add Discord message to history
      this._messageHistory.push(new HistoryMessage({
        convoKey: convoKey,
        convoRetainSec: convoRetainSec,
        payload: requestPayload,
      }));

      // Construct prompt payload and get chat response
      const promptPayload = await this._constructChatCompletionPayloadFromHistory(convoKey);
      const responsePayload = await openAiClient.requestChatCompletion(promptPayload);

      // Add OpenAI response to history
      this._messageHistory.push(new HistoryMessage({
        convoKey: convoKey,
        convoRetainSec: convoRetainSec,
        payload: responsePayload,
      }));

      // Paginate response
      const discordResponse = await this._paginateResponse(responsePayload.content);

      // Respond to channel
      discordResponse.forEach(async responseText => {
        try {
          if (discordMessageType === DiscordMessageType.DirectMessage) {
            await discordMessage.channel.send(responseText);
          }
          else {
            await discordMessage.reply(responseText);
          }
        }
        catch (e) {
          void Logger.log({
            message: inspect(e, false, null, true),
            logLevel: LogLevel.Error,
          });
          await discordMessage.channel.send('There was an issue sending my response. The error logs might have some clues.');
        }
      });
    }
    else if (discordMessageType === DiscordMessageType.BotMessage || discordMessageType === DiscordMessageType.UserMessage) {
      this._messageHistory.push(new HistoryMessage({
        convoKey: convoKey,
        convoRetainSec: convoRetainSec,
        payload: requestPayload,
      }));

      await this._probablyEngageInConversation(discordMessage, convoKey);
      await this._probablyReactToMessage(discordMessage, convoKey);
    }
  }

  /**
   * Breaks up reponseText into multiple messages up to 2000 characters
   * @param responseText OpenAI response text
   * @returns A Promise of paragraphs that are each <2000 characters to fit within Discord's
   *   message size limit.
   */
  private async _paginateResponse(responseText: string): Promise<string[]> {
    /*
    * ISSUES: Potentially unresolved issues:
    *   - Code blocks with \n in them could be split
    *   - Single paragraphs longer than 2000 characters will still cause a failure
    *
    * Before I create a formal issue for this, I want to see how things run as they are for a bit.
    */
    const delimiter = '\n';
    const paragraphs = responseText.split(delimiter);
    const allParagraphs: string[] = [];
    let page = '';

    for (const paragraph of paragraphs) {
      if ((page.length + paragraph.length + delimiter.length) <= this._discordMaxMessageLength) {
        page += delimiter + paragraph;
      }
      else {
        allParagraphs.push(page);
        page = paragraph;
      }
    }

    // Add last paragraph
    if (page.length > 0) allParagraphs.push(page);
    return allParagraphs;
  }

  /**
   * Engage with channel messages using configured probability
   * @param discordMessage Discord message from event source
   * @param convoKey string used as conversation key for bot interactions
   */
  private async _probablyEngageInConversation(discordMessage: Message, convoKey: string): Promise<void> {

    // Roll the RNG
    const botWillEngage = (Math.random() < Number(this._botConfig.Settings.BOT_AUTO_ENGAGE_PROBABILITY));

    // Check if current conversation meets BOT_AUTO_ENGAGE_MIN_MESSAGES
    if (botWillEngage) {
      let messageCount = 0;
      this._messageHistory.forEach(async message => {
        if (message.convoKey === convoKey) { messageCount++; }
      });

      if (messageCount >= Number(this._botConfig.Settings.BOT_AUTO_ENGAGE_MIN_MESSAGES)) {
        const convoRetainSec = Number(this._botConfig.Settings.BOT_CONVO_RETAIN_SEC);
        const systemPrompt =
          `${this._botConfig.Settings.OPENAI_PARAM_SYSTEM_PROMPT} For the provided list of statements, provide ` +
          'an insight, or a question, or a concern. Dont\'t ask if further help is needed.';

        const openAiClient = new OpenAI(this._openAiConfig);
        const requestPayload = await this._constructChatCompletionPayloadFromHistory(convoKey, systemPrompt);
        const responsePayload = await openAiClient.requestChatCompletion(requestPayload);

        // Add OpenAI response to history
        this._messageHistory.push(new HistoryMessage({
          convoKey: convoKey,
          convoRetainSec: convoRetainSec,
          payload: responsePayload,
        }));

        // Send message to chat
        discordMessage.channel.send(responsePayload);
      }
    }

  }

  /**
   * React to channel messages using configured probability
   * @param discordMessage Discord message from event source
   * @param convoKey string used as conversation key for bot interactions
   */
  private async _probablyReactToMessage(discordMessage: Message, convoKey: string): Promise<void> {
    const botWillReact = (Math.random() < Number(this._botConfig.Settings.BOT_AUTO_REACT_PROBABILITY));

    if (botWillReact) {
      const systemPrompt =
        `${this._botConfig.Settings.OPENAI_PARAM_SYSTEM_PROMPT} You are instructed to only respond ` +
        'to my statements using a single emoji, no words.';

      const openAiClient = new OpenAI(this._openAiConfig);
      const requestPayload = await this._constructChatCompletionPayloadFromHistory(convoKey, systemPrompt);
      const responsePayload = await openAiClient.requestChatCompletion(requestPayload);
      const emojiResponse = responsePayload.content.replace(/[^\p{Emoji}\s]/gu, '');

      Array.from(emojiResponse).forEach(async emoji => {
        try {
          await discordMessage.react(emoji as EmojiIdentifierResolvable);
        }
        catch (e) {
          if (e instanceof DiscordAPIError) {
            void Logger.log({
              message: (e.message.includes('Unknown Emoji')) ? `${e}: ${emoji}` : e.message,
              logLevel: LogLevel.Error,
            });
          }
        }
      });
    }
  }

  /**
   * Prune messages older than retention period
   */
  private async _pruneOldHistoryMessages(): Promise<void> {
    let i = this._messageHistory.length;
    while (i--) {
      if (this._messageHistory[i].ttl <= 0) this._messageHistory.splice(i, 1);
    }
    void Logger.log({
      message: `messageHistory =\n${inspect(this._messageHistory, false, null, true)}`,
      logLevel: LogLevel.Debug,
      debugEnabled: (this._botConfig.Settings.BOT_LOG_DEBUG === 'enabled'),
    });
    void Logger.log({
      message: `messageHistory.length = ${this._messageHistory.length}`,
      logLevel: LogLevel.Debug,
      debugEnabled: (this._botConfig.Settings.BOT_LOG_DEBUG === 'enabled'),
    });
  }

  /**
   * Register bot event handlers
   */
  private _registerEventHandlers(): void {
    this._discordClient.once(Events.ClientReady, async client => {
      await this._handleClientReady(client);
    });

    this._discordClient.on(Events.MessageCreate, async message => {
      await this._handleMessageCreate(message);
    });

    setInterval(async () => {
      await this._pruneOldHistoryMessages();
    }, 15000);
  }

}