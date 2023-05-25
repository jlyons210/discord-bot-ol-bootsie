import { PromptMessageRole } from './PromptMessageRole';

export interface PromptMessage {
    content: string;
    name?: string;
    role: PromptMessageRole
}