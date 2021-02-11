// https://telegram.me/prefVoteBot?start=20
// https://www.npmjs.com/package/telegraf
// https://habr.com/ru/post/483660/
// https://techrocks.ru/2017/10/07/how-to-build-a-simple-telegram-bot-on-node-js/
// https://metanit.com/web/nodejs/8.5.php
// Keyboards https://github.com/telegraf/telegraf/blob/master/docs/examples/keyboard-bot.js

'use strict';
require('dotenv').config();
const { Telegraf, Context, Markup } = require('telegraf');
const {
  TELEGRAM_TOKEN,
  MYSQL_HOSTNAME,
  MYSQL_DATABASE,
  MYSQL_USERNAME,
  MYSQL_PASSWORD,
  MYSQL_POOLSIZE,
} = process.env;

const mysql = require('mysql2');

const pool = mysql.createPool({
  connectionLimit: MYSQL_POOLSIZE,
  host: MYSQL_HOSTNAME,
  user: MYSQL_USERNAME,
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE,
});

const promisePool = pool.promise();

if (TELEGRAM_TOKEN === undefined) {
  throw new Error('TELEGRAM_TOKEN must be provided!');
}

// class VoteContext extends Context {
//   constructor(update, telegram, options) {
//     console.log('Creating context for %j', update)
//     super(update, telegram, options)
//     this.userId = update.message.from.id;
//     this.x = 'xxx';
//     console.log('this', this);
//   }

//   reply(...args) {
//     // console.log('reply called with args: %j', args)
//     console.log('reply this', this)
//     return super.reply(...args)
//   }
// }

// const bot = new Telegraf(TELEGRAM_TOKEN, { contextType: VoteContext })
const bot = new Telegraf(TELEGRAM_TOKEN);

bot.use(Telegraf.log());

let state = {};

bot.start(start);

bot.command('new', commandNew);
bot.hears('✔️ Done', hearsDone);
bot.hears('❌ Cancel', hearsCancel);
bot.hears('👁 Results', hearsResults);
bot.on('text', onText);

function commandNew(context) {
  console.log('state', state);
  const userId = context.message.from.id;
  if (!state[userId])
    state[userId] = { id: userId };
  state[userId].command = 'new';
  state[userId].subCommand = 'name';
  return context.replyWithMarkdown('Отправьте заголовок опроса', Markup
    .keyboard(['❌ Cancel'])
    .oneTime()
    .resize(),
  );
}

async function start(context) {
  const userId = context.message.from.id;
  if (!state[userId])
    state[userId] = { id: userId };
  state[userId].command = 'vote';
  state[userId].subCommand = '';
  console.log('start context', context);
  const pollId = context.startPayload;
  console.log('context.startPayload', context.startPayload);
  console.log('pollId', pollId);
  const questionSQL = 'SELECT * FROM `prefvotebot_questions` WHERE `Id` = ?';
  const [questionRow] = await promisePool.execute(questionSQL, [pollId]);
  console.log('questionRow', questionRow);
  const optioinsSQL = 'SELECT * FROM `prefvotebot_options` WHERE `QuestionId` = ?';
  const dataSQL = [pollId];
  const [optionsRows] = await promisePool.execute(optioinsSQL, dataSQL);
  console.log('optionsRows', optionsRows);


  state[userId].pollId = pollId;
  state[userId].name = questionRow[0].Name;
  state[userId].text = questionRow[0].Text;
  state[userId].options = optionsRows;
  state[userId].optionsSelected = [];
  state[userId].mid = [];

  const text = `${state[userId].name}\n${state[userId].text}`;
  const buttons = optionsRows.map(option => option.Name);
  const voteMessageId = await context.replyWithMarkdown(text, Markup
    .keyboard([...buttons.map(button => [button]), ['❌ Cancel']])
    .oneTime()
    .resize(),
  );
  state[userId].voteMessageId = voteMessageId;
}

async function hearsDone(context) {
  console.log('state', state);
  const userId = context.message.from.id;
  if (!state[userId])
    state[userId] = { id: userId };
  state[userId].command = null;

  const sql = 'INSERT INTO `prefvotebot_questions` (`Name`, `Text`, `Owner`) VALUES (?, ?, ?)';
  const data = [state[userId].name, state[userId].text, state[userId].id];
  const result = await promisePool.query(sql, data);
  const questionId = result[0].insertId;
  var optionSql = 'INSERT INTO `prefvotebot_options` (`QuestionId`, `Name`) VALUES ?';
  var optionValues = state[userId].options.map(element => [questionId, element]);
  console.log('optionValues', [optionValues]);
  const optionResult = await promisePool.query(optionSql, [optionValues]);
  console.log('optionResult', optionResult);


  const text = `Опрос **${state[userId].name}** сформирован!\n'
    + 'Принять участие можно по ссылке\n'
    + 'https://telegram.me/prefVoteBot?start=${questionId}`;
  // state[userId].options.forEach(element => {
  //   text += `\n${element}`;
  // });
  context.replyWithMarkdown(text);
}



