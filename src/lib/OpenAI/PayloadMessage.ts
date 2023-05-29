import { PayloadMessageRole } from './index';

/**
 * Controls message adherence to the OpenAI payload specification.
 */
export type PayloadMessage = {
  content: string;
  name?: string;
  role: PayloadMessageRole;
}