import {
  CreateChatCompletionPayloadMessageRole,
  IChatCompletionPayloadMessage,
} from './index';

/**
 * Controls message adherence to the OpenAI payload specification.
 */
export class CreateChatCompletionPayloadMessage {

  public content: string;
  public name?: string;
  public role: CreateChatCompletionPayloadMessageRole;

  /**
   * Construcs a PayloadMessage object
   * @param payload PayloadMessage
   */
  constructor(payload: IChatCompletionPayloadMessage) {
    this.content = payload.content;
    this.name = this._sanitizeName(payload.name);
    this.role = payload.role;
  }

  /**
   * Sanitizes Discord usernames to fit OpenAI's name field requirements
   * @param name Unchecked username
   * @returns Sanitized username
   */
  private _sanitizeName(name: string | undefined): string | undefined {
    if (name) {
      const expOpenAiAllowed = /^[a-zA-Z0-9_-]{1,64}$/;
      const expReplace = /[^a-zA-Z0-9_-]/g;
      const sanitized = name.replace(expReplace, '_');
      return (expOpenAiAllowed.test(sanitized)) ? sanitized : undefined;
    }
    else {
      return name;
    }
  }

}