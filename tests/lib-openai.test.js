const libOpenAi = require('../lib/lib-openai');

async function test_generateTryAgainMessage() {

  const tryAgainMessage = await libOpenAi.generateTryAgainMessage();
  console.log(`tryAgainMessage = ${tryAgainMessage}`);

}

test_generateTryAgainMessage();