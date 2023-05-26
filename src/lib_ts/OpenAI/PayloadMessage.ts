import { PayloadMessageRole } from './index';

export interface PayloadMessage {
    content: string;
    name?: string;
    role: PayloadMessageRole;
}