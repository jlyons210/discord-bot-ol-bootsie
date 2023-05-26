import { ChannelType, Client, Events, GatewayIntentBits, Message, Partials } from 'discord.js';
import { EventEmitter } from 'events';
import { HistoryMessage } from '../DiscordBot/HistoryMessage';
import { OpenAI } from '../OpenAI';
import { LogLevel, Logger } from '../Logger';
import { inspect } from 'util';

export class DiscordBot {
  public Events = new EventEmitter();
  private _discordClient: Client;
  private _messageHistory: HistoryMessage[] = [];
  private _discordMaxMessageLength = 2000;

  constructor(apiKey: string) {
    this._discordClient = this._authenticateClient(apiKey);

    this._discordClient.once(Events.ClientReady, async () => {
      await this._handleClientReady();
    });

    this._discordClient.on(Events.MessageCreate, async message => {
      await this._handleMessageCreate(message);
    });
  }

  get User() {
    return this._discordClient.user;
  }

  private _authenticateClient(apiKey: string): Client {
    const client = new Client({
      intents: [
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
      partials: [ Partials.Channel ],
    });

    client.login(apiKey);
    return client;
  }

  private async _botIsMentionedInMessage(discordMessage: Message): Promise<boolean> {
    let isMentioned = false;

    discordMessage.mentions.users.forEach(async mention => {
      if (mention.id == this._discordClient.user?.id) isMentioned = true;
    });

    return isMentioned;
  }

  private async _getMessageText(message: Message) {
    let messageText = message.content;

    message.mentions.users.forEach(async mention => {
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
   *
   * @param {Message} message - Discord Message object
   * @returns {Promise<string>} A Promise that resolves to a colon-delimited string representing the
   *   Discord guild, channel, and (optionally) the user that the message was sent from.
   */
  private async _getThreadSignature(message: Message): Promise<string> {
    switch (process.env.BOT_THREAD_MODE?.toLowerCase()) {
      case 'channel':
        return `${message.guildId}:${message.channelId}`;

      case 'user':
        return `${message.guildId}:${message.channelId}:${message.author.id}`;

      default:
        throw new Error('Setting a message thread signature failed because `process.env.BOT_THREAD_MODE` is not set.');
    }
  }

  private async _handleClientReady(): Promise<void> {
    this.Events.emit(Events.ClientReady);
  }

  private async _handleMessageCreate(message: Message): Promise<void> {
    // Need to descern between DM, GroupDM, and Channel messages (- message.channel.type: ChannelType)
    // The source code coming over it a soupy mess, and will be broken down more cleanly in this rewrite.
    // Need to re-define the message history class/structure so that it is the source of truth for
    // Discord messages as well as for building OpenAI prompts.

    // Bot engagement conditions
    // Consider rewriting this group of settings, since they're mutually exclusive, to call a function and
    // return a type, e.g. Message.BotMention, Message.BotMessage, Message.DM, etc.
    const isBotAtMention = await this._botIsMentionedInMessage(message);
    const isBotMessage = (message.author.id == this._discordClient.user?.id);
    const isDirectMessageToBot = (message.channel.type == ChannelType.DM && !isBotMessage);

    // Assign thread signature {guild}:{channel}[:{user}]
    const threadSignature = await this._getThreadSignature(message);

    // Get processed message text from discordMessage object
    const messageText = await this._getMessageText(message);

    // If bot is @-mentioned, or is engaged via direct message, engage and respond directly
    if (isBotAtMention || isDirectMessageToBot) {
      this._messageHistory.push(
        new HistoryMessage(
          threadSignature,
          messageText,
          true,
          message.author.username,
          'user',
        )
      );

      // Construct prompt payload and get chat response
      const payload = await OpenAI.constructPromptPayload(this._messageHistory, threadSignature);
      const openAiResponseText = await OpenAI.requestChatCompletion(payload);

      // Add response to chat history
      this._messageHistory.push(
        new HistoryMessage(
          threadSignature,
          openAiResponseText,
          true,
          process.env.OPENAI_PARAM_MODEL || '',
          'assistant',
        ),
      );

      // Paginate response
      const discordResponse = await this._paginateResponse(openAiResponseText);

      // Respond to channel
      discordResponse.forEach(async responseText => {
        try {
          if (isDirectMessageToBot) {
            await message.channel.send(responseText);
          }
          else {
            await message.reply(responseText);
          }
        }
        catch (error) {
          await Logger.log(inspect(error, false, null, true), LogLevel.Error);
          await message.channel.send('There was an issue sending my response. The error logs might have some clues.');
        }
      });
    }
    else {
      // Add channel text to chat history
      this._messageHistory.push(
        new HistoryMessage(
          threadSignature,
          messageText,
          false,
          message.author.username,
          'user',
        ),
      );

      // React to messages with configured probability
      if (!isBotMessage) {
        await this._probablyReactToMessage(message, messageText);

        // Engage in conversation with configured probability
        if (!isDirectMessageToBot) {
          await this._probablyEngageInConversation(message, threadSignature);
        }
      }
    }
  }

  /**
   * Breaks up reponseText into multiple messages up to 2000 characters
   *
   * @param {string} responseText OpenAI response text
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

  // Engage with channel messages using configured probability
  private async _probablyEngageInConversation(discordMessage: Message, threadSignature: string) {

    // Roll the RNG
    const botWillEngage = (Math.random() < parseFloat(process.env.BOT_AUTO_ENGAGE_PROBABILITY || ''));

    if (botWillEngage) {

      // Build a list of non-bot chat messages that haven't been used in a prompt context
      let prompt = '', messageCount = 0;

      this._messageHistory.forEach(async message => {
        if (
          message.threadSignature == threadSignature &&
          message.username != this._discordClient.user?.username &&
          !message.isPromptContext &&
          message.ttl > 0
        ) {
          prompt += message.messageText + '\n';
          messageCount++;
        }
      });

      // There should be a minimum number of messages for a meaningful engagement
      if (messageCount >= parseFloat(process.env.BOT_AUTO_ENGAGE_MIN_MESSAGES || '')) {

        // Build a one-off prompt payload
        const systemPrompt =
          process.env.OPENAI_PARAM_SYSTEM_PROMPT +
          'For the provided list of statements, provide an insight, or a question, or a concern. ' +
          'Dont\'t ask if further help is needed.';
        const payload = await OpenAI.constructOneOffPayload(prompt, systemPrompt);
        const response = await OpenAI.requestChatCompletion(payload);

        // Send message to chat
        discordMessage.channel.send(response);

      }

    }

  }

  // React to channel messages using configured probability
  private async _probablyReactToMessage(discordMessage: Message, messageText: string) {

    // Roll the RNG
    const botWillReact = (Math.random() < parseInt(process.env.BOT_AUTO_REACT_PROBABILITY || ''));

    if (botWillReact) {

      // Build a one-off prompt payload
      const emojiPayload =
        await OpenAI.constructOneOffPayload(
          process.env.OPENAI_PARAM_SYSTEM_PROMPT +
          `Respond using nothing but two emojis to the following statement: \`${messageText}\``,
        );
      let emojiResponse: string = await OpenAI.requestChatCompletion(emojiPayload);

      // Remove non-emoji characters from response
      emojiResponse = emojiResponse.replace(/[^\p{Emoji}\s]/gu, '');

      // React to chat message
      Array.from(emojiResponse).forEach(async emoji => {
        try {
          await discordMessage.react(emoji);
        }
        catch (error) {
          if (typeof error === 'string') {
            await Logger.log(error, LogLevel.Error);
          }
        }
      });

    }

    // Moved from OpenAI module
    // Construct a prompt payload using an overridable system prompt and single message
    public async constructOneOffPayload(messageText: string) {
      const payload: PromptMessage[] = [];
      payload.push(await this.constructSystemPrompt());

      payload.push({
        role: PromptMessageRole.user,
        name: path.basename(__filename, '.js'),
        content: messageText,
      });

      return payload;
    }

    // Moved from OpenAI module
    // Construct a prompt payload using the configured system prompt and message history
    async constructPromptPayload(messageHistory: HistoryMessage[], threadSignature: string, systemPromptOverride?: string) {
      const payload: PromptMessage[] = [];
      payload.push(await this.constructSystemPrompt(systemPromptOverride));

      messageHistory.forEach(async message => {
        if (message.threadSignature == threadSignature && message.isPromptContext) {
          payload.push({
            role: message.role,
            content: message.messageText,
            // If name != undefined in a [role: 'assistant'] payload, OpenAI API returns a 400 error
            name: (message.role == 'assistant') ? undefined : message.username,
          });
        }
      });

      return payload;
    }

    // Moved from OpenAI module
    // Returns a system prompt using the configured or overridden system prompt
    async constructSystemPrompt(systemPromptOverride?: string): Promise<PromptMessage> {
      const systemPrompt: string = (systemPromptOverride === undefined) ?
        process.env.OPENAI_PARAM_SYSTEM_PROMPT || '' :
        systemPromptOverride;

      const payload: PromptMessage = {
        role: PromptMessageRole.system,
        content: systemPrompt,
      };

      return payload;
    }

    // Moved from OpenAI module
    // Generate a retry message to handle unknown issue
    async generateTryAgainMessage() {
      const prompt = 'In one short sentence, tell me that you don\'t understand what I meant by what I said.';
      const payload = await this.constructOneOffPayload(prompt);
      const responseText = await this.requestChatCompletion(payload);

      return responseText;
    }

  }
}