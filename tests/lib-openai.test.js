import { OpenAI } from '../src/lib_ts/OpenAI';

const tryAgainMessage = await OpenAI.generateTryAgainMessage();
console.log(`tryAgainMessage = ${tryAgainMessage}`);