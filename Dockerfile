FROM node:lts-alpine

ARG DISCORD_CLIENT_ID
ARG DISCORD_GUILD_ID
ARG DISCORD_APP_TOKEN
ARG OPENAI_ORG_ID
ARG OPENAI_API_KEY

WORKDIR /app

COPY package*.json ./

RUN echo DISCORD_CLIENT_ID=${DISCORD_CLIENT_ID} >> .env && \
    echo DISCORD_GUILD_ID=${DISCORD_GUILD_ID} >> .env && \
    echo DISCORD_APP_TOKEN=${DISCORD_APP_TOKEN} >> .env && \
    echo OPENAI_ORG_ID=${OPENAI_ORG_ID} >> .env && \
    echo OPENAI_API_KEY=${OPENAI_API_KEY} >> .env

RUN npm install --only=production

COPY . .

CMD [ "node", "." ]