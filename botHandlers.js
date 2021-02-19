'use strict';

const {
  ACTION_CREATE_VOTE,
  ACTION_CREATE_HEADER,
  ACTION_CREATE_TEXT,
  ACTION_CREATE_OPTION,
  ACTION_CAST_VOTE,
  ACTION_HEARS_CANCEL,
  ACTION_HEARS_DONE,
  ACTION_HEARS_RESULTS
} = require('./action_types');
const {
  STATE_DEFAULT,
  STATE_CREATE_HEADER,
  STATE_CREATE_TEXT,
  STATE_CREATE_OPTION,
  STATE_ANSWER
} = require('./state_types');
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
        console.log('context.startPayload === \'\' => return;');
        console.log('Здесь должно быть какое-о приветственное сообщение');
        const reply = 'Здесь должно быть какое-о приветственное сообщение';
        context.replyWithMarkdown(reply);
        return;
      }
      const questionId = parseInt(context.startPayload, 10);
      const status = await storage.getQuestionStatus(questionId, userId);
      if (status === 'ANSWERED') {
        const type = ACTION_HEARS_RESULTS;
        const payload = { userId, questionId };
        const action = { type, payload };
        store.dispatch(action);
        hearsResultsHandler()(context);
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
        const type = ACTION_CAST_VOTE;
        const payload = {
          userId,
          questionId,
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
      const type = ACTION_CREATE_VOTE;
      const payload = {
        userId,
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
      const { type } = userState;
      let reply = '-';
      switch (type) {
        case STATE_CREATE_HEADER:
        case STATE_CREATE_TEXT:
        case STATE_CREATE_OPTION:
          reply = 'Создание опроса отменено!';
          break;
        case STATE_ANSWER:
          reply = 'Участие в опросе прервано!';
          break;
      };
      // const type = ACTION_HEARS_CANCEL;
      const payload = { userId, reply };
      const action = { type: ACTION_HEARS_CANCEL, payload };
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

  function onTextHandler() {
    return async function(context) {
      const userId = context.message.from.id;
      const userState = store.getUserState(userId);
      const { questionId, type } = userState;
      const info = context.message.text;
      switch (type) {
        case STATE_CREATE_HEADER: {
          const header = info.substr(0, 63);
          const reply = 'Отправьте текст вопроса';
          const type = ACTION_CREATE_HEADER;
          const payload = { userId, questionId, header, reply };
          const action = { type, payload };
          store.dispatch(action);
          context.reply(reply, {
            parse_mode: 'HTML',
            ...Markup
              .keyboard(['❌ Cancel'])
              .oneTime()
              .resize(),
          });
          break;
        }

        case STATE_CREATE_TEXT: {
          const text = info.substr(0, 255);
          const reply = 'Отправьте вариант ответа';
          const type = ACTION_CREATE_TEXT;
          const payload = { userId, questionId, text, reply };
          const action = { type, payload };
          store.dispatch(action);
          context.reply(reply, {
            parse_mode: 'HTML',
            ...Markup
              .keyboard(['❌ Cancel'])
              .oneTime()
              .resize(),
          });
          break;
        }

        case STATE_CREATE_OPTION: {
          const option = info.substr(0, 100);
          const reply = 'Отправьте <b>вариант</b> ответа';
          const type = ACTION_CREATE_OPTION;
          const payload = { userId, questionId, option, reply };
          const action = { type, payload };
          store.dispatch(action);
          const extraReply = Markup
              .keyboard([['✔️ Done', '❌ Cancel']])
              .oneTime()
              .resize();
          extraReply.parse_mode = 'HTML';
          context.reply(reply, extraReply);
          break;
        }

        case STATE_ANSWER: {
          const { header, text, options, clear_messages_queue } = userState;
          const optionIndex = options.findIndex(option => option.Name === info);
          console.log('onText optionIndex', optionIndex);
          if (optionIndex === -1) {
            const reply = `Простите, значения <b>${info}</b> в списке вариантов\n`
              + `<b>${header}</b>\n`
              + `${text}`;
            const buttons = options.map(option => [option.Name]);
            const mid = await context.reply(reply, {
              parse_mode: 'HTML',
              ...Markup
                .keyboard([...buttons.map(button => [button]), ['❌ Cancel']])
                .oneTime()
                .resize(),
            });
            // const type = ACTION_CAST_VOTE;
            // const payload = { userId, questionId, mid, reply };
            // const action = { type, payload };
            // store.dispatch(action);
            // state[userId].mid.push(mid);
          } else {
            const { header, text, options, optionsSelected } = userState;
            const selectedOption = options.splice(optionIndex, 1);
            optionsSelected.push(...selectedOption);
            const type = ACTION_CAST_VOTE;
            const payload = { userId, questionId, info, options, optionsSelected };
            const action = { type, payload };
            store.dispatch(action);
            if (options.length > 1) {
              const buttons = options.map(option => option.Name);
              console.log('id', context.message.message_id);
              // await context.deleteMessage(context.message.message_id);
              // const del = await context.deleteMessage(state[userId].voteMessageId.message_id);
              let reply = `${header}\n${text}\nВы уже выбрали:`;
              optionsSelected.forEach((option, index) => {
                reply += `\n${index + 1}. ${option.Name}`;
              });
              const mid = await context.reply(reply, {
                parse_mode: 'HTML',
                ...Markup
                  .keyboard([...buttons.map(button => [button]), ['❌ Cancel']])
                  .oneTime()
                  .resize(),
              });
              // state[userId].voteMessageId = mid;
              // state[userId].mid.push(mid);
            } else {
              const selectedOption = options.pop();
              console.log('last option', selectedOption);
              optionsSelected.push(selectedOption);
              await storage.saveRanks({
                userId: userId,
                options: optionsSelected,
              });
              await storage.saveStatus({
                userId,
                questionId,
                status: 'ANSWERED',
              });

              let reply = `Вы завершили опрос * ${header} * \nВаш выбор:`;
              optionsSelected.forEach((option, index) => {
                reply += `\n${index + 1}. ${option.Name}`;
              });
              context.reply(reply, {
                parse_mode: 'HTML',
                ...Markup
                  .keyboard([['👁 Results']])
                  .oneTime()
                  .resize(),
              });
            }
          }
        }

      }
    };
  }

  return {
    startHandler,
    commandNewHandler,
    hearsCancelHandler,
    hearsDoneHandler,
    hearsResultsHandler,
    onTextHandler
  };
}

module.exports = botHandlers;
