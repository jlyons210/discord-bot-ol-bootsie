import { ChannelType, Client, Events, GatewayIntentBits, Message, Partials } from 'discord.js';
import { EventEmitter } from 'events';

export class DiscordBot {
  public Events = new EventEmitter();
  private _discordClient: Client;

  constructor(apiKey: string) {
    this._discordClient = this._authenticateClient(apiKey);

    this._discordClient.once(Events.ClientReady, async client => {
      await this._handleClientReady(client);
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

  private async _handleClientReady(client: Client): Promise<void> {
    this.Events.emit(Events.ClientReady);
  }

  private async _handleMessageCreate(message: Message) {
    // Need to descern between DM, GroupDM, and Channel messages (- message.channel.type: ChannelType)
    // The source code coming over it a soupy mess, and will be broken down more cleanly in this rewrite.
    // Need to re-define the message history class/structure so that it is the source of truth for 
    // Discord messages as well as for building OpenAI prompts.

    // Read after write consistency:
    // - Message should be logged to history before it is processed.
    // - MessageHistory class:
    // class MessageHistory2 {
    //   ContextKey: string = '';
    //   Message: {
    //     role: string,
    //     message: string,
    //     name: string
    //   }
    //   ...
    // }


    // Bot engagement conditions
    // Consider rewriting this group of settings, since they're mutually exclusive, to call a function and
    // return a type, e.g. Message.BotMention, Message.BotMessage, Message.DM, etc.
    const isBotAtMention = await botIsMentionedInMessage(discordMessage, this.discordClient.user.id);
    const isBotMessage = (discordMessage.author.id == this.discordClient.user.id);
    const isDirectMessageToBot = (discordMessage.channel.type == ChannelType.DM && !isBotMessage);

    // Assign thread signature {guild}:{channel}[:{user}]
    const threadSignature = await libDiscord.getThreadSignature(discordMessage);

    // Get processed message text from discordMessage object
    const messageText = await libDiscord.getMessageText(discordMessage);

    // If bot is @-mentioned, or is engaged via direct message, engage and respond directly
    if (isBotAtMention || isDirectMessageToBot) {

      // Add prompt to chat history
      messageHistory.push(
        new libDiscord.HistoryMessage(threadSignature, messageText, true, discordMessage.author.username, 'user'),
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
            await discordMessage.channel.send(responseText);
          }
          else {
            await discordMessage.reply(responseText);
          }
        }
        catch (error) {
          log(inspect(error, false, null, true), 'error');
          await discordMessage.channel.send('There was an issue sending my response. The error logs might have some clues.');
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
          discordMessage.author.username,
          'user',
        ),
      );

      // React to messages with configured probability
      if (!isBotMessage) {
        await probablyReactToMessage(discordMessage, messageText);

        // Engage in conversation with configured probability
        if (!isDirectMessageToBot) {
          await probablyEngageInConversation(discordMessage, threadSignature);
        }
      }

    }
  }
}