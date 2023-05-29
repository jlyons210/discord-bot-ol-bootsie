# Build stage
FROM node:lts-alpine AS build

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM node:lts-alpine AS production

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --omit-dev

COPY --from=build /usr/src/app/dist ./dist

CMD ["npm", "run", "start"]