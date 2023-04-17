# discord-bot-ol-bootsie
Ol' Bootsie is a Discord bot for Discord servers that interfaces with the OpenAI API.

## Requirements
* Create an application and bot via the [Discord Developer Portal](https://discord.com/developers/).
* Set up pay-as-you-go OpenAI API access [here](https://platform.openai.com/account/) - this is very inexpensive, but be sure to set a spending limit and warning level.
* An always-on machine or environment to run the application on.

## Setup

### Local execution
* Requires `git`, `nodejs`, and `npm` packages
* Clone this repo:
    * `$ git clone git@github.com:jlyons210/discord-bot-ol-bootsie.git`, or
    * `$ git clone https://github.com/jlyons210/discord-bot-ol-bootsie.git`
* Install dependencies:
    * `<package_directory>/ $ npm install`
* Run:
    * `$ node .`

### Container execution from Docker Hub
* Requires Docker Engine - [installation instructions](https://docs.docker.com/engine/install/)
* Pull image from Docker Hub:
    * `$ docker pull jlyons210/discord-bot-ol-bootsie:latest`
    * `$ docker run -d docker-bot-ol-bootsie:latest`

### Container execution from source
* Requires Docker Engine - [installation instructions](https://docs.docker.com/engine/install/)
* Clone this repo:
    * `$ git clone git@github.com:jlyons210/discord-bot-ol-bootsie.git`, or
    * `$ git clone https://github.com/jlyons210/discord-bot-ol-bootsie.git`
* Build container image:
    * `$ docker build \[build-arg\] -t docker-bot-ol-bootsie:$(jq -r ".version" package.json) .`:
* Run container:
    * `$ docker run -d docker-bot-ol-bootsie:$(jq -r ".version" package.json)`

## Version history

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