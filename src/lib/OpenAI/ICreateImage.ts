import {
  CreateImageResponseFormat,
  CreateImageSize,
} from './index';

/**
 * Defines an interface for OpenAI API configuration
 */
export interface ICreateImage {
  apiKey: string,
  maxRetries: number,
  prompt: string,
  numberOfImages: number,
  size: CreateImageSize,
  responseFormat: CreateImageResponseFormat,
  user?: string,
}