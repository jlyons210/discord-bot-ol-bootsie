import { HistoryMessageAnalysis } from '.';

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