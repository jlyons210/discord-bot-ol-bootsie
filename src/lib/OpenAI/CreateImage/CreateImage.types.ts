/**
 * Interfaces
 */

export interface ClientOptions {
  apiKey: string;
  maxRetries: number;
  timeoutSec: number;
}

export interface RequestOptions {
  model: ImageModel;
  prompt: string;
  response_format: ResponseFormat;
  user: string;
}

export interface RequestOptionsDallE2 extends RequestOptions {
  model: ImageModel.DallE2;
  n: NumberOfImagesDallE2;
  size: SizeDallE2;
}

export interface RequestOptionsDallE3 extends RequestOptions {
  model: ImageModel.DallE3;
  n: NumberOfImagesDallE3;
  quality: QualityDallE3;
  size: SizeDallE3;
  style: StyleDallE3;
}

/**
 * Types
 */

export type NumberOfImagesDallE2 = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type NumberOfImagesDallE3 = 1;

export enum QualityDallE3 {
  Standard = 'standard',
  HD = 'hd',
}

export enum ImageModel {
  DallE2 = 'dall-e-2',
  DallE3 = 'dall-e-3',
}

export enum ResponseFormat {
  URL = 'url',
  B64Json = 'b64_json',
}

export type ResponsePayload = {
  created: number;
  data:
    {
      url: string,
      revised_prompt?: string
    }[]
    | {
      b64_json: string,
      revised_prompt?: string
    }[];
}

export enum SizeDallE2 {
  Small = '256x256',
  Medium = '512x512',
  Large = '1024x1024',
}

export enum SizeDallE3 {
  Large = '1024x1024',
  Wide = '1792x1024',
  Tall = '1024x1792',
}

export enum StyleDallE3 {
  Vivid = 'vivid',
  Natural = 'natural',
}
