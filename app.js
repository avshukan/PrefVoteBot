// https://www.npmjs.com/package/telegraf
// https://docs.microsoft.com/ru-ru/archive/msdn-magazine/2014/june/typescript-enhance-your-javascript-investment-with-typescript
// https://habr.com/ru/post/483660/
// https://techrocks.ru/2017/10/07/how-to-build-a-simple-telegram-bot-on-node-js/

'use strict';
require('dotenv').config();
const { Context, Telegraf, Markup } = require('telegraf')
const { TELEGRAM_TOKEN } = process.env;

if (TELEGRAM_TOKEN === undefined) {
  throw new Error('TELEGRAM_TOKEN must be provided!')
}

const bot = new Telegraf(TELEGRAM_TOKEN);

bot.use(Telegraf.log())

let state = {};

bot.command('new', context => {
  console.log('state', state);
  const userId = context.message.from.id;
  if (!state[userId])
    state[userId] = { id: userId };
  state[userId].command = 'new';
  state[userId].subCommand = 'name';
  return context.replyWithMarkdown('Enter name for new poll');
});

bot.command('done', context => {
  console.log('state', state);
  const userId = context.message.from.id;
  if (!state[userId])
    state[userId] = { id: userId };
  state[userId].command = null;
  let text = `Формирование вопроса завершено!\n${state[userId].name}\n${state[userId].text}`;
  state[userId].options.forEach(element => {
    text += `\n${element}`;
  });
  context.reply(text);
});

// handle the reaction everytime user sends a text message
bot.on('text', context => {
  const userId = context.message.from.id;
  const text = context.message.text;

  if (!state[userId])
    state[userId] = { id: userId };
  state[userId].index = 0;

  if (state[userId].command === 'new') {
    switch(state[userId].subCommand) {
      case 'name':
        state[userId].name = text;
        state[userId].subCommand = 'question';
        context.reply('Введите текст вопроса');
        break;
      case 'question':
        state[userId].text = text;
        state[userId].options = [];
        state[userId].subCommand = 'option';
        context.reply('Введите вариант ответа');
        break;
      case 'option':
        state[userId].options.push(text);
        context.reply('Введите вариант ответа');
        break;
    }
  }
  console.log('state', state);
});

// bot.command('onetime', (ctx) =>
//   ctx.reply('One time keyboard', Markup
//     .keyboard(['/simple', '/inline', '/pyramid'])
//     .oneTime()
//     .resize()
//   )
// )

// bot.command('custom', async (ctx) => {
//   return await ctx.reply('Custom buttons keyboard', Markup
//     .keyboard([
//       ['🔍 Search', '😎 Popular'], // Row1 with 2 buttons
//       ['☸ Setting', '📞 Feedback'], // Row2 with 2 buttons
//       ['📢 Ads', '⭐️ Rate us', '👥 Share'] // Row3 with 3 buttons
//     ])
//     .oneTime()
//     .resize()
//   )
// })

// bot.hears('🔍 Search', ctx => ctx.reply('Yay!'))
// bot.hears('📢 Ads', ctx => ctx.reply('Free hugs. Call now!'))

// bot.command('special', (ctx) => {
//   return ctx.reply(
//     'Special buttons keyboard',
//     Markup.keyboard([
//       Markup.button.contactRequest('Send contact'),
//       Markup.button.locationRequest('Send location')
//     ]).resize()
//   )
// })

// bot.command('simple', (ctx) => {
//   return ctx.replyWithHTML(
//     '<b>Coke</b> or <i>Pepsi?</i>',
//     Markup.keyboard(['Coke', 'Pepsi'])
//   )
// })

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

bot.launch()

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
