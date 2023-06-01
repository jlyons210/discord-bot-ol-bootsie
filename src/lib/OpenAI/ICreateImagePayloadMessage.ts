import {
  CreateImageResponseFormat,
  CreateImageSize,
} from './index';

/**
 * Defines an interface for creating a new PayloadMessage
 */
export interface ICreateImagePayloadMessage {
  prompt: string;
  n: number;
  size: CreateImageSize;
  response_format: CreateImageResponseFormat;
  user?: string;
}