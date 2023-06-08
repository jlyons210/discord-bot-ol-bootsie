import {
  CreateImageResponseFormat,
  CreateImageSize,
} from '../index';

/**
 * Defines an interface for creating a new PayloadMessage
 */
export interface CreateImagePayloadConfiguration {
  numberOfImages: number,
  prompt: string,
  responseFormat: CreateImageResponseFormat,
  size: CreateImageSize,
  user: string,
}