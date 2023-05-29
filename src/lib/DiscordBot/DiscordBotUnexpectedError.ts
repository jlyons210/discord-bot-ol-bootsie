/**
 * To be thrown for unexpected errors in the DiscordBot module.
 */
export class DiscordBotUnexpectedError extends Error {
  /**
   * Constructs an DiscordBotUnexpectedError
   * @param message Error message
   */
  constructor(message: string) {
    super(message);
    this.name = 'DiscordBotUnexpectedError';
  }
}