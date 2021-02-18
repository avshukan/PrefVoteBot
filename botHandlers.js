'use strict';

const { ACTION_HEARS_CANCEL, ACTION_HEARS_DONE, ACTION_HEARS_RESULTS } = require('./action_types');
const { Markup } = require('telegraf');
const { method } = require('./method');

function botHandlers(initStore, initStorage) {
  let store = initStore;
  let storage = initStorage;

  function startHandler() {
    return async function (context) {
      const userId = context.message.from.id;
      // const userState = store.getUserState(userId);
      if (context.startPayload === '') {
        console.log('context.startPayload === \'\' => return;')
        return;
      }
      const questionId = parseInt(context.startPayload, 10);
      const status = await storage.getQuestionStatus(questionId, userId);
      if (status === 'ANSWERED') {
        const type = ACTION_HEARS_RESULTS;
        const payload = { userId, questionId };
        const action = { type, payload };
        store.dispatch(action);
        await hearsResultsHandler()(context);
      } else {
        const questionWithOptions = await storage.getQuestionWithOptions(questionId);
        const { header, text, options } = questionWithOptions;
        const reply = `${header}\n${text}`;
        const buttons = options.map(option => option.Name);
        const voteMessageId = await context.replyWithMarkdown(reply, Markup
          .keyboard([...buttons.map(button => [button]), ['❌ Cancel']])
          .oneTime()
          .resize(),
        );
        const type = 'VOTE';
        const payload = {
          userId,
          questionId,
          command: 'vote',
          subCommand: '',
          header,
          text,
          options,
          optionsSelected: [],
          mid: [],
          reply,
          voteMessageId
        };
        const action = { type, payload };
        store.dispatch(action);
      }
    }
  }

  function commandNewHandler() {
    return async function (context) {
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

  function hearsCancelHandler() {
    return async function (context) {
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
      const type = ACTION_HEARS_CANCEL;
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

  function hearsDoneHandler() {
    return async function (context) {
      const userId = context.message.from.id;
      const userState = store.getUserState(userId);
      const { header, text, options } = userState;
      const questionId = await storage.saveQuestionWithOptions({ userId, header, text, options });
      const reply = `Опрос <b>${header}</b> сформирован!\n`
        + 'Принять участие можно по ссылке\n'
        + `https://telegram.me/prefVoteBot?start=${questionId}`;
      const type = ACTION_HEARS_DONE;
      const payload = { userId, questionId, header, text, options, reply };
      const action = { type, payload };
      store.dispatch(action);
      context.reply(reply, { parse_mode: 'HTML' });
    };
  }

  function hearsResultsHandler() {
    return async function (context) {
      const userId = context.message.from.id;
      const userState = store.getUserState(userId);
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
      const type = ACTION_HEARS_RESULTS;
      const payload = { userId, questionId };
      const action = { type, payload };
      store.dispatch(action);
      context.reply(reply, { parse_mode: 'HTML' });
    };
  }

  return {
    startHandler,
    commandNewHandler,
    hearsCancelHandler,
    hearsDoneHandler,
    hearsResultsHandler,
  };
}

module.exports = botHandlers;
