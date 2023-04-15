FROM node:lts-alpine

ARG DISCORD_CLIENT_ID
ARG DISCORD_GUILD_ID
ARG DISCORD_APP_TOKEN
ARG OPENAI_ORG_ID
ARG OPENAI_API_KEY

WORKDIR /app

COPY package*.json ./

RUN echo DISCORD_CLIENT_ID=${DISCORD_CLIENT_ID} >> /app/.env && \
    echo DISCORD_GUILD_ID=${DISCORD_GUILD_ID} >> /app/.env && \
    echo DISCORD_APP_TOKEN=${DISCORD_APP_TOKEN} >> /app/.env && \
    echo OPENAI_ORG_ID=${OPENAI_ORG_ID} >> /app/.env && \
    echo OPENAI_API_KEY=${OPENAI_API_KEY} >> /app/.env

RUN npm install --only=production

COPY . .

CMD [ "node", "." ]