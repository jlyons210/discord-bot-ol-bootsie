import {
  CreateChatCompletionConfiguration,
  CreateChatCompletionPayloadMessage,
  CreateChatCompletionPayloadMessageRole,
} from '../index';

import { OpenAI } from 'openai';

/**
 * A class for interfacing with the OpenAI createChatCompletion API
 */
export class CreateChatCompletion {
  private config: CreateChatCompletionConfiguration;
  private client: OpenAI;

  /**
   * Creates an instance of the OpenAI class with required configuration to use the OpenAI API.
   * @param config A populated OpenAIConfig
   */
  public constructor(config: CreateChatCompletionConfiguration) {
    this.config = config;
    this.client = new OpenAI({
      apiKey:     config.apiKey,
      maxRetries: config.maxRetries,
    });
  }

  /**
   * Creates a model response for the given chat conversation.
   *   (https://platform.openai.com/docs/api-reference/chat/create)
   * @param payload A list of PayloadMessage describing the conversation so far. These should be
   *   cumulative from the system prompt to the starting user prompt, interleaved with all
   *   assistant responses in order to maintain conversation flow.
   * @returns Returns an assistant response
   */
  public async createChatCompletion(
    payload: CreateChatCompletionPayloadMessage[],
  ): Promise<CreateChatCompletionPayloadMessage> {

    const response = await this.client.chat.completions.create({
      max_tokens:  this.config.paramMaxTokens,
      model:       this.config.paramModel,
      messages:    payload,
      temperature: this.config.paramTemperature,
    });

    const responseMessage = response.choices[0].message;

    return new CreateChatCompletionPayloadMessage({
      content: String(responseMessage.content),
      role:    CreateChatCompletionPayloadMessageRole.Assistant,
    });

  }
}
