# discord-bot-ol-bootsie
Ol' Bootsie is a Discord bot written in Node.js that interfaces with the OpenAI API.

## Table of contents
* [Requirements](#requirements)
* [Setup](#setup)
  * [Local Execution](#local-execution)
  * [Container execution from Docker Hub](#container-execution-from-docker-hub)
  * [Container execution from source](#container-execution-from-source)
* [Version History](#version-history)
  * [0.4.2](#042-2023-04-18)
  * [0.4.1](#041-2023-04-18)
  * [0.4.0](#040-2023-04-17)
  * [0.3.1](#031-2023-04-17)
  * [0.3.0](#030-2023-04-17)
  * [0.2.0](#020-2023-04-16)
  * [0.1.0](#010-2023-04-14)

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
  -e BOT_THREAD_MODE=[channel|user] \
  -e BOT_THREAD_RETAIN_SEC=[insert value - suggested starter: 300] \
  -e DISCORD_APP_TOKEN=[insert value] \
  -e DISCORD_CLIENT_ID=[insert value] \
  -e DISCORD_GUILD_ID=[insert value] \
  -e OPENAI_API_KEY=[insert value] \
  -e OPENAI_ORG_ID=[insert value] \
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
  -e BOT_THREAD_MODE=[channel|user] \
  -e BOT_THREAD_RETAIN_SEC=[insert value - suggested starter: 300] \
  -e DISCORD_APP_TOKEN=[insert value] \
  -e DISCORD_CLIENT_ID=[insert value] \
  -e DISCORD_GUILD_ID=[insert value] \
  -e OPENAI_API_KEY=[insert value] \
  -e OPENAI_ORG_ID=[insert value] \
  -e OPENAI_PARAM_MAX_TOKENS=[insert value - suggested starter: 500] \
  -e OPENAI_PARAM_MODEL=[insert value - suggested starter: gpt-3.5-turbo] \
  -e OPENAI_PARAM_SYSTEM_PROMPT=["Add a system prompt that describes how the chat bot should behave"]
  -e OPENAI_PARAM_TEMPERATURE=[insert value - suggested starter: 0.6] \
discord-bot-ol-bootsie:$(jq -r ".version" package.json)
```

## Version history

### 0.4.2 (2023-04-18)
* Added logging of non-sensitive startup parameters - [issue #15](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/15)
* Added debug logging to pruning function, suspect it may get stuck in a loop - [issue #14](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/14). Issue remains open until cause of hang is identified.
* Added [Table of Contents](#table-of-contents) to `README.md`.
* Bug fixes:
  * Improved error handling for empty OpenAI API responses, added trap for 4XX (fatal) and 5XX (retriable) errors - [issue #17](https://github.com/jlyons210/discord-bot-ol-bootsie/issues/17).

### 0.4.1 (2023-04-18)
* Added package `name:version` to startup logging.
* Added conversational continuity.
  * Requires new environment variables `BOT_THREAD_MODE=[channel|user]` and `BOT_THREAD_RETAIN_SEC=[seconds]`
  * ~~Experimental~~ Added Discord username to OpenAI prompt under optional `name` field.
    * This will remain in place! It allows the system prompt to treat different chat users uniquely.

### 0.4.0 (2023-04-17)
* Updated app.js to support `gpt-3.5-turbo`.
  * Using `openAiClient.createChatCompletion()` instead of `openAiClient.createCompletion()`.
  * This limits supported models to `gpt-4` (not yet public), `gpt-4-0314` (not yet public), `gpt-4-32k` (not yet public), `gpt-4-32k-0314` (not yet public), `gpt-3.5-turbo`, and `gpt-3.5-turbo-0301`.
    * This is fine, because per the [models documentation](https://platform.openai.com/docs/models/gpt-4), `gpt-3.5-turbo` is 1/10th the cost of `text-davinci-003`, and `gpt-4` is even better-er.
  * `openai-node` [PR #123](https://github.com/openai/openai-node/pull/123) looks like it will automate API endpoint switching based upon selected model. Monitoring for approval/merge.
* Removed $ shell prefixes from README.md code blocks to enable better use of the GitHub UI's copy button.

### 0.3.1 (2023-04-17)
* Updated logging timestamp to ISO 8601 format.
* Fixed indentation in app.js (2-space convention)

### 0.3.0 (2023-04-17)
* Removed `/chatgpt` and scaffolding for importing slash-commands.
* Updated secrets approach from using `.env` and `dotenv` with `docker build --build-arg [arg=]` (contaminates image with secrets) to `docker run -e [arg=]` to enable a credential-less container image that can be distributed.
* Improved console logging.
* Renamed entry point from `index.js` to `app.js`.
* Documented setup and version history in README.md.

### 0.2.0 (2023-04-16)
* Added support for @-mention of bot which is more conversational than slash-commands.
* Removed boilerplate slash-commands, leaving only `/chatgpt`.
* Moved OpenAI API parameter configurations to dotenv.

### 0.1.0 (2023-04-14)
* Initial commit
* Supports `/chatgpt prompt` and other boilerplate slash-commands.
* Containerized application, but image isn't portable is building requires Docker build-arg placement of dotenv