export class HistoryMessage {

  _isPromptContext: boolean;
  _messageText: string;
  _role: string;
  _threadSignature: string;
  _timestamp: number;
  _username: string;

  constructor(
    threadSignature: string,
    messageText: string,
    isPromptContext: boolean,
    username: string,
    role: string
  ) {
    this._isPromptContext = isPromptContext;
    this._messageText = messageText;
    this._role = role;
    this._threadSignature = threadSignature;
    this._timestamp = new Date().getTime();
    this._username = username;
  }

  get messageAnalysis() {
    return new HistoryMessageAnalysis(this._messageText);
  }

  get ttl() {
    const expireTime = this._timestamp + (parseInt(process.env.BOT_THREAD_RETAIN_SEC || '') * 1000);
    return (expireTime - new Date().getTime());
  }

};

class HistoryMessageAnalysis {

  _messageText: string;
  _mood: string;
  _sentiment: string;
  _tone: string;

  constructor(messageText: string) {
    this._messageText = messageText;
    this._mood = '';
    this._sentiment = '';
    this._tone = '';
  }

  get mood() {
    if (this._mood == '') {
      this._mood = this._analyzeMessage('mood');
    }

    return this._mood;
  }

  get sentiment() {
    if (this._sentiment == '') {
      this._sentiment = this._analyzeMessage('sentiment');
    }

    return this._sentiment;
  }

  get tone() {
    if (this._tone == '') {
      this._tone == this._analyzeMessage('tone');
    }

    return this._tone;
  }

  private async _analyzeMessage(attribute: string): Promise<string> {
    const systemPrompt = `In one word, describe the ${attribute} of any of the statements provided.`;
    const payload = await libOpenAi.constructOneOffPayload(this._messageText, systemPrompt);
    return await libOpenAi.requestChatCompletion(payload);
  }

}