import { Telegraf, session } from "telegraf"; // библиотека
import { message } from "telegraf/filters"; // фильтр входящих джанных в чате
import { code } from "telegraf/format";
import { ogg } from "./ogg.js";
import { openai } from "./openai.js";
import dotenv from 'dotenv';
dotenv.config();

const INITIAL_SESSION = {
  messages: [],
};

const bot = new Telegraf(process.env.TELEGRAM_TOKEN); // создание бота через библиотеку Telegraf и получение настроек

bot.use(session());

// обработка команды
bot.command("new", async (context) => {
  context.session = INITIAL_SESSION;
  await context.reply("Жду вашего голосового или текстового сообщения");
});

bot.command("start", async (context) => {
  context.session = INITIAL_SESSION;
  await context.reply("Жду вашего голосового или текстового сообщения");
});

// обработка входящих данных
// text-текстовые, voice-голосовые
bot.on(message("voice"), async (context) => {
  context.session ??= INITIAL_SESSION;
  try {
    await context.reply(code("Сообщение принял. Жду ответ от сервера..."));
    const link = await context.telegram.getFileLink(
      context.message.voice.file_id
    );
    const userId = String(context.message.from.id);

    const oggPath = await ogg.create(link.href, userId);
    const mp3Path = await ogg.toMp3(oggPath, userId);

    const text = await openai.transcription(mp3Path);

    await context.reply(code(`Ваш запрос: ${text}`));

    context.session.messages.push({ role: openai.roles.USER, content: text });

    const response = await openai.chat(context.session.messages);

    context.session.messages.push({
      role: openai.roles.ASSISTANT,
      content: response.content,
    });

    await context.reply(response.content);
  } catch (error) {
    console.log("Error while voice message", error.message);
  }
});

bot.on(message("text"), async (context) => {
  context.session ??= INITIAL_SESSION;
  try {
    await context.reply(code("Сообщение принял. Жду ответ от сервера..."));

    context.session.messages.push({
      role: openai.roles.USER,
      content: context.message.text,
    });

    const response = await openai.chat(context.session.messages);

    context.session.messages.push({
      role: openai.roles.ASSISTANT,
      content: response.content,
    });

    await context.reply(response.content);
  } catch (error) {
    console.log("Error while voice message", error.message);
  }
});

bot.launch(); // запуск бота

// SIGTERM - оповещение служб о завершении работы ОС, SIGINT - завершение программы по нажатию Ctrl C,
// SIGHUP - оповещение программ, запущенных через модемное соединение,
// об обрыве связи (в настоящее время практически не используется).

process.once("SIGINT", () => bot.stop("SIGINT")); // остановка бота по завершении работы node
process.once("SIGTERM", () => bot.stop("SIGTERM"));
