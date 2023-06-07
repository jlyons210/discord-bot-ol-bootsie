import {
  AttachmentBuilder,
  ChannelType,
  Client,
  DiscordAPIError,
  EmbedBuilder,
  EmojiIdentifierResolvable,
  Events,
  GatewayIntentBits,
  Message,
  Partials,
} from 'discord.js';
import {
  CreateChatCompletion,
  CreateChatCompletionConfiguration,
  CreateChatCompletionPayloadMessage,
  CreateChatCompletionPayloadMessageRole,
  CreateImage,
  CreateImageResponseFormat,
  CreateImageSize,
  OpenAIBadRequestError,
  OpenAIRetriesExceededError,
  OpenAIUnexpectedError,
} from '../OpenAI';
import {
  DiscordBotConvoMode,
  DiscordBotEvents,
  DiscordBotMessageType,
  DiscordBotUnexpectedError,
} from './index';
import {
  FeatureToken,
  FeatureTokenBucket,
  FeatureTokenBucketMaxUserTokensError,
} from '../ExpirableObject/FeatureToken';
import {
  HistoryMessage,
  HistoryMessageBucket,
} from '../ExpirableObject/HistoryMessage';
import {
  LogLevel,
  Logger,
} from '../Logger';
import { Config } from '../Config';
import { EventEmitter } from 'events';
import { inspect } from 'util';

/**
 * This Discord bot listens for channel events and interfaces with the OpenAI API to provide
 * message and channel interaction.
 */
export class DiscordBot {
  public Events = new EventEmitter();
  private _botConfig: Config;
  private _discordClient: Client;
  private _discordMaxMessageLength = 2000;
  private _historyMessageBucket: HistoryMessageBucket;
  private _imageCreateTokenBucket: FeatureTokenBucket;
  private _openAiConfig: CreateChatCompletionConfiguration;

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

    this._historyMessageBucket =
      new HistoryMessageBucket({
        historyMessageExpireSec: Number(this._botConfig.Settings.BOT_CONVO_RETAIN_SEC),
      });

    this._imageCreateTokenBucket =
      new FeatureTokenBucket({
        maxTokens: Number(this._botConfig.Settings.BOT_CREATE_IMAGE_USER_TOKENS),
        tokenExpireSec: Number(this._botConfig.Settings.BOT_CREATE_IMAGE_USER_TOKENS_EXPIRE_SEC),
      });

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
  private async _constructChatCompletionPayloadFromHistory(convoKey: string, systemPromptOverride?: string): Promise<CreateChatCompletionPayloadMessage[]> {
    const payload: CreateChatCompletionPayloadMessage[] = [];
    payload.push(await this._constructSystemPrompt(systemPromptOverride));
    payload.concat(this._historyMessageBucket.objects
      .filter(historyMessage => (historyMessage as HistoryMessage).convoKey === convoKey)
      .map(message => (message as HistoryMessage).payload));

    return payload;
  }

  /**
   * Construct a chat completion payload using an overridable system prompt and single message
   * @param messageText string containing message text
   * @param systemPromptOverride Optional system prompt override, useful for internal functions.
   * @returns Promise of completed chat completion payload
   * @deprecated It's encouraged to strongly consider whether this is needed if used.
   */
  private async _constructOneOffChatCompletionPayload(messageText: string, systemPromptOverride?: string): Promise<CreateChatCompletionPayloadMessage[]> {
    const payload: CreateChatCompletionPayloadMessage[] = [];
    payload.push(await this._constructSystemPrompt(systemPromptOverride));
    payload.push(new CreateChatCompletionPayloadMessage({
      content: messageText,
      role: CreateChatCompletionPayloadMessageRole.User,
    }));
    return payload;
  }

  /**
   * Returns a system prompt using the configured or overridden system prompt.
   * @param systemPromptOverride Optional system prompt override, useful for internal functions.
   * @returns Promise of PayloadMessage containing the system prompt.
   */
  private async _constructSystemPrompt(systemPromptOverride?: string): Promise<CreateChatCompletionPayloadMessage> {
    const systemPrompt: string =
      (systemPromptOverride === undefined) ?
        String(this._botConfig.Settings.OPENAI_PARAM_SYSTEM_PROMPT) :
        systemPromptOverride;

    return new CreateChatCompletionPayloadMessage({
      content: systemPrompt,
      role: CreateChatCompletionPayloadMessageRole.System,
    });
  }

