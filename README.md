# discord-bot-ol-bootsie
Ol' Bootsie is a Discord bot written in Node.js that interfaces with the OpenAI API.

## Requirements
* Create an application and bot via the [Discord Developer Portal](https://discord.com/developers/).
* Set up pay-as-you-go OpenAI API access [here](https://platform.openai.com/account/) - this is very inexpensive, but be sure to set a spending limit and warning level.
* An always-on machine or environment to run the application on.

## Setup

### Local execution
* Requires `git`, `nodejs`, and `npm` packages
* Clone this repo:
```
git clone git@github.com:jlyons210/discord-bot-ol-bootsie.git
```
or...
```
git clone https://github.com/jlyons210/discord-bot-ol-bootsie.git
```
* Install dependencies:
```
npm install
```
* Run:
```
node .
```

### Container execution from Docker Hub
* Requires Docker Engine - [installation instructions](https://docs.docker.com/engine/install/)
* Pull image from Docker Hub:

```
docker pull jlyons210/discord-bot-ol-bootsie:latest
```

* Run container:
```
docker run -d \
  -e DISCORD_CLIENT_ID=[insert value] \
  -e DISCORD_GUILD_ID=[insert value] \
  -e DISCORD_APP_TOKEN=[insert value] \
  -e OPENAI_ORG_ID=[insert value] \
  -e OPENAI_API_KEY=[insert value] \
  -e OPENAI_PARAM_MAX_TOKENS=[insert value - suggested starter: 500] \
  -e OPENAI_PARAM_MODEL=[insert value - suggested starter: gpt-3.5-turbo] \
  -e OPENAI_PARAM_SYSTEM_PROMPT=["Add a system prompt that describes how the chat bot should behave"]
  -e OPENAI_PARAM_TEMPERATURE=[insert value - suggested starter: 0.6] \
discord-bot-ol-bootsie:latest
```

### Container execution from source
* Requires Docker Engine - [installation instructions](https://docs.docker.com/engine/install/)
* Clone this repo:
```
git clone git@github.com:jlyons210/discord-bot-ol-bootsie.git
```
or...
```
git clone https://github.com/jlyons210/discord-bot-ol-bootsie.git
```
* Build container image:
```
docker build -t discord-bot-ol-bootsie:$(jq -r ".version" package.json) .
```
* Run container:
```
docker run -d \
  -e DISCORD_CLIENT_ID=[insert value] \
  -e DISCORD_GUILD_ID=[insert value] \
  -e DISCORD_APP_TOKEN=[insert value] \
  -e OPENAI_ORG_ID=[insert value] \
  -e OPENAI_API_KEY=[insert value] \
  -e OPENAI_PARAM_MAX_TOKENS=[insert value - suggested starter: 500] \
  -e OPENAI_PARAM_MODEL=[insert value - suggested starter: gpt-3.5-turbo] \
  -e OPENAI_PARAM_SYSTEM_PROMPT=["Add a system prompt that describes how the chat bot should behave"]
  -e OPENAI_PARAM_TEMPERATURE=[insert value - suggested starter: 0.6] \
discord-bot-ol-bootsie:$(jq -r ".version" package.json)
```

## Version history

### 0.4.0
* Updated app.js to support `gpt-3.5-turbo`.
  * Using `openAiClient.createChatCompletion()` instead of `openAiClient.createCompletion()`.
  * This limits supported models to `gpt-4` (not yet public), `gpt-4-0314` (not yet public), `gpt-4-32k` (not yet public), `gpt-4-32k-0314` (not yet public), `gpt-3.5-turbo`, and `gpt-3.5-turbo-0301`.
    * This is fine, because per the [models documentation](https://platform.openai.com/docs/models/gpt-4), `gpt-3.5-turbo` is 1/10th the cost of `text-davinci-003`, and `gpt-4` is even better-er.
  * `openai-node` [PR #123](https://github.com/openai/openai-node/pull/123) looks like it will automate API endpoint switching based upon selected model. Monitoring for approval/merge.
* Removed $ shell prefixes from README.md code blocks to enable better use of the GitHub UI's copy button.

### 0.3.1
* Updated logging timestamp to ISO 8601 format.
* Fixed indentation in app.js (2-space convention)

### 0.3.0
* Removed `/chatgpt` and scaffolding for importing slash-commands.
* Updated secrets approach from using `.env` and `dotenv` with `docker build --build-arg [arg=]` (contaminates image with secrets) to `docker run -e [arg=]` to enable a credential-less container image that can be distributed.
* Improved console logging.
* Renamed entry point from `index.js` to `app.js`.
* Documented setup and version history in README.md.

### 0.2.0
* Added support for @-mention of bot which is more conversational than slash-commands.
* Removed boilerplate slash-commands, leaving only `/chatgpt`.
* Moved OpenAI API parameter configurations to dotenv.

### 0.1.0
* Initial commit
* Supports `/chatgpt prompt` and other boilerplate slash-commands.
* Containerized application, but image isn't portable is building requires Docker build-arg placement of dotenv