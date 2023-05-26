import { OpenAI } from '../OpenAI';

export class HistoryMessageAnalysis {
  constructor(messageText: string) {
    this._messageText = messageText;
  }

  private _messageText: string;
  get messageText() {
    return this._messageText;
  }

  get mood() {
    return this._analyzeMessage('mood');
  }

  get sentiment() {
    return this._analyzeMessage('sentiment');
  }

  get tone() {
    return this._analyzeMessage('tone');
  }

  private async _analyzeMessage(attribute: string): Promise<string> {
    const systemPrompt = `In one word, describe the ${attribute} of any of the statements provided.`;
    const payload = await OpenAI.constructOneOffPayload(this._messageText, systemPrompt);
    return await OpenAI.requestChatCompletion(payload);
  }
}