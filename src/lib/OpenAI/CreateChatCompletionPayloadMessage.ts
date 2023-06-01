import {
  CreateChatCompletionPayloadMessageRole,
  ICreateChatCompletionPayloadMessage,
  Utilities,
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
  constructor(payload: ICreateChatCompletionPayloadMessage) {
    this.content = payload.content;
    this.name = Utilities.sanitizeName(payload.name);
    this.role = payload.role;
  }

}