  /**
   * Send an image generated by the OpenAI CreateImage API from a prompt received in a Discord
   * message
   * @param message Discord message passed by the Events.MessageCreate event
   */
  private async _embedImageFromPromptMessage(message: Message): Promise<void> {
    const imagePrompt = (await this._cleanupMessageAtMentions(message))
      .replace(String(this._botConfig.Settings.BOT_CREATE_IMAGE_TAG), '')
      .trim();

    try {
      this._imageCreateTokenBucket.add(new FeatureToken({ username: message.author.tag }));

      const openAiClient = new CreateImage({
        apiKey: String(this._botConfig.Settings.OPENAI_API_KEY),
        maxRetries: Number(this._botConfig.Settings.OPENAI_MAX_RETRIES),
      });

      const response = await openAiClient.createImage({
        numberOfImages: 1,
        prompt: imagePrompt,
        responseFormat: CreateImageResponseFormat.B64Json,
        size: CreateImageSize.Large,
        user: message.author.username,
      });

      const embed = new EmbedBuilder()
        .setTitle('ai maed dis')
        .setDescription(imagePrompt)
        .addFields({
          name: 'Generated by:',
          value: String(message.author.tag),
          inline: true,
        })
        .setFooter({
          text: 'jlyons210/discord-bot-ol-bootsie',
          iconURL: 'https://grumple.cloud/assets/discord-bot-ol-bootsie/icon-github.png',
        })
        .setTimestamp();

      if (this._imageCreateTokenBucket.tokensRemaining(message.author.tag)) {
        embed.addFields({
          name: 'Tokens remaining:',
          value: String(this._imageCreateTokenBucket.tokensRemaining(message.author.tag)),
          inline: true,
        });
      }
      else {
        embed.addFields({
          name: 'Next token available:',
          value: this._imageCreateTokenBucket.nextTokenTime(message.author.tag),
          inline: true,
        });
      }

      const files: AttachmentBuilder[] = [];
      if ('url' in response.data[0]) {
        embed.setImage(response.data[0].url);
      }
      else if ('b64_json' in response.data[0]) {
        files.push(new AttachmentBuilder(
          Buffer.from(response.data[0].b64_json, 'base64'),
          { name: `openai-image-${Date.now()}.png` }
        ));
        embed.setImage(`attachment://${files[0].name}`);
      }

      await message.channel.send({ embeds: [embed], files: files });
    }
    catch (e) {
      if (e instanceof FeatureTokenBucketMaxUserTokensError) {
        await message.channel.send(e.message);
      }
      else if (e instanceof DiscordAPIError) {
        Logger.log({ message: e.message, logLevel: LogLevel.Error });
        this._imageCreateTokenBucket.removeNewestToken(message.author.tag);
      }
      else if (e instanceof Error) {
        void Logger.log({ message: e.message, logLevel: LogLevel.Error });
        await message.channel.send('There was an issue sending my response. The error logs might have some clues.');
        this._imageCreateTokenBucket.removeNewestToken(message.author.tag);
      }
    }
  }

