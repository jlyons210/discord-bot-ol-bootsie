import {
  OpenAIConfig,
  PayloadMessage,
  PayloadMessageRole,
  OpenAI,
} from '../OpenAI';

import {
  ChannelType,
  Client,
  EmojiIdentifierResolvable,
  Events,
  GatewayIntentBits,
  Message,
  Partials,
} from 'discord.js';

import {
  BotEvents,
  DiscordBotThreadMode,
  DiscordBotUnexpectedError,
  DiscordMessageType,
  HistoryMessage,
} from './index';

import { EventEmitter } from 'events';
import { inspect } from 'util';
import { LogLevel, Logger } from '../Logger';
import * as path from 'path';
import { Config } from '../ConfigTemplate';

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
      apiKey: this._botConfig.Settings.OPENAI_API_KEY.toString(),
      maxRetries: parseInt(this._botConfig.Settings.OPENAI_MAX_RETRIES.toString()),
      paramMaxTokens: parseInt(this._botConfig.Settings.OPENAI_PARAM_MAX_TOKENS.toString()),
      paramModel: this._botConfig.Settings.OPENAI_PARAM_MODEL.toString(),
      paramSystemPrompt: this._botConfig.Settings.OPENAI_PARAM_SYSTEM_PROMPT.toString(),
      paramTemperature: parseFloat(this._botConfig.Settings.OPENAI_PARAM_TEMPERATURE.toString()),
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
    this._discordClient.login(this._botConfig.Settings.DISCORD_BOT_TOKEN.toString());

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
      if (mention.id == this._discordClient.user?.id) isMentioned = true;
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
   * Returns a message's thread signature based upon the bot's configured attention span (channel, user).
   * @param discordMessage Discord message from event source
   * @returns A Promise that resolves to a colon-delimited string representing the
   *   Discord guild, channel, and (optionally) the user that the message was sent from.
   */
  private async _createMessageThreadSignature(discordMessage: Message): Promise<string> {
    if (this._botConfig.Settings.BOT_THREAD_MODE) {
      const threadMode = DiscordBotThreadMode[
        this._botConfig.Settings.BOT_THREAD_MODE.toString().toLowerCase() as keyof typeof DiscordBotThreadMode
      ];

      switch (threadMode) {
        case DiscordBotThreadMode.Channel:
          return `${discordMessage.guildId}:${discordMessage.channelId}`;

        case DiscordBotThreadMode.User:
          return `${discordMessage.guildId}:${discordMessage.channelId}:${discordMessage.author.id}`;
      }
    }

    throw new DiscordBotUnexpectedError('Setting a message thread signature failed because `BOT_THREAD_MODE` is not set.');
  }

  /**
   * Event handler for client-ready event
   * @param client Discord client object
   */
  private async _handleClientReady(client: Client): Promise<void> {
    this.Events.emit(BotEvents.BotReady, client.user?.id);
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
    else if (discordMessage.author.id == this._discordClient.user?.id) {
      discordMessageType = DiscordMessageType.BotMessage;
    }
    else if (discordMessage.channel.type == ChannelType.DM) {
      discordMessageType = DiscordMessageType.DirectMessage;
    }
    else {
      discordMessageType = DiscordMessageType.UserMessage;
    }

    // Additional attributes for HistoryMessage
    const threadSignature = await this._createMessageThreadSignature(discordMessage);
    const botThreadRetainSec = parseInt(this._botConfig.Settings.BOT_THREAD_RETAIN_SEC.toString());

    const discordMessageText = await this._cleanupMessageAtMentions(discordMessage);
    const discordMessageUser = discordMessage.author.username;

    const requestPayload: PayloadMessage = {
      content: discordMessageText,
      name: discordMessageUser,
      role: PayloadMessageRole.user,
    };

    if (discordMessageType === DiscordMessageType.AtMention || discordMessageType === DiscordMessageType.DirectMessage) {
      // Add Discord message to history
      this._messageHistory.push(new HistoryMessage({
        directEngagement: true,
        payload: requestPayload,
        threadSignature: threadSignature,
      }, botThreadRetainSec));

      // Construct prompt payload and get chat response
      const promptPayload = await this._constructChatCompletionPayloadWithHistory(this._messageHistory, threadSignature);
      const responsePayload = await openAiClient.requestChatCompletion(promptPayload);

      // Add OpenAI response to history
      this._messageHistory.push(new HistoryMessage({
        directEngagement: true,
        payload: responsePayload,
        threadSignature: threadSignature,
      }, botThreadRetainSec));

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
        catch (error) {
          await Logger.log(inspect(error, false, null, true), LogLevel.Error);
          await discordMessage.channel.send('There was an issue sending my response. The error logs might have some clues.');
        }
      });
    }
    else {
      // Add channel text to chat history
      this._messageHistory.push(new HistoryMessage({
        directEngagement: false,
        payload: requestPayload,
        threadSignature: threadSignature,
      }, botThreadRetainSec));

      if (discordMessageType !== DiscordMessageType.BotMessage) {
        await this._probablyReactToMessage(discordMessage);
        await this._probablyEngageInConversation(discordMessage, threadSignature);
      }
    }
  }

  /**
   * Breaks up reponseText into multiple messages up to 2000 characters
   * @param responseText OpenAI response text
   * @returns A Promise of responseText strings that are each <2000 characters to fit
   *  within Discord's message size limit.
   */
  private async _paginateResponse(responseText: string): Promise<string[]> {
    /*
    * ISSUES: Potentially unresolved issues:
    *   - Code blocks with \n\n in them could be split
    *   - Single paragraphs longer than 2000 characters will still cause a failure
    *
    * Before I create a formal issue for this, I want to see how things run as they are for a bit.
    */
    const delimiter = '\n\n';
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
   * @param threadSignature string used as conversation key for bot interactions
   */
  private async _probablyEngageInConversation(discordMessage: Message, threadSignature: string): Promise<void> {

    // Roll the RNG
    const botWillEngage = (Math.random() < parseFloat(this._botConfig.Settings.BOT_AUTO_ENGAGE_PROBABILITY.toString()));

    if (botWillEngage) {
      const autoEngagePayload: HistoryMessage[] = [];
      let messageCount = 0;

      this._messageHistory.forEach(async message => {
        if (message.threadSignature === threadSignature) {
          autoEngagePayload.push(message);
          messageCount++;
        }
      });

      // There should be a minimum number of messages for a meaningful engagement
      if (messageCount >= parseFloat(this._botConfig.Settings.BOT_AUTO_ENGAGE_MIN_MESSAGES.toString())) {
        const systemPrompt =
          `${this._botConfig.Settings.OPENAI_PARAM_SYSTEM_PROMPT} For the provided list of statements, provide ` +
          'an insight, or a question, or a concern. Dont\'t ask if further help is needed.';

        const openAiClient = new OpenAI(this._openAiConfig);
        const requestPayload = await this._constructChatCompletionPayloadWithHistory(autoEngagePayload, threadSignature, systemPrompt);
        const responsePayload = await openAiClient.requestChatCompletion(requestPayload);

        // Send message to chat
        discordMessage.channel.send(responsePayload);
      }
    }

  }

  /**
   * React to channel messages using configured probability
   * @param discordMessage Discord message from event source
   */
  private async _probablyReactToMessage(discordMessage: Message): Promise<void> {
    const botWillReact = (Math.random() < parseInt(this._botConfig.Settings.BOT_AUTO_REACT_PROBABILITY.toString()));

    if (botWillReact) {
      const emojiPayload = await this._constructOneOffChatCompletionPayload(
        `${this._botConfig.Settings.OPENAI_PARAM_SYSTEM_PROMPT} Respond using nothing but two emojis to the ` +
        `following statement: "${discordMessage.content}"`
      );

      const openAiClient = new OpenAI(this._openAiConfig);
      const responsePayload = await openAiClient.requestChatCompletion(emojiPayload);
      const emojiResponse = responsePayload.content.replace(/[^\p{Emoji}\s]/gu, '');

      Array.from(emojiResponse).forEach(async emoji => {
        try {
          await discordMessage.react(emoji as EmojiIdentifierResolvable);
        }
        catch (error) {
          if (typeof error === 'string') {
            await Logger.log(error, LogLevel.Error);
          }
        }
      });
    }
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
      await this._pruneOldThreadMessages();
    }, 15000);
  }

  /**
   * Construct a chat completion payload using an overridable system prompt and single message
   * @param messageText string containing message text
   * @param systemPromptOverride Optional system prompt override, useful for internal functions.
   * @returns Promise of completed chat completion payload
   */
  private async _constructOneOffChatCompletionPayload(messageText: string, systemPromptOverride?: string): Promise<PayloadMessage[]> {
    const payload: PayloadMessage[] = [];
    payload.push(await this._constructSystemPrompt(systemPromptOverride));

    payload.push({
      role: PayloadMessageRole.user,
      name: path.basename(__filename, '.js'),
      content: messageText,
    });

    return payload;
  }

  /**
   * Construct a complete chat completion payload using the configured system prompt and message
   * history
   * @param messageHistory HistoryMessage array containing all chat history
   * @param threadSignature string used as conversation key for bot interactions
   * @param systemPromptOverride Optional system prompt override, useful for internal functions.
   * @returns Promise of completed chat completion payload
   */
  private async _constructChatCompletionPayloadWithHistory(messageHistory: HistoryMessage[], threadSignature: string, systemPromptOverride?: string): Promise<PayloadMessage[]> {
    const payload: PayloadMessage[] = [];
    payload.push(await this._constructSystemPrompt(systemPromptOverride));

    messageHistory.forEach(async message => {
      if (message.threadSignature == threadSignature && message.isDirectEngagement) {
        payload.push({
          role: message.payload.role,
          content: message.payload.content,
          // name must be undefined in a [role: 'assistant'] payload, otherwise OpenAI API returns a 400 error
          name: (message.payload.role === PayloadMessageRole.assistant) ? undefined : message.payload.name,
        });
      }
    });

    return payload;
  }

  /**
   * Returns a system prompt using the configured or overridden system prompt.
   * @param systemPromptOverride Optional system prompt override, useful for internal functions.
   * @returns Promise of PayloadMessage containing the system prompt.
   */
  private async _constructSystemPrompt(systemPromptOverride?: string): Promise<PayloadMessage> {
    const systemPrompt: string = (systemPromptOverride === undefined) ?
      this._botConfig.Settings.OPENAI_PARAM_SYSTEM_PROMPT.toString() :
      systemPromptOverride;

    const payload: PayloadMessage = {
      role: PayloadMessageRole.system,
      content: systemPrompt,
    };

    return payload;
  }

  /**
   * Generate a retry message to handle unknown issue
   * @returns string containing a generated retry message
   * @deprecated It looks like this isn't in use by anything
   */
  private async _generateTryAgainMessage(): Promise<PayloadMessage> {
    const prompt = 'In one short sentence, tell me that you don\'t understand what I meant by what I said.';
    const payload = await this._constructOneOffChatCompletionPayload(prompt);
    const openAiClient = new OpenAI(this._openAiConfig);
    const responseText = await openAiClient.requestChatCompletion(payload);
    return responseText;
  }

  /**
   * Prune messages older than retention period
   */
  private async _pruneOldThreadMessages(): Promise<void> {
    let i = this._messageHistory.length;
    while (i--) {
      if (this._messageHistory[i].ttl <= 0) this._messageHistory.splice(i, 1);
    }
    await Logger.log(`messageHistory.length = ${this._messageHistory.length}`, LogLevel.Debug);
  }

}