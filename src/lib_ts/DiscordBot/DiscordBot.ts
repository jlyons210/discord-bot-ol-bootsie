import { ChannelType, Client, Events, GatewayIntentBits, Message, Partials } from 'discord.js';
import { EventEmitter } from 'events';

export class DiscordBot {
  public Events = new EventEmitter();
  private _discordClient: Client;

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

      // Add prompt to chat history
      messageHistory.push(
        new libDiscord.HistoryMessage(threadSignature, messageText, true, message.author.username, 'user'),
      );

      // Construct prompt payload and get chat response
      const payload = await libOpenAi.constructPromptPayload(messageHistory, threadSignature);
      const openAiResponseText = await libOpenAi.requestChatCompletion(payload);

      // Add response to chat history
      messageHistory.push(
        new libDiscord.HistoryMessage(
          threadSignature,
          openAiResponseText,
          true,
          process.env.OPENAI_PARAM_MODEL,
          'assistant',
        ),
      );

      // Paginate response
      const discordResponse = await libDiscord.paginateResponse(openAiResponseText);

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
          log(inspect(error, false, null, true), 'error');
          await message.channel.send('There was an issue sending my response. The error logs might have some clues.');
        }
      });

    }
    else {

      // Add channel text to chat history
      messageHistory.push(
        new libDiscord.HistoryMessage(
          threadSignature,
          messageText,
          false,
          message.author.username,
          'user',
        ),
      );

      // React to messages with configured probability
      if (!isBotMessage) {
        await probablyReactToMessage(message, messageText);

        // Engage in conversation with configured probability
        if (!isDirectMessageToBot) {
          await probablyEngageInConversation(message, threadSignature);
        }
      }

    }
  }
}