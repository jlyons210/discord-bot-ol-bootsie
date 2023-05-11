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
  }
}