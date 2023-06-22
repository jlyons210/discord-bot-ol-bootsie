import {
  AttachmentBuilder,
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
} from '../OpenAI';
import {
  DiscordBotConversationMode,
  DiscordBotEvents,
  DiscordBotMessage,
  DiscordBotMessageIntent,
  DiscordBotMessageType,
} from './index';
import {
  FeatureToken,
  FeatureTokenBucket,
  FeatureTokenBucketMaxUserTokensError,
  HistoryMessage,
  HistoryMessageBucket,
} from '../ExpirableObject';
import {
  LogLevel,
  Logger,
} from '../Logger';
import { Config } from '../Config';
import { EventEmitter } from 'events';

/**
 * This Discord bot listens for channel events and interfaces with the OpenAI API to provide
 * message and channel interaction.
 */
export class DiscordBot {
  public Events = new EventEmitter();

  // Configurations
  private _botConfig: Config;
  private _botUserId: string;
  private _createImageFeatureEnabled: boolean;
  private _createImageTag: string;
  private _debugEnabled: boolean;
  private _openAiConfig: CreateChatCompletionConfiguration;

  // ExpirableObjectBuckets
  private _historyMessageBucket: HistoryMessageBucket;
  private _imageCreateTokenBucket: FeatureTokenBucket;

  // Clients
  private _discordClient: Client;

