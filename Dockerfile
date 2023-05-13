FROM node:lts-alpine

WORKDIR /usr/src/app

COPY . .

RUN npm install --only=production

ENTRYPOINT [ "node", "." ]