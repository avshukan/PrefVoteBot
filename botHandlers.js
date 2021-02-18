'use strict';

const { Markup } = require('telegraf');
const { method } = require('./method');

function commandNewHandler(store, storage) {
  return async function(context) {
    const userId = context.message.from.id;
    const reply = 'Отправьте заголовок опроса';
    const type = 'NEW COMMAND';
    const payload = {
      userId,
      command: 'new',
      subCommand: 'header',
      reply
    };
    const action = { type, payload };
    store.dispatch(action);
    context.reply(reply, {
      parse_mode: 'HTML',
      ...Markup
      .keyboard(['❌ Cancel'])
      .oneTime()
      .resize(),
     });
  };
}

function hearsCancelHandler(store, storage) {
  return async function(context) {
    const userId = context.message.from.id;
    const userState = store.getUserState(userId);
    const { command } = userState;
    let reply = '-';
    switch (command) {
      case 'new':
        reply = 'Создание опроса отменено';
        break;
      case 'vote':
        reply = 'Участие в опросе прервано';
        break;
    };
    const type = 'HEARS CANCEL';
    const payload = { userId, reply };
    const action = { type, payload };
    store.dispatch(action);
    context.reply(reply, {
      parse_mode: 'HTML',
      ...Markup
        .keyboard([['/new']])
        .oneTime()
        .resize(),
    });
  };
}

function hearsDoneHandler(store, storage) {
  return async function(context) {
    const userId = context.message.from.id;
    const userState = store.getUserState(userId);
    const { header, text, options } = userState;
    const questionId = await storage.saveQuestionWithOptions({ userId, header, text, options });
    const reply = `Опрос <b>${header}</b> сформирован!\n`
      + 'Принять участие можно по ссылке\n'
      + `https://telegram.me/prefVoteBot?start=${questionId}`;
    const type = 'HEARS DONE';
    const payload = { userId, questionId, header, text, options, reply };
    const action = { type, payload };
    store.dispatch(action);
    context.reply(reply, { parse_mode: 'HTML' });
  };
}

function hearsResultsHandler(store, storage) {
  return async function(context) {
    const userId = context.message.from.id;
    const userState = store.getUserState(userId);
    console.log('result userstate', userState);
    const { questionId, header, text } = userState;
    const optrows = await storage.getOptions(questionId);
    const rows = await storage.getRanks(questionId);
    const optionsList = optrows.map(item => item.Id);
    const optionsRating = method(optionsList, rows);
    const optionsResult = optionsRating
      .sort((item1, item2) => item1.place - item2.place)
      .map(item => {
        const position = (item.count === 1)
          ? (item.place + 1)
          : `${item.place + 1}-${item.place + item.count}`;
        const name = optrows.filter(row => row.Id === item.id)[0].Name;
        return `${position}. ${name}`;
      });
    let reply = `Опрос <b>${header}</b>\n${text}\n\nРезультат:\n`;
    optionsResult.forEach(option => reply += `${option}\n`);
    const type = 'HEARS RESULT';
    const payload = { userId, questionId };
    const action = { type, payload };
    store.dispatch(action);
    context.reply(reply, { parse_mode: 'HTML' });
  };
}

module.exports = {
  commandNewHandler,
  hearsCancelHandler,
  hearsDoneHandler,
  hearsResultsHandler,
};
