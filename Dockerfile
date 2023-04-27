FROM node:16-alpine

ENV TELEGRAM_TOKEN=6148186603:AAHVTtbL5nnFn3SjfYaVreA4nIEXCehVxjw \
    OPENAI_KEY=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 \
    TEST_ENV=prod

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ENV PORT=3000

EXPOSE $PORT

CMD ["npm", "start"]


