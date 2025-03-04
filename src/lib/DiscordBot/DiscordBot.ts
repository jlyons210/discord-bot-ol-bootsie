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
  TextChannel,
} from 'discord.js';

import {
  ClientOptions,
  CreateChatCompletion,
  CreateChatCompletionConfiguration,
  CreateChatCompletionPayloadMessage,
  CreateChatCompletionPayloadMessageRole,
  CreateImage,
  ImageModel,
  QualityDallE3,
  RequestOptions,
  RequestOptionsDallE2,
  RequestOptionsDallE3,
  ResponseFormat,
  SizeDallE2,
  SizeDallE3,
  StyleDallE3,
} from '../OpenAI/index.js';

import {
  DiscordBotConversationMode,
  DiscordBotEvents,
  DiscordBotMessage,
  DiscordBotMessageIntent,
  DiscordBotMessageType,
} from './index.js';

import {
  FeatureToken,
  FeatureTokenBucket,
  FeatureTokenBucketMaxUserTokensError,
  HistoryMessage,
  HistoryMessageBucket,
} from '../ExpirableObject/index.js';

import { Config } from '../Config/index.js';
import { EventEmitter } from 'events';
import { Logger } from '../Logger/index.js';

/**
 * This Discord bot listens for channel events and interfaces with the OpenAI API to provide
 * message and channel interaction.
 */
export class DiscordBot {
  public Events = new EventEmitter();

  // Configurations
  private botConfig: Config;
  private botUserId!: string;
  private createImageFeatureEnabled: boolean;
  private openAiCreateChatCompletionConfig: CreateChatCompletionConfiguration;
  private openAiCreateImageConfig: ClientOptions;

  // ExpirableObjectBuckets
  private historyMessageBucket: HistoryMessageBucket;
  private imageCreateTokenBucket: FeatureTokenBucket;

  // Clients
  private discordClient!: Client;
  private logger: Logger;

  /**
   * Creates an instance of the DiscordBot class with required configuration to authenticate the
   * bot's Discord client and operate within a channel. Establishes event listeners.
   * @param {Config} botConfig
   *   A populated Config object
   */
  constructor(botConfig: Config) {
    this.botConfig = botConfig;
    const settings = botConfig.Settings;
    this.logger = new Logger(Boolean(settings['bot_log_debug']));

    this.createImageFeatureEnabled = Boolean(settings['bot_createImage_enabled']);

    this.openAiCreateChatCompletionConfig = {
      apiKey: String(settings['openai_api_key']),
      maxRetries: Number(settings['openai_api_maxRetries']),
      paramMaxTokens: Number(settings['openai_chatCompletion_maxTokens']),
      paramModel: String(settings['openai_chatCompletion_model']),
      paramSystemPrompt: String(settings['openai_chatCompletion_systemPrompt']),
      paramTemperature: Number(settings['openai_chatCompletion_temperature']),
      timeoutSec: Number(settings['openai_api_timeoutSec']),
    };

    this.openAiCreateImageConfig = {
      apiKey: String(settings['openai_api_key']),
      maxRetries: Number(settings['openai_api_maxRetries']),
      timeoutSec: Number(settings['openai_api_timeoutSec']),
    };

    this.historyMessageBucket = new HistoryMessageBucket({
      historyMessageExpireSec: Number(settings['bot_conversation_retainSec']),
    });

    this.imageCreateTokenBucket = new FeatureTokenBucket({
      maxTokens: Number(settings['bot_createImage_tokens_perUser']),
      tokenExpireSec: Number(settings['bot_createImage_tokens_ttl']),
    });

    this.createDiscordClient();
    this.registerEventHandlers();
  }