async function hearsResults(context) {
  console.log('state', state);
  const userId = context.message.from.id;
  if (!state[userId])
    state[userId] = { id: userId };
  state[userId].command = null;

const QuestionId = 30;
const optsql = `SELECT * FROM prefvotebot_options WHERE QuestionId = ?`;
const optdata = [QuestionId];
const [optrows] = await promisePool.query(optsql, optdata);
const optionsList = optrows.map(item => item.Id);
// const optionsList = [36, 37];

  const sql = `SELECT
	r1.OptionId Option1,
	r2.OptionId Option2,
	SUM(CASE WHEN r1.Rank < r2.Rank THEN 1 ELSE 0 END) K
FROM (
	SELECT *
	FROM prefvotebot_ranks
	WHERE QuestionId = ?
) r1
INNER JOIN (
	SELECT *
	FROM prefvotebot_ranks
	WHERE QuestionId = ?
) r2
ON r1.User = r2.User
GROUP BY
	r1.OptionId,
	r2.OptionId`;
  const data = [QuestionId, QuestionId];
  const [rows, fields] = await promisePool.query(sql, data);
  console.log('result rows', rows)
  context.replyWithMarkdown('result');

  const d = [];
  const p = [];
  optionsList.forEach(option1 => {
    d[option1] = [];
    optionsList.forEach(option2 => {
      d[option1][option2] = 0;
    });
  });
  optionsList.forEach(option1 => {
    p[option1] = [];
    optionsList.forEach(option2 => {
      p[option1][option2] = 0;
    });
  });

  console.log('d', d);
  rows.forEach(row => d[row.Option1][row.Option2] = parseInt(row.K));
  console.log('d', d);

  console.log('p start', p);

  for (let i = 0; i < optionsList.length; i++) {
    for (let j = 0; j < optionsList.length; j++) {
      if (i !== j) {
        if (d[optionsList[i]][optionsList[j]] > d[optionsList[j]][optionsList[i]]) {
          p[optionsList[i]][optionsList[j]] = d[optionsList[i]][optionsList[j]];
        } else {
          p[optionsList[i]][optionsList[j]] = 0;
        }
      }
    }
  }

  console.log('p continue', p);

  for (let i = 0; i < optionsList.length; i++) {
    for (let j = 0; j < optionsList.length; j++) {
      if (i !== j) {
        for (let k = 0; k < optionsList.length; k++) {
          if (i !== k && j !== k) {
            p[optionsList[j]][optionsList[k]] = Math.max(
              p[optionsList[j]][optionsList[k]],
              Math.min(
                p[optionsList[j]][optionsList[i]],
                p[optionsList[i]][optionsList[k]]
              )
            );
          }
        }
      }
    }
  }

  console.log('p end', p);

  const optionsMarks = [];
  for (let i = 0; i < optionsList.length; i++) {
    optionsMarks[optionsList[i]] = 0;
    for (let j = 0; j < optionsList.length; j++) {
      if (p[optionsList[i]][optionsList[j]] > p[optionsList[j]][optionsList[i]]) {
        optionsMarks[optionsList[i]] += 2;
      } else if (p[optionsList[i]][optionsList[j]] > p[optionsList[j]][optionsList[i]]) {
        optionsMarks[optionsList[i]] += 1;
      }
    }
  }
  console.log('optionsMarks', optionsMarks);

  const optionsRating = optionsList.map(option => {
    const result = {
      id: option,
      mark: optionsMarks[option],
      place: optionsMarks.filter(item => (item > optionsMarks[option])).length,
      count: optionsMarks.filter(item => (item === optionsMarks[option])).length,
    };
    return result;
  })

  console.log('optionsRating', optionsRating);

  const optionsResult = optionsRating
    .sort((item1, item2) => (item1.place < item2.place))
    .map(item => {
      const place = (item.place + 1);
      const name = optrows.filter(row => row.Id === item.id)[0].Name;
      return `${place}. ${name}`;
    })
  let replyText = '';
  optionsResult.forEach(option => replyText += `${option}\n`);
  context.replyWithMarkdown(replyText, Markup
    .keyboard([['/new']])
    .oneTime()
    .resize(),
  );

}



