// https://habr.com/ru/post/483660/
// https://techrocks.ru/2017/10/07/how-to-build-a-simple-telegram-bot-on-node-js/
// https://metanit.com/web/nodejs/8.5.php
// Keyboards https://github.com/telegraf/telegraf/blob/master/docs/examples/keyboard-bot.js

require('dotenv').config();
const { Telegraf } = require('telegraf');

const { TELEGRAM_TOKEN } = process.env;
const createDBStorage = require('./storage');

const storage = createDBStorage();
const initialState = {};
const botReducer = require('./botReducer');
const createStore = require('./createStore');

const store = createStore(botReducer, initialState);
const botHandlers = require('./botHandlers');

const handlers = botHandlers(store, storage);
const { BUTTONS } = require('./button_types');

if (TELEGRAM_TOKEN === undefined) {
  throw new Error('TELEGRAM_TOKEN must be provided!');
}
const bot = new Telegraf(TELEGRAM_TOKEN);
bot.use(Telegraf.log());
// start - приветственное сообщение
// new - создать опрос
// createdbyme - опросы, созданные мной
// votedbyme - опросы, в которых я принял участие
// find - поиск опроса
// about - информация о боте
// help - в случае проблем
// settings - настройки
// random - случайный опрос
// popular - самые популярные опросы
bot.start(handlers.startHandler());
bot.command('createdbyme', handlers.commandCreatedByMeHandler);
bot.command('about', handlers.commandAboutHandler);
bot.command('find', handlers.commandFindHandler);
bot.command('help', handlers.commandHelpHandler);
bot.command('new', handlers.commandNewHandler());
bot.command('popular', handlers.commandPopularHandler);
bot.command('random', handlers.commandRandomHandler);
bot.command('settings', handlers.commandSettingsHandler);
bot.command('votedbyme', handlers.commandVotedByMeHandler);
bot.hears(BUTTONS.CANCEL, handlers.hearsCancelHandler());
bot.hears(BUTTONS.DONE, handlers.hearsDoneHandler());
bot.hears(BUTTONS.RESULTS, handlers.hearsResultsHandler());
bot.on('text', handlers.onTextHandler());
// bot.on('text', store.dispatch({ type: 'NEW MESSAGE' }));

// bot.command('inline', (ctx) => {
//   return ctx.reply('<b>Coke</b> or <i>Pepsi?</i>', {
//     parse_mode: 'HTML',
//     ...Markup.inlineKeyboard([
//       Markup.button.callback('Coke', 'Coke'),
//       Markup.button.callback('Pepsi', 'Pepsi')
//     ])
//   })
// })

// bot.action('Dr Pepper', (ctx, next) => {
//   return ctx.reply('👍').then(() => next())
// })

// bot.action('plain', async (ctx) => {
//   await ctx.answerCbQuery()
//   await ctx.editMessageCaption('Caption', Markup.inlineKeyboard([
//     Markup.button.callback('Plain', 'plain'),
//     Markup.button.callback('Italic', 'italic')
//   ]))
// })

// bot.action('italic', async (ctx) => {
//   await ctx.answerCbQuery()
//   await ctx.editMessageCaption('_Caption_', {
//     parse_mode: 'Markdown',
//     ...Markup.inlineKeyboard([
//       Markup.button.callback('Plain', 'plain'),
//       Markup.button.callback('* Italic *', 'italic')
//     ])
//   })
// })

// bot.action(/.+/, (ctx) => {
//   return ctx.answerCbQuery(`Oh, ${ctx.match[0]}! Great choice`)
// })

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