  /**
   * Construct a chat completion payload using an overridable system prompt and message history.
   * @param {string} conversationKey
   *   string used as conversation key for bot interactions
   * @param {string} [systemPromptOverride]
   *   Optional system prompt override, useful for internal functions.
   * @returns {Promise<CreateChatCompletionPayloadMessage[]>}
   *   Promise of completed chat completion payload
   */
  private async constructChatCompletionPayloadFromHistory(
    conversationKey: string,
    systemPromptOverride?: string,
  ): Promise<CreateChatCompletionPayloadMessage[]> {
    const payload: CreateChatCompletionPayloadMessage[] = [];
    payload.push(await this.constructSystemPrompt(systemPromptOverride));

    this.historyMessageBucket.objects
      .filter((historyMessage: HistoryMessage) =>
        historyMessage.conversationKey === conversationKey,
      )
      .forEach((historyMessage: HistoryMessage) =>
        payload.push(historyMessage.payload as CreateChatCompletionPayloadMessage),
      );

    return payload;
  }

  /**
   * Construct a chat completion payload using an overridable system prompt and single message.
   * @param {string} messageText
   *   string containing message text
   * @param {string} [systemPromptOverride]
   *   Optional system prompt override, useful for internal functions.
   * @returns {Promise<CreateChatCompletionPayloadMessage[]>}
   *   Promise of completed chat completion payload
   */
  private async constructChatCompletionPayloadFromSingleMessage(
    messageText: string,
    systemPromptOverride?: string,
  ): Promise<CreateChatCompletionPayloadMessage[]> {
    const payload: CreateChatCompletionPayloadMessage[] = [];
    payload.push(await this.constructSystemPrompt(systemPromptOverride));

    payload.push(new CreateChatCompletionPayloadMessage({
      content: messageText,
      role: CreateChatCompletionPayloadMessageRole.User,
    }));

    return payload;
  }

  /**
   * Returns a system prompt using the configured or overridden system prompt.
   * @param {string} [systemPromptOverride]
   *   Optional system prompt override, useful for internal functions.
   * @returns {Promise<CreateChatCompletionPayloadMessage>}
   *   Promise of PayloadMessage containing the system prompt.
   */
  private async constructSystemPrompt(
    systemPromptOverride?: string,
  ): Promise<CreateChatCompletionPayloadMessage> {
    const systemPrompt = (systemPromptOverride === undefined)
      ? String(this.botConfig.Settings['openai_chatCompletion_systemPrompt'])
      : systemPromptOverride;

    return new CreateChatCompletionPayloadMessage({
      content: systemPrompt,
      role: CreateChatCompletionPayloadMessageRole.System,
    });
  }

