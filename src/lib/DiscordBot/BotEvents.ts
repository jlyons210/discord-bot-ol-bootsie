import { Events } from 'discord.js';

/**
 * A collection of BotEvents that are emitted for handling outside of the class.
 */
export enum BotEvents {
  BotReady = Events.ClientReady,
}