  /**
   * Creates an instance of the DiscordBot class with required configuration to authenticate the
   * bot's Discord client and operate within a channel. Establishes event listeners.
   * @param botConfig A populated Config object
   */
  constructor(botConfig: Config) {
    this._botConfig = botConfig;
    this._createImageFeatureEnabled = Boolean(this._botConfig.Settings['bot_createImage_enabled']);
    this._createImageTag = String(this._botConfig.Settings['bot_createImage_tag']);

    this._openAiConfig = {
      apiKey: String(this._botConfig.Settings['openai_api_key']),
      maxRetries: Number(this._botConfig.Settings['openai_api_maxRetries']),
      paramMaxTokens: Number(this._botConfig.Settings['openai_chatCompletion_maxTokens']),
      paramModel: String(this._botConfig.Settings['openai_chatCompletion_model']),
      paramSystemPrompt: String(this._botConfig.Settings['openai_chatCompletion_systemPrompt']),
      paramTemperature: Number(this._botConfig.Settings['openai_chatCompletion_temperature']),
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
    this._discordClient.login(String(this._botConfig.Settings['discord_botToken']));

    this._historyMessageBucket =
      new HistoryMessageBucket({
        historyMessageExpireSec: Number(this._botConfig.Settings['bot_conversation_retainSec']),
      });

    this._imageCreateTokenBucket =
      new FeatureTokenBucket({
        maxTokens: Number(this._botConfig.Settings['bot_createImage_tokens_perUser']),
        tokenExpireSec: Number(this._botConfig.Settings['bot_createImage_tokens_ttl']),
      });

    this._botUserId = String(this._discordClient.user?.id);
    this._debugEnabled = Boolean(this._botConfig.Settings['bot_log_debug']);

    this._registerEventHandlers();
  }

  /**
   * Construct a complete chat completion payload using the configured system prompt and message
   * history
   * @param conversationKey string used as conversation key for bot interactions
   * @param systemPromptOverride Optional system prompt override, useful for internal functions.
   * @returns Promise of completed chat completion payload
   */
  private async _constructChatCompletionPayloadFromHistory(conversationKey: string, systemPromptOverride?: string): Promise<CreateChatCompletionPayloadMessage[]> {
    const payload: CreateChatCompletionPayloadMessage[] = [];
    payload.push(await this._constructSystemPrompt(systemPromptOverride));

    this._historyMessageBucket.objects
      .filter(historyMessage => (historyMessage as HistoryMessage).conversationKey === conversationKey)
      .forEach(historyMessage => (payload.push((historyMessage as HistoryMessage).payload)));

    return payload;
  }

  /**
   * Construct a chat completion payload using an overridable system prompt and single message
   * @param messageText string containing message text
   * @param systemPromptOverride Optional system prompt override, useful for internal functions.
   * @returns Promise of completed chat completion payload
   */
  private async _constructChatCompletionPayloadFromSingleMessage(messageText: string, systemPromptOverride?: string): Promise<CreateChatCompletionPayloadMessage[]> {
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
        String(this._botConfig.Settings['openai_chatCompletion_systemPrompt']) :
        systemPromptOverride;

    return new CreateChatCompletionPayloadMessage({
      content: systemPrompt,
      role: CreateChatCompletionPayloadMessageRole.System,
    });
  }

  /**
   * Used to compress log lines throughout the application
   * @param messageId message ID
   * @param logMessage string
   */
  private async _debugLog(messageId: string, logMessage: string): Promise<void> {
    void Logger.log({
      message: `${messageId}: ${logMessage}`,
      logLevel: LogLevel.Debug,
      debugEnabled: this._debugEnabled,
    });
  }

  /**
   * Determine a channel message's DiscordBotMessageIntent
   * @param discordBotMessage DiscordBotMessage processed by MessageCreate handler
   * @returns DiscordBotMessageIntent
   */
  private async _getMessageIntent(discordBotMessage: DiscordBotMessage): Promise<DiscordBotMessageIntent> {
    const intentPrompt: CreateChatCompletionPayloadMessage[] =
      await this._constructChatCompletionPayloadFromSingleMessage(
        discordBotMessage.MessageContentSanitized,
        'For the following statement, please use only one of the following to categorize it, ' +
          `with no other commentary, in all lowercase - ${Object.values(DiscordBotMessageIntent)}`
      );

    const openAiClient = new CreateChatCompletion(this._openAiConfig);

    void this._debugLog(discordBotMessage.DiscordMessage.id, 'entering openAiClient.createChatCompletion(promptPayload) to get message intent');
    const intentResponse = await openAiClient.createChatCompletion(intentPrompt);
    void this._debugLog(discordBotMessage.DiscordMessage.id, 'exiting openAiClient.createChatCompletion(promptPayload) to get message intent');

    void this._debugLog(discordBotMessage.DiscordMessage.id, `_getMessageIntent returns: ${<DiscordBotMessageIntent>intentResponse.content}`);
    return <DiscordBotMessageIntent> intentResponse.content;
  }

  /**
   * Breaks up reponseText into multiple messages up to 2000 characters
   * @param responseText OpenAI response text
   * @returns string[] of paragraphs that are each <2000 characters to fit within Discord's message
   *   size limit.
   */
  private _getPaginatedResponse(responseText: string): string[] {
    /*
     * ISSUES: Potentially unresolved issues:
     *   - Code blocks with \n in them could be split
     *   - Single paragraphs longer than 2000 characters will still cause a failure
     *   - I've seen this occur, logged issue #85
     */
    const discordMaxMessageLength = 2000;
    const delimiter = '\n';
    const paragraphs = responseText.split(delimiter);
    const allParagraphs: string[] = [];
    let page = '';

    for (const paragraph of paragraphs) {
      if ((page.length + paragraph.length + delimiter.length) <= discordMaxMessageLength) {
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
   * Event handler for client-ready event
   * @param client Discord client object
   */
  private async _handleClientReady(client: Client): Promise<void> {
    this.Events.emit(DiscordBotEvents.BotReady, client.user);
    this._botUserId = (this._discordClient.user) ? this._discordClient.user.id : '';
  }

  /**
   * Event handler for message-create event
   * @param discordMessage Discord message from event source
   */
  private async _handleMessageCreate(discordMessage: Message): Promise<void> {
    const discordBotMessage = new DiscordBotMessage({
      discordMessage: discordMessage,
      botUserId: this._botUserId,
      botConversationMode: <DiscordBotConversationMode> this._botConfig.Settings['bot_conversation_mode'],
    });

    this._historyMessageBucket.add(new HistoryMessage({
      conversationKey: discordBotMessage.ConversationKey,
      payload:
        new CreateChatCompletionPayloadMessage({
          content: discordBotMessage.MessageContentSanitized,
          name: discordBotMessage.DiscordMessage.author.username,
          role: CreateChatCompletionPayloadMessageRole.User,
        }),
    }));

    void this._debugLog(discordBotMessage.DiscordMessage.id, `message type is ${discordBotMessage.MessageType}`);

    switch (discordBotMessage.MessageType) {
      case DiscordBotMessageType.AtMention:
      case DiscordBotMessageType.DirectMessage:
        switch (await this._getMessageIntent(discordBotMessage)) {
          case DiscordBotMessageIntent.ImagePrompt:
            void this._debugLog(discordBotMessage.DiscordMessage.id, 'entering _sendCreateImageResponse(discordBotMessage)');
            await this._sendCreateImageResponse(discordBotMessage);
            break;
          case DiscordBotMessageIntent.ChatMessage:
            void this._debugLog(discordBotMessage.DiscordMessage.id, 'entering _sendChatCompletionResponse(discordBotMessage)');
            await this._sendChatCompletionResponse(discordBotMessage);
            break;
        }
        break;

      case DiscordBotMessageType.BotMessage:
      case DiscordBotMessageType.UserMessage:
        void this._debugLog(discordBotMessage.DiscordMessage.id, 'entering _probablyEngageInConversation(discordBotMessage)');
        await this._probablyEngageInConversation(discordBotMessage);

        void this._debugLog(discordBotMessage.DiscordMessage.id, 'entering _probablyReactToMessage(discordBotMessage)');
        await this._probablyReactToMessage(discordBotMessage);
        break;
    }

    void this._debugLog(discordBotMessage.DiscordMessage.id, 'finished processing message');
  }

  /**
   * Engage with channel messages using configured probability
   * @param discordBotMessage DiscordBotMessage processed by MessageCreate handler
   */
  private async _probablyEngageInConversation(discordBotMessage: DiscordBotMessage): Promise<void> {
    const botAutoEngageMinMessages = Number(this._botConfig.Settings['bot_autoEngage_message_minMessages']);
    const messageCount =
      this._historyMessageBucket.objects
        .filter(message => (message as HistoryMessage).conversationKey === discordBotMessage.ConversationKey)
        .length;
    const botWillEngage = (
      Math.random() < Number(this._botConfig.Settings['bot_autoEngage_message_probability']) &&
      messageCount >= botAutoEngageMinMessages
    );

    void this._debugLog(discordBotMessage.DiscordMessage.id, `botWillEngage = ${botWillEngage}`);

    // Check if current conversation meets BOT_AUTO_ENGAGE_MIN_MESSAGES
    if (botWillEngage) {
      const systemPrompt =
        `${this._botConfig.Settings['openai_chatCompletion_systemPrompt']} ` +
        'For the provided list of statements, provide an insight, or a question, or a concern. ' +
        'Dont\'t ask if further help is needed.';
      const openAiClient = new CreateChatCompletion(this._openAiConfig);
      const requestPayload = await this._constructChatCompletionPayloadFromHistory(discordBotMessage.ConversationKey, systemPrompt);

      try {
        void this._debugLog(discordBotMessage.DiscordMessage.id, 'entering openAiClient.createChatCompletion(requestPayload) for unprompted engagement');
        const responsePayload = await openAiClient.createChatCompletion(requestPayload);
        void this._debugLog(discordBotMessage.DiscordMessage.id, 'exiting openAiClient.createChatCompletion(requestPayload) for unprompted engagement');

        this._historyMessageBucket.add(new HistoryMessage({
          conversationKey: discordBotMessage.ConversationKey,
          payload: responsePayload,
        }));

        void this._debugLog(discordBotMessage.DiscordMessage.id, 'sending unprompted response to channel');
        await discordBotMessage.DiscordMessage.channel.send(responsePayload);
      }
      catch (e) {
        if (e instanceof Error) {
          void Logger.log({ message: e.message, logLevel: LogLevel.Error });
          await discordBotMessage.DiscordMessage.channel.send('There was an issue sending my response. The error logs might have some clues.');
        }
      }
    }
  }

  /**
   * React to channel messages using configured probability
   * @param discordBotMessage DiscordBotMessage processed by MessageCreate handler
   */
  private async _probablyReactToMessage(discordBotMessage: DiscordBotMessage): Promise<void> {
    const botWillReact = (Math.random() < Number(this._botConfig.Settings['bot_autoEngage_react_probability']));

    void this._debugLog(discordBotMessage.DiscordMessage.id, `botWillReact = ${botWillReact}`);

    if (botWillReact) {
      const systemPrompt =
        `${this._botConfig.Settings['openai_chatCompletion_systemPrompt']} ` +
        'You are instructed to only respond to my statements using a single emoji, no words.';

      const openAiClient = new CreateChatCompletion(this._openAiConfig);
      const requestPayload = await this._constructChatCompletionPayloadFromHistory(discordBotMessage.ConversationKey, systemPrompt);
      let lastEmoji = '';

      try {
        void this._debugLog(discordBotMessage.DiscordMessage.id, 'entering openAiClient.createChatCompletion(requestPayload) for emoji response');
        const responsePayload = await openAiClient.createChatCompletion(requestPayload);
        void this._debugLog(discordBotMessage.DiscordMessage.id, 'exiting openAiClient.createChatCompletion(requestPayload) for emoji response');

        const emojiResponse = responsePayload.content.replace(/[^\p{Emoji}\s]/gu, '');

        void this._debugLog(discordBotMessage.DiscordMessage.id, `emojiResponse = '${emojiResponse}'`);

        Array.from(emojiResponse).forEach(async emoji => {
          lastEmoji = emoji;
          try {
            void this._debugLog(discordBotMessage.DiscordMessage.id, `reacting to message with '${emoji}'`);
            await discordBotMessage.DiscordMessage.react(emoji as EmojiIdentifierResolvable);
          }
          catch (e) {
            if (e instanceof DiscordAPIError) {
              void Logger.log({
                message: (e.message.includes('Unknown Emoji')) ? `${e.message}: '${lastEmoji}'` : e.message,
                logLevel: LogLevel.Error,
              });
            }
          }
        });
      }
      catch (e) {
        if (e instanceof Error) {
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
      void this._debugLog(message.id, 'message recieved, entering _handleMessageCreate(message)');
      await this._handleMessageCreate(message);
    });
  }

  /**
   * Sanitizes and submits conversation for an OpenAI Chat Completion response
   * @param discordBotMessage DiscordBotMessage processed by MessageCreate handler
   */
  private async _sendChatCompletionResponse(discordBotMessage: DiscordBotMessage): Promise<void> {
    try {
      const openAiClient = new CreateChatCompletion(this._openAiConfig);
      void this._debugLog(discordBotMessage.DiscordMessage.id, 'entering _constructChatCompletionPayloadFromHistory(discordBotMessage.ConversationKey)');
      const promptPayload = await this._constructChatCompletionPayloadFromHistory(discordBotMessage.ConversationKey);

      void this._debugLog(discordBotMessage.DiscordMessage.id, 'entering openAiClient.createChatCompletion(promptPayload) for chat response');
      const responsePayload = await openAiClient.createChatCompletion(promptPayload);
      void this._debugLog(discordBotMessage.DiscordMessage.id, 'exiting openAiClient.createChatCompletion(promptPayload) for chat response');

      void this._debugLog(discordBotMessage.DiscordMessage.id, 'entering _getPaginatedResponse(responsePayload.content)');
      const discordResponse = await this._getPaginatedResponse(responsePayload.content);

      this._historyMessageBucket.add(new HistoryMessage({
        conversationKey: discordBotMessage.ConversationKey,
        payload: responsePayload,
      }));

      void this._debugLog(discordBotMessage.DiscordMessage.id, 'sending chat completion response to channel');
      discordResponse.forEach(async responseText => {
        if (discordBotMessage.MessageType === DiscordBotMessageType.DirectMessage) {
          await discordBotMessage.DiscordMessage.channel.send(responseText);
        }
        else {
          await discordBotMessage.DiscordMessage.reply(responseText);
        }
      });
    }
    catch (e) {
      if (e instanceof Error) {
        void Logger.log({ message: e.message, logLevel: LogLevel.Error });
        await discordBotMessage.DiscordMessage.channel.send('There was an issue sending my response. The error logs might have some clues.');
      }
    }
  }

  /**
   * Send an image generated by the OpenAI CreateImage API from a prompt received in a Discord
   * message
   * @param discordBotMessage DiscordBotMessage processed by MessageCreate handler
   */
  private async _sendCreateImageResponse(discordBotMessage: DiscordBotMessage): Promise<void> {
    if (!this._createImageFeatureEnabled) {
      void this._debugLog(discordBotMessage.DiscordMessage.id, 'CreateImage feature is disabled');
      return;
    }

    const imagePrompt = discordBotMessage.MessageContentSanitized
      .replace(this._createImageTag, '')
      .trim();

    try {
      void this._debugLog(discordBotMessage.DiscordMessage.id, `${discordBotMessage.DiscordMessage.author.username} is spending feature token.`);
      this._imageCreateTokenBucket.add(new FeatureToken({ username: discordBotMessage.DiscordMessage.author.username }));

      const openAiClient = new CreateImage({
        apiKey: String(this._botConfig.Settings['openai_api_key']),
        maxRetries: Number(this._botConfig.Settings['openai_api_maxRetries']),
      });

      void this._debugLog(discordBotMessage.DiscordMessage.id, 'entering OpenAiClient.createImage()');
      const response = await openAiClient.createImage({
        numberOfImages: 1,
        prompt: imagePrompt,
        responseFormat: CreateImageResponseFormat.B64Json,
        size: CreateImageSize.Large,
        user: discordBotMessage.DiscordMessage.author.username,
      });
      void this._debugLog(discordBotMessage.DiscordMessage.id, 'exiting _sendCreateImageResponse(discordBotMessage)');

      const embed = new EmbedBuilder()
        .setTitle('ai maed dis')
        .setDescription(imagePrompt)
        .addFields({
          name: 'Generated by:',
          value: String(discordBotMessage.DiscordMessage.author.username),
          inline: true,
        })
        .setFooter({
          text: 'jlyons210/discord-bot-ol-bootsie',
          iconURL: 'https://grumple.cloud/assets/discord-bot-ol-bootsie/icon-github.png',
        })
        .setTimestamp();

      if (this._imageCreateTokenBucket.tokensRemaining(discordBotMessage.DiscordMessage.author.username)) {
        embed.addFields({
          name: 'Tokens remaining:',
          value: String(this._imageCreateTokenBucket.tokensRemaining(discordBotMessage.DiscordMessage.author.username)),
          inline: true,
        });
      }
      else {
        embed.addFields({
          name: 'Next token available:',
          value: this._imageCreateTokenBucket.nextTokenTime(discordBotMessage.DiscordMessage.author.username),
          inline: true,
        });
      }

      const files: AttachmentBuilder[] = [];
      if ('url' in response.data[0]) {
        void this._debugLog(discordBotMessage.DiscordMessage.id, 'embedding image using URL');
        embed.setImage(response.data[0].url);
      }
      else if ('b64_json' in response.data[0]) {
        void this._debugLog(discordBotMessage.DiscordMessage.id, 'embeding image using base64 encoded attachment');
        files.push(new AttachmentBuilder(
          Buffer.from(response.data[0].b64_json, 'base64'),
          { name: `openai-image-${Date.now()}.png` }
        ));
        embed.setImage(`attachment://${files[0].name}`);
      }

      void this._debugLog(discordBotMessage.DiscordMessage.id, 'sending embedded image response to channel');
      await discordBotMessage.DiscordMessage.channel.send({ embeds: [ embed ], files: files });
    }
    catch (e) {
      if (e instanceof FeatureTokenBucketMaxUserTokensError) {
        await discordBotMessage.DiscordMessage.channel.send(e.message);
      }
      else if (e instanceof DiscordAPIError) {
        void Logger.log({ message: e.message, logLevel: LogLevel.Error });
        void this._debugLog(discordBotMessage.DiscordMessage.id, `${discordBotMessage.DiscordMessage.author.username} received refunded feature token.`);
        this._imageCreateTokenBucket.removeNewestToken(discordBotMessage.DiscordMessage.author.username);
      }
      else if (e instanceof Error) {
        void Logger.log({ message: e.message, logLevel: LogLevel.Error });
        await discordBotMessage.DiscordMessage.channel.send('There was an issue sending my response. The error logs might have some clues.');
        void this._debugLog(discordBotMessage.DiscordMessage.id, `${discordBotMessage.DiscordMessage.author.username} received refunded feature token.`);
        this._imageCreateTokenBucket.removeNewestToken(discordBotMessage.DiscordMessage.author.username);
      }
    }
  }

}