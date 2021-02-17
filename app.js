// https://telegram.me/prefVoteBot?start=20
// https://www.npmjs.com/package/telegraf
// https://habr.com/ru/post/483660/
// https://techrocks.ru/2017/10/07/how-to-build-a-simple-telegram-bot-on-node-js/
// https://metanit.com/web/nodejs/8.5.php
// Keyboards https://github.com/telegraf/telegraf/blob/master/docs/examples/keyboard-bot.js

'use strict';
require('dotenv').config();
const { Telegraf } = require('telegraf');
const {
  TELEGRAM_TOKEN,
  // MYSQL_HOSTNAME,
  // MYSQL_DATABASE,
  // MYSQL_USERNAME,
  // MYSQL_PASSWORD,
  // MYSQL_POOLSIZE,
} = process.env;
const createDBStorage = require('./storage');
const storage = createDBStorage();

// const mysql = require('mysql2');

// const pool = mysql.createPool({
//   connectionLimit: MYSQL_POOLSIZE,
//   host: MYSQL_HOSTNAME,
//   user: MYSQL_USERNAME,
//   password: MYSQL_PASSWORD,
//   database: MYSQL_DATABASE,
// });

// const promisePool = pool.promise();

if (TELEGRAM_TOKEN === undefined) {
  throw new Error('TELEGRAM_TOKEN must be provided!');
}

const bot = new Telegraf(TELEGRAM_TOKEN);

bot.use(Telegraf.log());

const initialState = {};
const botReducer = require('./botReducer');
const createStore = require('./createStore');
const { hearsDoneHandler } = require('./botHandlers');
const store = createStore(botReducer, initialState);

bot.start(store.dispatch({ type: 'START' }));
bot.command('new', store.dispatch({ type: 'NEW COMMAND' }));
bot.hears('✔️ Done', hearsDoneHandler(store, storage));
bot.hears('❌ Cancel', store.dispatch({ type: 'HEARS CANCEL' }));
bot.hears('👁 Results', store.dispatch({ type: 'HEARS RESULTS' }));
bot.on('text', store.dispatch({ type: 'NEW MESSAGE' }));

// bot.command('inline', (ctx) => {
//   return ctx.reply('<b>Coke</b> or <i>Pepsi?</i>', {
//     parse_mode: 'HTML',
//     ...Markup.inlineKeyboard([
//       Markup.button.callback('Coke', 'Coke'),
//       Markup.button.callback('Pepsi', 'Pepsi')
//     ])
//   })
// })

// bot.hears(/\/wrap (\d+)/, (ctx) => {
//   return ctx.reply(
//     'Keyboard wrap',
//     Markup.keyboard(['one', 'two', 'three', 'four', 'five', 'six'], {
//       columns: parseInt(ctx.match[1])
//     })
//   )
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
