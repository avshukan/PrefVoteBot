// https://medium.com/devschacht/jakob-lind-learn-redux-by-coding-a-mini-redux-d1a58e830514
// https://medium.com/devschacht/jakob-lind-code-your-own-redux-part-2-the-connect-function-d941dc247c58
// https://habr.com/ru/post/439104/
// https://habr.com/ru/post/328152/

'use strict';
const { method } = require('./method');
const { Markup } = require('telegraf');
const createDBStorage = require('./storage');
const storage = createDBStorage();

function botReducer(state = {}, action) {
  let handler = () => { };
  switch (action.type) {
    case 'START':
      handler = async function (context) {
        const userId = context.message.from.id;
        if (!state[userId])
          state[userId] = { id: userId };
        if (context.startPayload === '') {
          return;
        }
        const questionId = parseInt(context.startPayload);
        state[userId].questionId = questionId;
        const status = await storage.getQuestionStatus(questionId, state[userId].id);
        if (status === 'ANSWERED') {
          botReducer(state, { type: 'HEARS RESULTS' }).handler(context);
        } else {
          state[userId].command = 'vote';
          state[userId].subCommand = '';
        }

        if (state[userId].command === 'vote') {
          const questionWithOptions = await storage.getQuestionWithOptions(questionId);
          state[userId].header = questionWithOptions.header;
          state[userId].text = questionWithOptions.text;
          state[userId].options = questionWithOptions.options;
          state[userId].optionsSelected = [];
          state[userId].mid = [];
          const text = `${state[userId].header}\n${state[userId].text}`;
          const buttons = state[userId].options.map(option => option.Name);
          const voteMessageId = await context.replyWithMarkdown(text, Markup
            .keyboard([...buttons.map(button => [button]), ['❌ Cancel']])
            .oneTime()
            .resize(),
          );
          state[userId].voteMessageId = voteMessageId;
        }
      }
      return { updatedState: state, handler };

    case 'NEW COMMAND':
      handler = function (context) {
        const userId = context.message.from.id;
        if (!state[userId])
          state[userId] = { id: userId };
        state[userId].command = 'new';
        state[userId].subCommand = 'header';
        return context.replyWithMarkdown('Отправьте заголовок опроса', Markup
          .keyboard(['❌ Cancel'])
          .oneTime()
          .resize(),
        );
      }
      return { updatedState: state, handler };



    case 'HEARS DONE': {
      const { userId, questionId, header, text, options, reply } = action.payload;
      state[userId] = { id: userId, command: null, questionId, header, text, options, reply };
      return state;
    }


    case 'HEARS RESULT 2': {
      const { userId, questionId } = action.payload;
      state[userId] = { id: userId, command: null, questionId };
      return state;
    }


    case 'HEARS RESULTS':
      handler = async function (context) {
        console.log('state', state);
        const userId = context.message.from.id;
        if (!state[userId])
          state[userId] = { id: userId };
        state[userId].command = null;

        const questionId = state[userId].questionId;
        const optrows = await storage.getOptions(questionId);
        const optionsList = optrows.map(item => item.Id);
        const rows = await storage.getRanks(questionId)
        const optionsRating = method(optionsList, rows)
        const optionsResult = optionsRating
          .sort((item1, item2) => item1.place - item2.place)
          .map(item => {
            const position = (item.count === 1)
              ? (item.place + 1)
              : `${item.place + 1}-${item.place + item.count}`;
            const name = optrows.filter(row => row.Id === item.id)[0].Name;
            return `${position}. ${name}`;
          })
        let replyText = '<b>Результаты опроса</b>:\n';
        optionsResult.forEach(option => replyText += `${option}\n`);
        context.reply(replyText, {
          parse_mode: 'HTML',
          ...Markup
            .keyboard([['/new']])
            .resize()
        });
      }
      return { updatedState: state, handler };

    case 'HEARS CANCEL':
      handler = function (context) {
        const userId = context.message.from.id;
        if (!state[userId])
          state[userId] = { id: userId };
        let replyText = '-';
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
      return { updatedState: state, handler };

    case 'NEW MESSAGE':
      handler = async function (context) {
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
              state[userId].text = text.substr(0, 255);;
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
            const text = `Простите, такого значения нет в списке вариантов\n** ${state[userId].header} **\n${state[userId].text}`;
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
                options: state[userId].optionsSelected
              })
              await storage.saveStatus({
                userId: state[userId].id,
                questionId: state[userId].questionId,
                status: 'ANSWERED'
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
      }
      return { updatedState: state, handler };

    default:
      return state;
  }
}

module.exports = botReducer;
