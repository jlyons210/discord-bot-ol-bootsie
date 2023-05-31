import { PayloadMessageRole } from './index';

/**
 * Defines an interface for creating a new PayloadMessage
 */
export interface IPayloadMessage {
  content: string,
  name?: string,
  role: PayloadMessageRole,
}