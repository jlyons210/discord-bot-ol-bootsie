import { AxiosError } from 'axios';
import { Configuration, OpenAIApi } from 'openai';
import { inspect } from 'util';
import { Logger, LogLevel } from '../Logger';
import {
  OpenAIBadRequestError,
  OpenAIConfig,
  OpenAIRetriesExceededError,
  OpenAIUnexpectedError,
  PayloadMessage,
  PayloadMessageRole,
} from './index';

/**
 * A class interface for the OpenAI API
 */
export class OpenAI {

  private _client: OpenAIApi;
  private _maxRetries: number;
  private _maxTokens: number;
  private _model: string;
  private _temperature: number;

  /**
   * Creates an instance of the OpenAI class with required configuration to use the OpenAI API.
   * @param config A populated OpenAIConfig
   */
  public constructor(config: OpenAIConfig) {
    this._client = new OpenAIApi(new Configuration({ apiKey: config.apiKey }));
    this._maxRetries = config.maxRetries;
    this._maxTokens = config.paramMaxTokens;
    this._model = config.paramModel;
    this._temperature = config.paramTemperature;
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