  /**
   * Returns a message's conversation key based upon the bot's configured conversation mode (channel, user).
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
    this.Events.emit(DiscordBotEvents.BotReady, client.user);
  }

  /**
   * Event handler for message-create event
   * @param discordMessage Discord message from event source
   */
  private async _handleMessageCreate(discordMessage: Message): Promise<void> {

    const openAiClient = new CreateChatCompletion(this._openAiConfig);

    // Set Discord message type to control message handling
    let discordMessageType: DiscordBotMessageType;
    if (await this._botIsMentionedInMessage(discordMessage)) {
      discordMessageType = DiscordBotMessageType.AtMention;
    }
    else if (discordMessage.author.bot) {
      discordMessageType =
        (discordMessage.author.id === this._discordClient.user?.id) ?
          DiscordBotMessageType.OwnMessage :
          DiscordBotMessageType.BotMessage;
    }
    else if (discordMessage.channel.type === ChannelType.DM) {
      discordMessageType = DiscordBotMessageType.DirectMessage;
    }
    else {
      discordMessageType = DiscordBotMessageType.UserMessage;
    }

    // Additional attributes for HistoryMessage
    const convoKey = await this._getConversationKey(discordMessage);
    const discordMessageText = await this._cleanupMessageAtMentions(discordMessage);
    const discordMessageUser = discordMessage.author.username;
    const createImageFeatureEnabled = (this._botConfig.Settings.BOT_CREATE_IMAGE_FEATURE === 'enabled');
    const createImageTag = String(this._botConfig.Settings.BOT_CREATE_IMAGE_TAG);
    const requestPayload = new CreateChatCompletionPayloadMessage({
      content: discordMessageText,
      name: discordMessageUser,
      role: CreateChatCompletionPayloadMessageRole.User,
    });

    if (discordMessageType === DiscordBotMessageType.AtMention || discordMessageType === DiscordBotMessageType.DirectMessage) {
      this._historyMessageBucket.add(new HistoryMessage({
        convoKey: convoKey,
        payload: requestPayload,
      }));

      if (createImageFeatureEnabled && discordMessageText.includes(createImageTag)) {
        await this._embedImageFromPromptMessage(discordMessage);
      }
      else {
        try {
          const promptPayload = await this._constructChatCompletionPayloadFromHistory(convoKey);
          const responsePayload = await openAiClient.createChatCompletion(promptPayload);

          this._historyMessageBucket.add(new HistoryMessage({
            convoKey: convoKey,
            payload: responsePayload,
          }));

          const discordResponse = await this._paginateResponse(responsePayload.content);
          discordResponse.forEach(async responseText => {
            try {
              if (discordMessageType === DiscordBotMessageType.DirectMessage) {
                await discordMessage.channel.send(responseText);
              }
              else {
                await discordMessage.reply(responseText);
              }
            }
            catch (e) {
              if (e instanceof DiscordAPIError) {
                void Logger.log({ message: e.message, logLevel: LogLevel.Error });
                await discordMessage.channel.send('There was an issue sending my response. The error logs might have some clues.');
              }
            }
          });
        }
        catch (e) {
          if (e instanceof OpenAIBadRequestError ||
              e instanceof OpenAIRetriesExceededError ||
              e instanceof OpenAIUnexpectedError) {
            void Logger.log({ message: e.message, logLevel: LogLevel.Error });
            await discordMessage.channel.send('There was an issue sending my response. The error logs might have some clues.');
          }
        }
      }
    }
    else if (discordMessageType === DiscordBotMessageType.BotMessage || discordMessageType === DiscordBotMessageType.UserMessage) {
      this._historyMessageBucket.add(new HistoryMessage({
        convoKey: convoKey,
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
      const botAutoEngageMinMessages = Number(this._botConfig.Settings.BOT_AUTO_ENGAGE_MIN_MESSAGES);
      const messageCount =
        this._historyMessageBucket.objects
          .filter(message => (message as HistoryMessage).convoKey === convoKey)
          .length;

      if (messageCount >= botAutoEngageMinMessages) {
        const systemPrompt =
          `${this._botConfig.Settings.OPENAI_PARAM_SYSTEM_PROMPT} For the provided list of statements, provide ` +
          'an insight, or a question, or a concern. Dont\'t ask if further help is needed.';

        const openAiClient = new CreateChatCompletion(this._openAiConfig);
        const requestPayload = await this._constructChatCompletionPayloadFromHistory(convoKey, systemPrompt);

        try {
          const responsePayload = await openAiClient.createChatCompletion(requestPayload);

          this._historyMessageBucket.add(new HistoryMessage({
            convoKey: convoKey,
            payload: responsePayload,
          }));

          await discordMessage.channel.send(responsePayload);
        }
        catch (e) {
          if (e instanceof DiscordAPIError ||
              e instanceof OpenAIBadRequestError ||
              e instanceof OpenAIRetriesExceededError ||
              e instanceof OpenAIUnexpectedError) {
            void Logger.log({ message: e.message, logLevel: LogLevel.Error });
            await discordMessage.channel.send('There was an issue sending my response. The error logs might have some clues.');
          }
        }
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

      const openAiClient = new CreateChatCompletion(this._openAiConfig);
      const requestPayload = await this._constructChatCompletionPayloadFromHistory(convoKey, systemPrompt);
      let lastEmoji = '';

      try {
        const responsePayload = await openAiClient.createChatCompletion(requestPayload);
        const emojiResponse = responsePayload.content.replace(/[^\p{Emoji}\s]/gu, '');

        Array.from(emojiResponse).forEach(async emoji => {
          lastEmoji = emoji;
          try {
            await discordMessage.react(emoji as EmojiIdentifierResolvable);
          }
          catch (e) {
            if (e instanceof DiscordAPIError) {
              void Logger.log({
                message: (e.message.includes('Unknown Emoji')) ? `${e.message}: ${lastEmoji}` : e.message,
                logLevel: LogLevel.Error,
              });
            }
          }
        });
      }
      catch (e) {
        if (e instanceof OpenAIBadRequestError ||
            e instanceof OpenAIRetriesExceededError ||
            e instanceof OpenAIUnexpectedError) {
          void Logger.log({ message: e.message, logLevel: LogLevel.Error });
        }
      }
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
  }

}