function hearsCancel(context) {
  console.log('state', state);
  const userId = context.message.from.id;
  if (!state[userId])
    state[userId] = { id: userId };
  let replyText;
  switch (state[userId].command) {
    case 'new':
      replyText = 'Создание опроса отменено';
      break;
    case 'vote':
      replyText = 'Участие в опросе прервано';
      break;
  };
  state[userId].command = '';
  context.replyWithMarkdown(replyText, Markup
    .keyboard([['/new']])
    .oneTime()
    .resize(),
  );
}



async function onText(context) {
  console.log('onText start state', state);
  const userId = context.message.from.id;
  const text = context.message.text;

  if (!state[userId])
    state[userId] = { id: userId };
  state[userId].index = 0;

  console.log('onText middle state', state);

  if (state[userId].command === 'new') {
    switch (state[userId].subCommand) {
      case 'name':
        state[userId].name = text;
        state[userId].subCommand = 'question';
        context.replyWithMarkdown('Отправьте текст вопроса', Markup
          .keyboard(['❌ Cancel'])
          .oneTime()
          .resize(),
        );
        break;
      case 'question':
        state[userId].text = text;
        state[userId].options = [];
        state[userId].subCommand = 'option';
        context.replyWithMarkdown('Отправьте вариант ответа', Markup
          .keyboard(['❌ Cancel'])
          .oneTime()
          .resize(),
        );
        break;
      case 'option':
        state[userId].options.push(text);
        context.replyWithMarkdown('Отправьте вариант ответа', Markup
          .keyboard([['✔️ Done', '❌ Cancel']])
          .oneTime()
          .resize(),
        );
        break;
    }
  }
  if (state[userId].command === 'vote') {
    console.log('onText state options', state[userId].options);
    const optionIndex = state[userId].options.findIndex(option => option.Name === text);
    console.log('onText optionIndex', optionIndex);
    if (optionIndex === -1) {
      const text = `Простите, такого значения нет в списке вариантов\n** ${state[userId].name} **\n${state[userId].text}`;
      const buttons = state[userId].options.map(option => [option.Name]);
      const mid = await context.replyWithMarkdown(text, Markup
        .keyboard([...buttons.map(button => [button]), ['❌ Cancel']])
        .oneTime()
        .resize(),
      );
      state[userId].mid.push(mid);
    } else {
      const selectedOption = state[userId].options.splice(optionIndex, 1);
      state[userId].optionsSelected.push(...selectedOption);
      if (state[userId].options.length > 1) {
        const buttons = state[userId].options.map(option => option.Name);
        console.log('id', context.message.message_id);
        await context.deleteMessage(context.message.message_id);
        const del = await context.deleteMessage(state[userId].voteMessageId.message_id);
        console.log('del', del);
        let text = `${state[userId].name}\n${state[userId].text}\nВы уже выбрали:`;
        state[userId].optionsSelected.forEach((option, index) => {
          text += `\n${index + 1}. ${option.Name}`;
        });
        const mid = await context.replyWithMarkdown(text, Markup
          .keyboard([...buttons.map(button => [button]), ['❌ Cancel']])
          .oneTime()
          .resize(),
        );
        state[userId].voteMessageId = mid;
        state[userId].mid.push(mid);
      } else {
        const selectedOption = state[userId].options.pop();
        console.log('last option', selectedOption);
        state[userId].optionsSelected.push(selectedOption);
        console.log('state[userId].optionsSelected all', state[userId].optionsSelected);
        const saveData = state[userId].optionsSelected.map((option, index) => {
          return [option.QuestionId, option.Id, index + 1, userId];
        });
        console.log('saveData', saveData);

        const saveSql = 'INSERT INTO `prefvotebot_ranks` (`QuestionId`, `OptionId`, `Rank`, `User`) VALUES ?';
        const saveResult = await promisePool.query(saveSql, [saveData]);
        console.log('saveResult', saveResult);
        let text = `Вы завершили опрос * ${state[userId].name} * \nВаш выбор:`;
        state[userId].optionsSelected.forEach((option, index) => {
          text += `\n${index + 1}. ${option.Name}`;
        });
        context.replyWithMarkdown(text, Markup
          .keyboard([['👁 Results']])
          .oneTime()
          .resize(),
        );

      }
    }

  }
  console.log('onText state', state);
  console.log('onText state mid', state[userId].mid);
  console.log('onText state optionsSelected', state[userId].optionsSelected);
}

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
