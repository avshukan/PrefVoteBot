// https://medium.com/devschacht/jakob-lind-learn-redux-by-coding-a-mini-redux-d1a58e830514
// https://medium.com/devschacht/jakob-lind-code-your-own-redux-part-2-the-connect-function-d941dc247c58
// https://habr.com/ru/post/439104/
// https://habr.com/ru/post/328152/

'use strict';
const { Markup } = require('telegraf');
const {
  ACTION_CREATE_VOTE,
  ACTION_CAST_VOTE,
  ACTION_HEARS_CANCEL,
  ACTION_HEARS_DONE,
  ACTION_HEARS_RESULTS,
} = require('./action_types');
const {
  STATE_DEFAULT,
  STATE_CREATE_HEADER,
  STATE_CREATE_TEXT,
  STATE_CREATE_OPTION,
  STATE_ANSWER
} = require('./state_types');
const createDBStorage = require('./storage');
const storage = createDBStorage();

function botReducer(state = {}, action) {
  let handler = () => { };
  switch (action.type) {
    case ACTION_CAST_VOTE: {
      const {
        userId,
        questionId,
        header,
        text,
        options,
        optionsSelected,
        mid,
        reply,
        voteMessageId,
      } = action.payload;
      console.log('VOTE action', action);
      state[userId] = {
        id: userId,
        questionId,
        command: 'vote',
        subCommand: '',
        header,
        text,
        options,
        optionsSelected,
        mid,
        reply,
        voteMessageId,
      };
      return state;
    }


    case ACTION_CREATE_VOTE: {
      const { userId, command, subCommand, reply } = action.payload;
      state[userId] = { id: userId, command, subCommand, reply };
      return state;
    }


    // case 'HEARS CANCEL': {
    //   const { userId, reply } = action.payload;
    //   state[userId] = { id: userId, command: null, reply };
    //   return state;
    // }


    case ACTION_HEARS_CANCEL: {
      const { userId, reply } = action.payload;
      state[userId] = { id: userId, command: null, reply };
      return state;
    }


    // case 'HEARS DONE': {
    //   const { userId, questionId, header, text, options, reply } = action.payload;
    //   state[userId] = { id: userId, command: null, questionId, header, text, options, reply };
    //   return state;
    // }


    case ACTION_HEARS_DONE: {
      const { userId, questionId, header, text, options, reply } = action.payload;
      state[userId] = { id: userId, command: null, questionId, header, text, options, reply };
      return state;
    }


    // case 'HEARS RESULTS': {
    //   const { userId, questionId } = action.payload;
    //   state[userId] = { id: userId, command: null, questionId };
    //   return state;
    // }


    case ACTION_HEARS_RESULTS: {
      const { userId, questionId } = action.payload;
      state[userId] = { id: userId, command: null, questionId };
      return state;
    }


    case 'NEW MESSAGE':
      handler = async function(context) {
        console.log('onText start state', state);
        const userId = context.message.from.id;
        const text = context.message.text;

        if (!state[userId])
          state[userId] = { id: userId };
        state[userId].index = 0;

        console.log('onText middle state', state);

        if (state[userId].command === 'new') {
          switch (state[userId].subCommand) {
            case 'header':
              state[userId].header = text.substr(0, 63);
              state[userId].subCommand = 'question';
              context.replyWithMarkdown('Отправьте текст вопроса', Markup
                .keyboard(['❌ Cancel'])
                .oneTime()
                .resize(),
              );
              break;
            case 'question':
              state[userId].text = text.substr(0, 255); ;
              state[userId].options = [];
              state[userId].subCommand = 'option';
              context.replyWithMarkdown('Отправьте вариант ответа', Markup
                .keyboard(['❌ Cancel'])
                .oneTime()
                .resize(),
              );
              break;
            case 'option':
              state[userId].options.push(text.substr(0, 100));
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
            const text = 'Простите, такого значения нет в списке вариантов\n'
              + `<b>${state[userId].header}</b>\n`
              + `${state[userId].text}`;
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
              let text = `${state[userId].header}\n${state[userId].text}\nВы уже выбрали:`;
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
              await storage.saveRanks({
                userId: userId,
                options: state[userId].optionsSelected,
              });
              await storage.saveStatus({
                userId: state[userId].id,
                questionId: state[userId].questionId,
                status: 'ANSWERED',
              });

              let text = `Вы завершили опрос * ${state[userId].header} * \nВаш выбор:`;
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
      };
      return { updatedState: state, handler };

    default:
      return state;
  }
}

module.exports = botReducer;
