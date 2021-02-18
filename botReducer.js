// https://medium.com/devschacht/jakob-lind-learn-redux-by-coding-a-mini-redux-d1a58e830514
// https://medium.com/devschacht/jakob-lind-code-your-own-redux-part-2-the-connect-function-d941dc247c58
// https://habr.com/ru/post/439104/
// https://habr.com/ru/post/328152/

'use strict';
const { Markup } = require('telegraf');
const createDBStorage = require('./storage');
const storage = createDBStorage();

function botReducer(state = {}, action) {
  let handler = () => { };
  switch (action.type) {
    case 'VOTE' : {
      const {
        userId,
        questionId,
        header,
        text,
        options,
        optionsSelected,
        mid,
        reply,
        voteMessageId
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
        voteMessageId
      };
      return state;
    }


    // case 'START':
    //   handler = async function(context) {
    //     const userId = context.message.from.id;
    //     if (!state[userId])
    //       state[userId] = { id: userId };
    //     if (context.startPayload === '') {
    //       return;
    //     }
    //     const questionId = parseInt(context.startPayload, 10);
    //     state[userId].questionId = questionId;
    //     const status = await storage.getQuestionStatus(questionId, state[userId].id);
    //     if (status === 'ANSWERED') {
    //       botReducer(state, { type: 'HEARS RESULTS' }).handler(context);
    //     } else {
    //       state[userId].command = 'vote';
    //       state[userId].subCommand = '';
    //     }

    //     if (state[userId].command === 'vote') {
    //       const questionWithOptions = await storage.getQuestionWithOptions(questionId);
    //       state[userId].header = questionWithOptions.header;
    //       state[userId].text = questionWithOptions.text;
    //       state[userId].options = questionWithOptions.options;
    //       state[userId].optionsSelected = [];
    //       state[userId].mid = [];
    //       const text = `${state[userId].header}\n${state[userId].text}`;
    //       const buttons = state[userId].options.map(option => option.Name);
    //       const voteMessageId = await context.replyWithMarkdown(text, Markup
    //         .keyboard([...buttons.map(button => [button]), ['❌ Cancel']])
    //         .oneTime()
    //         .resize(),
    //       );
    //       state[userId].voteMessageId = voteMessageId;
    //     }
    //   };
    //   return { updatedState: state, handler };


    case 'NEW COMMAND': {
      const { userId, command, subCommand, reply } = action.payload;
      state[userId] = { id: userId, command, subCommand, reply };
      return state;
    }


    case 'HEARS CANCEL': {
      const { userId, reply } = action.payload;
      state[userId] = { id: userId, command: null, reply };
      return state;
    }


    case 'HEARS DONE': {
      const { userId, questionId, header, text, options, reply } = action.payload;
      state[userId] = { id: userId, command: null, questionId, header, text, options, reply };
      return state;
    }


    case 'HEARS RESULT': {
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
