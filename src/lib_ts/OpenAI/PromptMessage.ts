import { PromptMessageRole } from '.';

export interface PromptMessage {
    content: string;
    name?: string;
    role: PromptMessageRole
}