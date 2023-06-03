import {
  Configuration,
  OpenAIApi,
} from 'openai';
import {
  CreateChatCompletionConfiguration,
  CreateChatCompletionPayloadMessage,
  CreateChatCompletionPayloadMessageRole,
  OpenAIBadRequestError,
  OpenAIRetriesExceededError,
  OpenAIUnexpectedError,
} from './index';
import {
  LogLevel,
  Logger,
} from '../Logger';
import { AxiosError } from 'axios';
import { inspect } from 'util';

/**
 * A class for interfacing with the OpenAI createChatCompletion API
 */
export class CreateChatCompletion {

  private _config: CreateChatCompletionConfiguration;
  private _client: OpenAIApi;

  /**
   * Creates an instance of the OpenAI class with required configuration to use the OpenAI API.
   * @param config A populated OpenAIConfig
   */
  public constructor(config: CreateChatCompletionConfiguration) {
    this._config = config;
    this._client = new OpenAIApi(new Configuration({ apiKey: config.apiKey }));
  }

  /**
   * Creates a model response for the given chat conversation.
   *   (https://platform.openai.com/docs/api-reference/chat/create)
   * @param payload A list of PayloadMessage describing the conversation so far. These should be
   *   cumulative from the system prompt to the starting user prompt, interleaved with all
   *   assistant responses in order to maintain conversation flow.
   * @returns Returns an assistant response
   * @throws {OpenAIBadRequestError} Thrown if the OpenAI API returns a non-retriable 4XX error
   * @throws {OpenAIUnexpectedError} Thrown if for non-API errors
   * @throws {OpenAIRetriesExceededError} Thrown if all retries are exhausted without a response
   */
  public async createChatCompletion(payload: CreateChatCompletionPayloadMessage[]): Promise<CreateChatCompletionPayloadMessage> {
    let retriesLeft: number = this._config.maxRetries;
    while (retriesLeft--) {
      try {
        const response = await this._client.createChatCompletion({
          max_tokens: this._config.paramMaxTokens,
          model: this._config.paramModel,
          messages: payload,
          temperature: this._config.paramTemperature,
        });

        const responseMessage = response.data.choices[0].message;
        if (responseMessage !== undefined) {
          return new CreateChatCompletionPayloadMessage({
            content: responseMessage.content,
            role: CreateChatCompletionPayloadMessageRole.Assistant,
          });
        }
        else {
          throw new OpenAIUnexpectedError('There was an error obtaining this chat completion.');
        }
      }
      catch (e) {
        if ((e as AxiosError).isAxiosError) {
          const axiosError = e as AxiosError;
          const apiStatus = axiosError.response?.status;
          const apiStatusText = axiosError.response?.statusText;

          if (apiStatus && (apiStatus === 429 || apiStatus >= 500)) {
            // TODO: Implement proper XBR logic
            setTimeout(async () => {
              void Logger.log({
                message: `An HTTP ${apiStatus} (${apiStatusText}) was returned. Retrying ${retriesLeft} time(s).`,
                logLevel: LogLevel.Error,
              });
            }, 1000);
          }
          else if (apiStatus && (apiStatus >= 400 && apiStatus <= 499)) {
            retriesLeft = 0;
            void Logger.log({
              message: `An HTTP ${apiStatus} (${apiStatusText}) was returned. This indicates a bad request. Not retrying.`,
              logLevel: LogLevel.Error,
            });
            throw new OpenAIBadRequestError(inspect(axiosError.response?.data, false, null, true));
          }
          else {
            retriesLeft = 0;
            void Logger.log({
              message: `An unknown API error occurred:\n${axiosError.response?.data}`,
              logLevel: LogLevel.Error,
            });
            throw new OpenAIUnexpectedError(inspect(axiosError.response?.data, false, null, true));
          }
        }
        else if (e instanceof Error) {
          void Logger.log({
            message: `An unknown error occurred:\n${inspect(e, false, null, true)}`,
            logLevel: LogLevel.Error,
          });
        }
      }
    }

    throw new OpenAIRetriesExceededError('Maximum OpenAI retries exceeded. Aborting.');
  }

}