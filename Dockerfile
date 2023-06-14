# Build stage
FROM node:lts-alpine AS build

WORKDIR /usr/src/app

COPY package*.json ./

RUN yarn install

COPY . .

RUN yarn run build

# Production stage
FROM node:lts-alpine AS production

WORKDIR /usr/src/app

COPY package*.json ./

RUN yarn install --production

COPY --from=build /usr/src/app/dist ./dist

CMD ["yarn", "start"]