import { AxiosError } from 'axios';
import { Configuration, OpenAIApi } from 'openai';
import { inspect } from 'util';
import { Logger, LogLevel } from '../Logger';
import {
  OpenAIBadRequestError,
  OpenAIRetriesExceededError,
  OpenAIUnexpectedError,
  PayloadMessage,
  PayloadMessageRole,
} from './index';

/**
 * A class interface for the OpenAI API
 * @class
 */
export class OpenAI {

  /**
   * Creates an instance of the OpenAI class with required configuration to use the OpenAI API.
   * @param {string} apiKey The OpenAI paid membership API key that will be used to perform calls.
   * @param model The OpenAI model to be used for calls (https://platform.openai.com/docs/models).
   * @param maxTokens The maximum number of tokens allowed for prompts and responses
   *   (https://platform.openai.com/docs/guides/chat/managing-tokens).
   * @param temperature What sampling temperature to use, between 0 and 2. Higher values like 0.8
   *   will make the output more random, while lower values like 0.2 will make it more focused and
   *   deterministic. (https://platform.openai.com/docs/api-reference/chat/create#chat/create-temperature)
   * @param maxRetries Maximum number of API call attempts, in case of throttling or server errors.
   */
  public constructor(
    apiKey: string,
    model: string,
    maxTokens: number,
    temperature: number,
    maxRetries: number,
  ) {
    this._apiKey = apiKey;
    this._model = model;
    this._maxRetries = maxRetries;
    this._maxTokens = maxTokens;
    this._temperature = temperature;
    this._client = new OpenAIApi(new Configuration({ apiKey: this._apiKey }));
  }

  private _client: OpenAIApi;

  private _maxRetries: number;
  get maxRetries() {
    return this._maxRetries;
  }
  set maxRetries(maxRetries: number) {
    this._maxRetries = maxRetries;
  }

  private _maxTokens: number;
  get maxTokens() {
    return this._maxTokens;
  }
  set maxTokens(maxTokens: number) {
    this._maxTokens = maxTokens;
  }

  private _model: string;
  get model() {
    return this._model;
  }
  set model(model: string) {
    this._model = model;
  }

  private _temperature: number;
  get temperature() {
    return this._temperature;
  }
  set temperature(temperature: number) {
    this._temperature = temperature;
  }

  private _apiKey: string;
  set apiKey(apiKey: string) {
    this._apiKey = apiKey;
  }

  /**
   * Creates a model response for the given chat conversation.
   *   (https://platform.openai.com/docs/api-reference/chat/create)
   * @param payload A list of PayloadMessage describing the conversation so far. These should be
   *   cumulative from the system prompt to the starting user prompt, interleaved with all
   *   assistant responses in order to maintain conversation flow.
   * @returns Returns an assistant response
   */
  public async requestChatCompletion(payload: PayloadMessage[]): Promise<PayloadMessage> {
    let response;
    let retriesLeft: number = this._maxRetries;

    while (retriesLeft--) {
      try {
        response = await this._client.createChatCompletion({
          max_tokens: this._maxTokens,
          model: this._model,
          messages: payload,
          temperature: this._temperature,
        });

        const responseMessage = response.data.choices[0].message;
        if (responseMessage !== undefined) {
          return {
            role: PayloadMessageRole.assistant,
            content: responseMessage.content,
          };
        }
        else {
          throw new OpenAIUnexpectedError('There was an error obtaining this chat completion.');
        }
      }
      catch (e) {
        if (e instanceof AxiosError && e.response !== undefined) {
          const apiStatus = e.response.status;
          const apiStatusText = e.response.statusText;

          if (apiStatus == 429 || apiStatus >= 500) {
            // TODO: Implement proper XBR logic
            setTimeout(async () => {
              await Logger.log(`An HTTP ${apiStatus} (${apiStatusText}) was returned. Retrying ${retriesLeft} time(s).`, LogLevel.Error);
            }, 1000);
          }
          else {
            retriesLeft = 0;
            await Logger.log(`An HTTP ${apiStatus} (${apiStatusText}) was returned. This indicates a bad request. Not retrying.`, LogLevel.Error);
            throw new OpenAIBadRequestError(inspect(e.response.data, false, null, true));
          }
        }
        else if (e instanceof Error) {
          await Logger.log(`An unknown error occurred:\n${e.message}`, LogLevel.Error);
        }
      }
    }

    throw new OpenAIRetriesExceededError('Maximum OpenAI retries exceeded. Aborting.');
  }

}