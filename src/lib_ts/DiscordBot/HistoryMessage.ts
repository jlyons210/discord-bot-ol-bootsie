import { OpenAI } from '../OpenAI';

export class HistoryMessage {
  constructor(
    threadSignature: string,
    messageText: string,
    isPromptContext: boolean,
    username: string,
    role: string
  ) {
    this._isPromptContext = isPromptContext;
    // TODO: Make _messageText a OpenAI.PromptMessage object
    this._messageText = messageText;
    this._role = role;
    this._threadSignature = threadSignature;
    this._timestamp = new Date().getTime();
    this._username = username;
  }

  private _isPromptContext: boolean;
  get isPromptContext() {
    return this._isPromptContext;
  }

  get messageAnalysis() {
    return new HistoryMessageAnalysis(this._messageText);
  }

  private _messageText: string;
  get messageText() {
    return this._messageText;
  }

  private _role: Role;
  get role() {
    return this._role;
  }

  private _threadSignature: string;
  get threadSignature() {
    return this._threadSignature;
  }

  private _timestamp: number;
  get timestamp() {
    return this._timestamp;
  }

  get ttl() {
    const expireTime = this._timestamp + (parseInt(process.env.BOT_THREAD_RETAIN_SEC || '') * 1000);
    return (expireTime - new Date().getTime());
  }

  private _username: string;
  get username() {
    return this._username;
  }
}

class HistoryMessageAnalysis {
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