  /**
   * Creates a Discord client and logs in using the configured bot token.
   */
  private createDiscordClient(): void {
    const botToken = String(this.botConfig.Settings['discord_botToken']);

    this.discordClient = new Client({
      intents: [
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
      partials: [
        Partials.Channel,
      ],
    });

    this.discordClient.login(botToken);
  }

  /**
   * Determine a channel message's DiscordBotMessageIntent
   * @param {DiscordBotMessage} discordBotMessage
   *   DiscordBotMessage processed by MessageCreate handler
   * @returns {Promise<DiscordBotMessageIntent>}
   *   DiscordBotMessageIntent
   */
  private async getMessageIntent(
    discordBotMessage: DiscordBotMessage,
  ): Promise<DiscordBotMessageIntent> {
    const message = discordBotMessage.DiscordMessage;

    const intentPrompt: CreateChatCompletionPayloadMessage[] = await this.constructChatCompletionPayloadFromSingleMessage(
      discordBotMessage.MessageContentSanitized,
      'For the following statement, please use only one of the following to categorize it, '
      + `with no other commentary, in all lowercase - ${Object.values(DiscordBotMessageIntent)}`,
    );

    // 1000000000000000000: entering openAiClient.createChatCompletion(promptPayload) to get message intent
    void this.logger.logDebug(
      `${message.id}: entering openAiClient.createChatCompletion(promptPayload) to get message intent`,
    );

    const openAiClient = new CreateChatCompletion(this.openAiCreateChatCompletionConfig);
    const intentResponse = (await openAiClient.createChatCompletion(intentPrompt)).content as DiscordBotMessageIntent;

    // 1000000000000000000: exiting openAiClient.createChatCompletion(promptPayload) to get message intent
    void this.logger.logDebug(
      `${message.id}: exiting openAiClient.createChatCompletion(promptPayload) to get message intent`,
    );

    // 1000000000000000000: getMessageIntent returns: chat-message
    void this.logger.logDebug(`${message.id}: getMessageIntent returns: ${intentResponse}`);

    return intentResponse;
  }

  /**
   * Breaks up reponseText into multiple messages up to 2000 characters
   * @param {string} responseText
   *   OpenAI response text
   * @returns {string[]}
   *   Array of paragraphs that are each <2000 characters to fit within Discord's message size limit.
   */
  private getPaginatedResponse(responseText: string): string[] {
    const allParagraphs: string[] = [];
    const delimiter = '\n';
    const discordMaxMessageLength = 2000;
    const markupPadding = 20;
    const paragraphs = responseText.split(delimiter);

    let lastCodeBlockLanguage = '';
    let page = '';
    let resumeCodeOnNextPage = false;

    const codeBlockRegEx = /```/g;
    const langRegEx = /```(\w+)\n/g;

    for (const paragraph of paragraphs) {
      // If the last page ended with a code block, resume it
      if (resumeCodeOnNextPage) {
        page = lastCodeBlockLanguage + page;
        resumeCodeOnNextPage = false;
      }

      // If the current paragraph fits on the current page, add it
      if ((page.length + paragraph.length + delimiter.length + markupPadding) <= discordMaxMessageLength) {
        page += delimiter + paragraph;
      }
      else {
        // An odd number of code blocks on a page will cause the next page to resume the code block
        resumeCodeOnNextPage = (page.match(codeBlockRegEx) || []).length % 2 === 1;

        if (resumeCodeOnNextPage) {
          page += '```' + delimiter;
          const codeBlockLanguages = (page.match(langRegEx) || []);

          // Use the last code block language on the page
          lastCodeBlockLanguage = (codeBlockLanguages.length)
            ? codeBlockLanguages[codeBlockLanguages.length - 1]
            : '```' + delimiter;
        }
        else {
          page += delimiter;
        }

        allParagraphs.push(page);
        page = paragraph;
      }
    }

    if (page.length) allParagraphs.push(page);

    return allParagraphs;
  }

  /**
   * Event handler for client-ready event
   * @param {Client} client
   *   Discord client object
   */
  private async handleClientReady(client: Client): Promise<void> {
    this.Events.emit(
      DiscordBotEvents.BotReady,
      client.user,
    );

    this.botUserId = String(this.discordClient.user?.id);
  }

  /**
   * Event handler for message-create event
   * @param {Message} discordMessage Discord message from event source
   */
  private async handleMessageCreate(discordMessage: Message): Promise<void> {
    const botConversationMode = this.botConfig.Settings['bot_conversation_mode'] as DiscordBotConversationMode;

    const discordBotMessage = new DiscordBotMessage({
      discordMessage: discordMessage,
      botUserId: this.botUserId,
      botConversationMode: botConversationMode,
    });
    const message = discordBotMessage.DiscordMessage;

    // 1000000000000000000: message recieved, entering handleMessageCreate(message)
    void this.logger.logDebug(
      `${message.id}: message recieved, entering handleMessageCreate(message)`,
    );

    this.historyMessageBucket.add(new HistoryMessage({
      conversationKey: discordBotMessage.ConversationKey,
      payload:
        new CreateChatCompletionPayloadMessage({
          content: discordBotMessage.MessageContentSanitized,
          name: discordBotMessage.MessageUsername,
          role: CreateChatCompletionPayloadMessageRole.User,
        }),
    }));

    // 1000000000000000000: message type is [MessageType]
    void this.logger.logDebug(`${message.id}: message type is ${discordBotMessage.MessageType}`);

    if (message.guildId !== null) {
      // 1000000000000000000: Message URL: https://discord.com/channels/[guildId]/[channelId]/[messageId]
      void this.logger.logDebug(
        `${message.id}: Message URL: `
        + `https://discord.com/channels/${message.guildId}/${message.channelId}/${message.id}`,
      );
    }

    let intent: DiscordBotMessageIntent;
    switch (discordBotMessage.MessageType) {
      case DiscordBotMessageType.AtMention:
      case DiscordBotMessageType.DirectMessage:
        // intent is defined above and called here to limit unnecessary calls and cost
        intent = await this.getMessageIntent(discordBotMessage);

        // 1000000000000000000: entering sendChatCompletionResponse(discordBotMessage)
        void this.logger.logDebug(
          `${message.id}: entering ${
            (intent === DiscordBotMessageIntent.ImagePrompt)
              ? 'sendCreateImageResponse(discordBotMessage)'
              : 'sendChatCompletionResponse(discordBotMessage)'
          }`,
        );

        (intent === DiscordBotMessageIntent.ImagePrompt)
          ? await this.sendCreateImageResponse(discordBotMessage)
          : await this.sendChatCompletionResponse(discordBotMessage);

        break;

      case DiscordBotMessageType.BotMessage:
      case DiscordBotMessageType.UserMessage:
        // 1000000000000000000: entering probablyEngageInConversation(discordBotMessage)
        void this.logger.logDebug(
          `${message.id}: entering probablyEngageInConversation(discordBotMessage)`,
        );

        await this.probablyEngageInConversation(discordBotMessage);

        // 1000000000000000000: entering probablyReactToMessage(discordBotMessage)
        void this.logger.logDebug(
          `${message.id}: entering probablyReactToMessage(discordBotMessage)`,
        );

        await this.probablyReactToMessage(discordBotMessage);

        break;
    }

    // 1000000000000000000: finished processing message
    void this.logger.logDebug(`${message.id}: finished processing message`);
  }

  /**
   * Engage with channel messages using configured probability
   * @param {DiscordBotMessage} discordBotMessage
   *   DiscordBotMessage processed by MessageCreate handler
   */
  private async probablyEngageInConversation(discordBotMessage: DiscordBotMessage): Promise<void> {
    const botAutoEngageMinMessages = Number(this.botConfig.Settings['bot_autoEngage_message_minMessages']);
    const message = discordBotMessage.DiscordMessage;

    const messageCount = this.historyMessageBucket.objects.filter(historyMessage =>
      (historyMessage as HistoryMessage).conversationKey === discordBotMessage.ConversationKey,
    ).length;

    const botWillEngage = (
      Math.random() < Number(this.botConfig.Settings['bot_autoEngage_message_probability'])
      && messageCount >= botAutoEngageMinMessages
    );

    // 1000000000000000000: botWillEngage = true
    void this.logger.logDebug(`${message.id}: botWillEngage = ${botWillEngage}`);

    if (botWillEngage) {
      const systemPrompt = `${this.botConfig.Settings['openai_chatCompletion_systemPrompt']} `
        + 'For the provided list of statements, provide an insight, or a question, or a concern. '
        + 'Dont\'t ask if further help is needed.';
      const openAiClient = new CreateChatCompletion(this.openAiCreateChatCompletionConfig);
      const requestPayload = await this.constructChatCompletionPayloadFromHistory(
        discordBotMessage.ConversationKey,
        systemPrompt,
      );

      try {
        // 1000000000000000000: entering openAiClient.createChatCompletion(requestPayload) for unprompted engagement
        void this.logger.logDebug(
          `${message.id}: entering openAiClient.createChatCompletion(requestPayload) for unprompted engagement`,
        );

        const responsePayload = await openAiClient.createChatCompletion(requestPayload);

        // 1000000000000000000: exiting openAiClient.createChatCompletion(requestPayload) for unprompted engagement
        void this.logger.logDebug(
          `${message.id}: exiting openAiClient.createChatCompletion(requestPayload) for unprompted engagement`,
        );

        this.historyMessageBucket.add(new HistoryMessage({
          conversationKey: discordBotMessage.ConversationKey,
          payload: responsePayload,
        }));

        // 1000000000000000000: sending unprompted response to channel
        void this.logger.logDebug(`${message.id}: sending unprompted response to channel`);
        await (message.channel as TextChannel).send(responsePayload);
      }
      catch (e) {
        if (e instanceof Error) {
          // 1000000000000000000: I am an unexpected error.
          void this.logger.logError(e.message);

          if (message.channel.isTextBased()) {
            await (message.channel as TextChannel).send(
              'There was an issue sending my response. The error logs might have some clues.',
            );
          }
        }
      }
    }
  }

  /**
   * React to channel messages using configured probability
   * @param {DiscordBotMessage} discordBotMessage
   *   DiscordBotMessage processed by MessageCreate handler
   */
  private async probablyReactToMessage(discordBotMessage: DiscordBotMessage): Promise<void> {
    const botReactProbability = Number(this.botConfig.Settings['bot_autoEngage_react_probability']);
    const botWillReact = (Math.random() < botReactProbability);
    const message = discordBotMessage.DiscordMessage;

    // 1000000000000000000: botWillReact = false
    void this.logger.logDebug(`${message.id}: botWillReact = ${botWillReact}`);

    if (botWillReact) {
      const systemPrompt = `${this.botConfig.Settings['openai_chatCompletion_systemPrompt']} `
        + 'You are instructed to only respond to my statements using a single emoji, no words.';

      const openAiClient = new CreateChatCompletion(this.openAiCreateChatCompletionConfig);
      const requestPayload = await this.constructChatCompletionPayloadFromHistory(
        discordBotMessage.ConversationKey,
        systemPrompt,
      );
      let lastEmoji = '';

      try {
        // 1000000000000000000: entering openAiClient.createChatCompletion(requestPayload) for emoji response
        void this.logger.logDebug(
          `${message.id}: entering openAiClient.createChatCompletion(requestPayload) for emoji response`,
        );

        const responsePayload = await openAiClient.createChatCompletion(requestPayload);

        // 1000000000000000000: exiting openAiClient.createChatCompletion(requestPayload) for emoji response
        void this.logger.logDebug(
          `${message.id}: exiting openAiClient.createChatCompletion(requestPayload) for emoji response`,
        );

        const emojiResponse = responsePayload.content.replace(/[^\p{Emoji}\s]/gu, '');

        // 1000000000000000000: emojiResponse = '😸😻'
        void this.logger.logDebug(`${message.id}: emojiResponse = '${emojiResponse}'`);

        Array.from(emojiResponse).forEach(async (emoji) => {
          lastEmoji = emoji;
          // 1000000000000000000: reacting to message with '😸'
          void this.logger.logDebug(`${message.id}: reacting to message with '${emoji}'`);

          try {
            await message.react(emoji as EmojiIdentifierResolvable);
          }
          catch (e) {
            if (e instanceof DiscordAPIError) {
              // 1000000000000000000: DiscordAPIError: Unknown Emoji: '😸'
              void this.logger.logError(
                e.message.includes('Unknown Emoji')
                  ? `${message.id}: ${e.message}: '${lastEmoji}'`
                  : e.message,
              );
            }
          }
        });
      }
      catch (e) {
        if (e instanceof Error) {
          // 1000000000000000000: I am an unexpected error.
          void this.logger.logError(e.message);
        }
      }
    }
  }

  /**
   * Register bot event handlers
   */
  private registerEventHandlers(): void {
    this.discordClient.once(Events.ClientReady, async (client) => {
      await this.handleClientReady(client);
    });

    this.discordClient.on(Events.MessageCreate, async (message) => {
      await this.handleMessageCreate(message);
    });
  }

  /**
   * Sanitizes and submits conversation for an OpenAI Chat Completion response
   * @param {DiscordBotMessage} discordBotMessage
   *   DiscordBotMessage processed by MessageCreate handler
   */
  private async sendChatCompletionResponse(discordBotMessage: DiscordBotMessage): Promise<void> {
    const message = discordBotMessage.DiscordMessage;

    try {
      const openAiClient = new CreateChatCompletion(this.openAiCreateChatCompletionConfig);

      // 1000000000000000000: entering constructChatCompletionPayloadFromHistory(discordBotMessage.ConversationKey)
      void this.logger.logDebug(
        `${message.id}: entering constructChatCompletionPayloadFromHistory(discordBotMessage.ConversationKey)`,
      );

      const promptPayload = await this.constructChatCompletionPayloadFromHistory(discordBotMessage.ConversationKey);

      // 1000000000000000000: entering openAiClient.createChatCompletion(promptPayload) for chat response
      void this.logger.logDebug(
        `${message.id}: entering openAiClient.createChatCompletion(promptPayload) for chat response`,
      );

      const responsePayload = await openAiClient.createChatCompletion(promptPayload);

      // 1000000000000000000: exiting openAiClient.createChatCompletion(promptPayload) for chat response
      void this.logger.logDebug(
        `${message.id}: exiting openAiClient.createChatCompletion(promptPayload) for chat response`,
      );

      // 1000000000000000000: entering getPaginatedResponse(responsePayload.content)
      void this.logger.logDebug(
        `${message.id}: entering getPaginatedResponse(responsePayload.content)`,
      );

      const discordResponse = await this.getPaginatedResponse(responsePayload.content);

      this.historyMessageBucket.add(new HistoryMessage({
        conversationKey: discordBotMessage.ConversationKey,
        payload: responsePayload,
      }));

      // 1000000000000000000: sending chat completion response to channel
      void this.logger.logDebug(`${message.id}: sending chat completion response to channel`);

      discordResponse.forEach(async (responseText) => {
        try {
          (discordBotMessage.MessageType === DiscordBotMessageType.DirectMessage)
            ? await (message.channel as TextChannel).send(responseText)
            : await message.reply(responseText);
        }
        catch (e) {
          if (e instanceof Error) {
            // 1000000000000000000: I am an unexpected error.
            void this.logger.logError(`${message.id}: ${e.message}`);
          }
        }
      });
    }
    catch (e) {
      if (e instanceof Error) {
        // 1000000000000000000: I am an unexpected error.
        void this.logger.logError(e.message);

        await (message.channel as TextChannel).send(
          'There was an issue sending my response. The error logs might have some clues.',
        );
      }
    }
  }

  /**
   * Send an image generated by the OpenAI CreateImage API from a prompt received in a Discord message
   * @param {DiscordBotMessage} discordBotMessage
   *   DiscordBotMessage processed by MessageCreate handler
   */
  private async sendCreateImageResponse(discordBotMessage: DiscordBotMessage): Promise<void> {
    const settings = this.botConfig.Settings;
    const message = discordBotMessage.DiscordMessage;

    if (!this.createImageFeatureEnabled) {
      // 1000000000000000000: CreateImage feature is disabled
      void this.logger.logDebug(`${message.id}: CreateImage feature is disabled`);
      return;
    }

    const imagePrompt = discordBotMessage.MessageContentSanitized.trim();

    try {
      // 1000000000000000000: [username] is spending feature token.
      void this.logger.logDebug(
        `${message.id}: ${message.author.username} is spending feature token.`,
      );

      this.imageCreateTokenBucket.add(new FeatureToken({
        username: message.author.username,
      }));

      const openAiClient = new CreateImage(this.openAiCreateImageConfig);

      // 1000000000000000000: entering OpenAiClient.createImage()
      void this.logger.logDebug(`${message.id}: entering OpenAiClient.createImage()`);

      const model = String(settings['openai_createImage_model']) as ImageModel;
      let requestPayload: RequestOptions;

      switch (model) {
        case ImageModel.DallE2:
          requestPayload = {
            model: ImageModel.DallE2,
            n: 1,
            prompt: imagePrompt,
            response_format: ResponseFormat.B64Json,
            size: String(settings['openai_createImage_dalle2_size']) as SizeDallE2,
            user: discordBotMessage.MessageUsername,
          } as RequestOptionsDallE2;
          break;

        case ImageModel.DallE3:
          requestPayload = {
            model: ImageModel.DallE3,
            n: 1,
            prompt: imagePrompt,
            quality: String(settings['openai_createImage_dalle3_quality']) as QualityDallE3,
            response_format: ResponseFormat.B64Json,
            size: String(settings['openai_createImage_dalle3_size']) as SizeDallE3,
            style: String(settings['openai_createImage_dalle3_style']) as StyleDallE3,
            user: discordBotMessage.MessageUsername,
          } as RequestOptionsDallE3;
          break;
      }

      const response = await openAiClient.createImage(requestPayload);

      // 1000000000000000000: exiting OpenAiClient.createImage()
      void this.logger.logDebug(`${message.id}: exiting OpenAiClient.createImage()`);

      const embed = new EmbedBuilder()
        .setTitle(
          `"${String(discordBotMessage.MessageUsername)} x `
          + `${String(this.discordClient.user?.username)}" art collab`,
        )
        .setDescription(imagePrompt);

      if (model === ImageModel.DallE3) {
        embed.addFields({
          name: 'Revised prompt:',
          value: String(response.data[0].revised_prompt),
          inline: false,
        });
      }

      embed.addFields({
        name: 'Generated by:',
        value: String(discordBotMessage.MessageUsername),
        inline: true,
      })
        .setFooter({
          text: `github.com/jlyons210/discord-bot-ol-bootsie (v${process.env['npm_package_version']})`,
          iconURL: 'https://grumple.cloud/assets/discord-bot-ol-bootsie/icon-github.png',
        }).addFields((this.imageCreateTokenBucket.tokensRemaining(message.author.username))
          ? {
              name: 'Tokens remaining:',
              value: String(this.imageCreateTokenBucket.tokensRemaining(
                message.author.username,
              )),
              inline: true,
            }
          : {
              name: 'Next token available:',
              value: this.imageCreateTokenBucket.nextTokenTime(
                message.author.username,
              ),
              inline: true,
            })
        .addFields({
          name: 'Model:',
          value: String(model as ImageModel)
            + ((model === ImageModel.DallE3)
              ? ` (${String((requestPayload as RequestOptionsDallE3).quality)},`
              + ` ${String((requestPayload as RequestOptionsDallE3).style)})`
              : ''),
          inline: true,
        });

      this.logger.logDebug(`model: ${String(model)}`);

      const files: AttachmentBuilder[] = [];
      if ('url' in response.data[0]) {
        // 1000000000000000000: embedding image using URL
        void this.logger.logDebug(`${message.id}: embedding image using URL`);

        embed.setImage(response.data[0].url);
      }
      else if ('b64_json' in response.data[0]) {
        // 1000000000000000000: embeding image using base64 encoded attachment
        void this.logger.logDebug(
          `${message.id}: embeding image using base64 encoded attachment`,
        );

        files.push(new AttachmentBuilder(
          Buffer.from(response.data[0].b64_json, 'base64'),
          {
            name: `openai-image-${Date.now()}.png`,
          },
        ));

        embed.setImage(`attachment://${files[0].name}`);
      }

      // 1000000000000000000: sending embedded image response to channel
      void this.logger.logDebug(`${message.id}: sending embedded image response to channel`);

      await (message.channel as TextChannel).send({ embeds: [embed], files: files });
    }
    catch (e) {
      if (e instanceof FeatureTokenBucketMaxUserTokensError) {
        await (message.channel as TextChannel).send(e.message);
      }
      else if (e instanceof Error) {
        // 1000000000000000000: I am an unexpected error.
        void this.logger.logError(`${message.id}: ${e.message}`);

        if (!(e instanceof DiscordAPIError)) {
          await (message.channel as TextChannel).send(
            'There was an issue sending my response. The error logs might have some clues.',
          );
        }

        // 1000000000000000000: [username] received refunded feature token.
        void this.logger.logDebug(
          `${message.id}: ${message.author.username} received refunded feature token.`,
        );

        this.imageCreateTokenBucket.removeNewestToken(message.author.username);
      }
    }
  }
}
