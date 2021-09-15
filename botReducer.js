const { ACTIONS } = require('./action_types');
const { STATES } = require('./state_types');
const { BUTTONS } = require('./button_types');
const { COMMANDS } = require('./command_types');

const { DEEPLINK_TOKEN } = process.env;
const MOCK_MESSAGE = 'Данный функционал находится в разработке';
const ERROR_MESSAGE = 'Извините, произошла ошибка. Что-то пошло не так...';

function botReducer(state, action) {
  const newState = { ...state };

  switch (action.type) {
    case ACTIONS.CREATE_VOTE: {
      const { userId } = action.payload;
      newState[userId] = { ...state[userId] };
      const questionState = (state[userId] === undefined) ? {} : { ...state[userId][0] };
      newState[userId][0] = {
        ...questionState,
        type: STATES.CREATE_HEADER,
        reply: 'Отправьте заголовок опроса',
        buttons: [BUTTONS.CANCEL],
      };
      return newState;
    }

    case ACTIONS.CREATE_HEADER: {
      const {
        userId, questionId, header, userMessageId,
      } = action.payload;
      const reply = `Создание опроса\n\nЗаголовок: <b>${header}</b>\n\n`
        + 'Отправьте текст вопроса';
      newState[userId] = {
        ...state[userId],
        // userId,
        // id: userId,
        clearMessagesQueue: [...(state[userId].clearMessagesQueue || []), userMessageId],
      };
      const questionState = (state[userId] === undefined) ? {} : { ...state[userId][0] };
      newState[userId][0] = {
        ...questionState,
        type: STATES.CREATE_TEXT,
        questionId,
        header,
        reply,
        buttons: [BUTTONS.CANCEL],
      };
      return newState;
    }

    case ACTIONS.CREATE_TEXT: {
      const {
        userId, questionId, text, userMessageId,
      } = action.payload;
      const reply = `Создание опроса\n\nЗаголовок: <b>${state[userId][questionId].header}</b>\n`
        + `Вопрос: ${text}\n\n`
        + 'Отправьте вариант ответа';
      newState[userId] = {
        ...state[userId],
        // userId,
        // id: userId,
        clearMessagesQueue: [...(state[userId].clearMessagesQueue || []), userMessageId],
      };
      const questionState = (state[userId] === undefined) ? {} : { ...state[userId][0] };
      newState[userId][0] = {
        ...questionState,
        type: STATES.CREATE_OPTION,
        text,
        options: [],
        reply,
        buttons: [BUTTONS.CANCEL],
      };
      return newState;
    }

    case ACTIONS.CREATE_OPTION: {
      const {
        userId, questionId = 0, option, userMessageId,
      } = action.payload;
      const questionState = (state[userId] === undefined) ? {} : { ...state[userId][questionId] };
      const options = [...(questionState.options || []), option];
      const defaultReply = `Создание опроса\n\nЗаголовок: <b>${questionState.header}</b>\n`
        + `Вопрос: ${questionState.text}\n`
        + 'Варианты ответов:';
      const reply = options.reduce((acc, item) => `${acc}\n - ${item}`, defaultReply);
      const buttons = (options.length > 1) ? [BUTTONS.DONE, BUTTONS.CANCEL] : [BUTTONS.CANCEL];
      newState[userId] = {
        ...state[userId],
        clearMessagesQueue: [...(state[userId].clearMessagesQueue || []), userMessageId],
      };
      newState[userId][questionId] = {
        ...questionState,
        type: STATES.CREATE_OPTION,
        options,
        reply: `${reply}\n\nОтправьте вариант ответа`,
        buttons,
      };
      return newState;
    }

    case ACTIONS.CAST_VOTE: {
      const {
        userId,
        questionId,
        header,
        text,
        options = [],
      } = action.payload;
      const reply = `<b>${header}</b>\n${text}`;
      // const buttons = [
      //   ...options.map((option) => option.Name),
      //   BUTTONS.HINT,
      //   BUTTONS.CANCEL,
      //   BUTTONS.SKIP,
      // ];
      const buttons = [...options, BUTTONS.HINT, BUTTONS.CANCEL, BUTTONS.SKIP];
      newState[userId] = { ...state[userId] };
      const questionState = (state[userId] === undefined) ? {} : { ...state[userId][questionId] };
      newState[userId][questionId] = {
        ...questionState,
        type: STATES.ANSWER,
        header,
        text,
        options,
        optionsSelected: [],
        reply,
        buttons,
      };
      return newState;
    }

    case ACTIONS.GET_OPTION: {
      const {
        userId,
        questionId,
        options,
        optionsSelected,
      } = action.payload;
      const { header, text } = state[userId][questionId];
      let reply;
      let buttons;
      if (options.length === 0) {
        reply = `Вы завершили опрос <b>${header}</b> \nВаш выбор:`;
        optionsSelected.forEach((option, index) => {
          reply += `\n${index + 1}. ${option.name}`;
        });
        buttons = [BUTTONS.RESULTS];
      } else {
        reply = `<b>${header}</b>\n${text}\nВы уже выбрали:`;
        optionsSelected.forEach((option, index) => {
          reply += `\n${index + 1}. ${option.name}`;
        });
        buttons = [...options, BUTTONS.HINT, BUTTONS.CANCEL];
        if (optionsSelected.length > 0) buttons.push(BUTTONS.COMPLETE);
        buttons.push(BUTTONS.SKIP);
      }
      newState[userId] = { ...state[userId] };
      const questionState = (state[userId] === undefined) ? {} : { ...state[userId][questionId] };
      newState[userId][questionId] = {
        ...questionState,
        type: STATES.ANSWER,
        options,
        optionsSelected,
        reply,
        buttons,
      };
      return newState;
    }

    case ACTIONS.GET_WRONG_OPTION: {
      // questionId]; ?!
      const { userId, questionId, answer } = action.payload;
      const {
        header, text, options, optionsSelected,
      } = state[userId];
      // } = state[userId][questionId]; ?!
      const isOptionFound = optionsSelected.findIndex((item) => item.Name === answer) === -1;
      const errorExplaination = isOptionFound
        ? `значения "<b>${answer}</b>" нет в списке вариантов`
        : `значение "<b>${answer}</b>" уже было выбрано вами`;
      const defaultReply = `Простите, ${errorExplaination}<b>\n`
        + `${header}</b>\n`
        + `${text}${optionsSelected.length === 0 ? '' : '\nВы уже выбрали:'}`;
      const reply = optionsSelected.reduce((acc, selectedOption, index) => `${acc}\n${index + 1}. ${selectedOption.Name}`, defaultReply);
      const buttons = [...options.map((option) => option.Name), BUTTONS.CANCEL];
      newState[userId] = { ...state[userId] };
      const questionState = (state[userId] === undefined) ? {} : { ...state[userId][questionId] };
      newState[userId][questionId] = {
        ...questionState,
        type: STATES.ANSWER,
        reply,
        buttons,
      };
      return newState;
    }

    case ACTIONS.SKIP: {
      const { userId, questionId } = action.payload;
      const reply = 'Вы уверены, что хотите пропустить опрос и ознакомиться с результатами?\n'
        + 'Увидев результаты, вы утратите возможность пройти опрос.\n';
      newState[userId] = { ...state[userId] };
      const questionState = (state[userId] === undefined) ? {} : { ...state[userId][questionId] };
      newState[userId][questionId] = {
        ...questionState,
        type: STATES.SKIP,
        reply,
        buttons: [BUTTONS.SKIP_APPROVE, BUTTONS.SKIP_ABORT],
      };
      return newState;
    }

    case ACTIONS.HEARS_CANCEL: {
      const { userId, questionId } = action.payload;
      let reply;
      switch (state[userId] && state[userId].type) {
        case STATES.CREATE_HEADER:
        case STATES.CREATE_TEXT:
        case STATES.CREATE_OPTION:
          reply = 'Создание опроса отменено';
          break;
        case STATES.ANSWER:
          reply = `Участие в опросе прервано.\nВы можете возобновить участие в опросе по ссылке\n${DEEPLINK_TOKEN}start=${questionId}`;
          break;
        default:
          reply = 'Действие отменено';
      }
      newState[userId] = { ...state[userId] };
      const questionState = (state[userId] === undefined) ? {} : { ...state[userId][questionId] };
      newState[userId][questionId] = {
        ...questionState,
        type: STATES.DEFAULT,
        reply,
        buttons: [],
      };
      return newState;
    }

    case ACTIONS.HEARS_COMPLETE: {
      const {
        userId,
        questionId,
        options,
        optionsSelected,
      } = action.payload;
      const { header } = state[userId][questionId];
      let reply = `Вы завершили опрос <b>${header}</b> \nВаш выбор:`;
      optionsSelected.forEach((option, index) => {
        reply += `\n${index + 1}. ${option.name}`;
      });
      const counterFrom = optionsSelected.length + 1;
      const counterTo = optionsSelected.length + options.length;
      options.forEach((option) => {
        reply += `\n${counterFrom}-${counterTo}. ${option.name}`;
      });
      const buttons = [BUTTONS.RESULTS];
      newState[userId] = { ...state[userId] };
      const questionState = (state[userId] === undefined) ? {} : { ...state[userId][questionId] };
      newState[userId][questionId] = {
        ...questionState,
        type: STATES.DEFAULT,
        options,
        optionsSelected,
        reply,
        buttons,
      };
      return newState;
    }

    case ACTIONS.HEARS_DONE: {
      const {
        userId, questionId, header, text, options,
      } = action.payload;
      const reply = `Опрос <b>${header}</b> сформирован!\n`
        + 'Принять участие можно по ссылке\n'
        + `${DEEPLINK_TOKEN}start=${questionId}`;
      newState[userId] = { ...state[userId] };
      const questionState = (state[userId] === undefined) ? {} : { ...state[userId][questionId] };
      newState[userId][questionId] = {
        ...questionState,
        type: STATES.DEFAULT,
        questionId,
        header,
        text,
        options,
        reply,
        buttons: [],
      };
      return newState;
    }

    case ACTIONS.HEARS_RESULTS: {
      // console.log('action.payload', action.payload);
      const { userId, questionId, result } = action.payload;
      newState[userId] = { ...state[userId] };
      const questionState = (state[userId] === undefined) ? {} : { ...state[userId][questionId] };
      newState[userId][questionId] = {
        ...questionState,
        type: STATES.DEFAULT,
        reply: result,
        buttons: [BUTTONS.RESULTS_MINE],
      };
      // console.log('newState[userId][questionId]', newState[userId][questionId]);
      // console.log('newState', newState);
      return newState;
    }

    case ACTIONS.APPEND_MESSAGE_TO_QUEUE: {
      const { userId, messageId } = action.payload;
      newState[userId] = {
        ...state[userId],
        clearMessagesQueue: [...(state[userId].clearMessagesQueue || []), messageId],
      };
      return newState;
    }

    case ACTIONS.REMOVE_MESSAGE_FROM_QUEUE: {
      const { userId } = action.payload;
      newState[userId] = {
        ...state[userId],
        clearMessagesQueue: [],
      };
      return newState;
    }

    case ACTIONS.SHOW_ABOUT: {
      const { userId } = action.payload;
      const questionId = 0;
      newState[userId] = { ...state[userId] };
      const questionState = (state[userId] === undefined) ? {} : { ...state[userId][questionId] };
      newState[userId][questionId] = {
        ...questionState,
        type: STATES.DEFAULT,
        reply:
          'В преференциальной системе участник голосования выбирает не один вариант ответа, а расставляет их в порядке приоритета, сначала начиная с наиболее предпочтительного варианта.\n'
          + 'Для подведения итогов ботом используется метод подсчёта, разработанный Маркусом Шульце.\n\n'
          + 'https://ru.wikipedia.org/wiki/Преференциальное_голосование\n'
          + 'https://ru.wikipedia.org/wiki/Метод_Шульце',
        buttons: [BUTTONS.NEW],
      };
      return newState;
    }

    case ACTIONS.GET_QUESTIONS_LIST: {
      const { userId, questions = [], command } = action.payload;
      const questionId = 0;
      let replyHeader;
      switch (command) {
        case COMMANDS.CREATEDBYME:
          replyHeader = 'Последние 10 опросов, созданных Вами:';
          break;
        case COMMANDS.POPULAR:
          replyHeader = '10 самых популярных опросов:';
          break;
        case COMMANDS.VOTEDBYME:
          replyHeader = 'Последние 10 опросов с Вашим участием:';
          break;
        case COMMANDS.FIND:
          replyHeader = questions.length === 0
            ? 'Подходящие опросы не найдены'
            : '10 опросов, подходящие под условия поиска:';
          break;
        default:
          replyHeader = 'Список найденных опросов:';
      }
      const reply = questions.reduce((acc, item, index) => ((index < 10)
        ? `${`${acc}\n\n`
        + `${index + 1}. <b>${item.header}</b>\n`
        + `${item.text}\n`}${item.voters ? `Количество участников: ${item.voters}\n` : ''
        }${DEEPLINK_TOKEN}start=${item.id}`
        : acc), replyHeader);
      newState[userId] = { ...state[userId] };
      const questionState = (state[userId] === undefined) ? {} : { ...state[userId][questionId] };
      newState[userId][questionId] = {
        ...questionState,
        type: STATES.DEFAULT,
        reply,
        buttons: [],
      };
      return newState;
    }

    case ACTIONS.ERROR: {
      const { userId, questionId, error } = action.payload;
      newState[userId] = { ...state[userId] };
      const questionState = (state[userId] === undefined) ? {} : { ...state[userId][questionId] };
      newState[userId][questionId] = {
        ...questionState,
        type: STATES.DEFAULT,
        reply: (error && error.message) || ERROR_MESSAGE,
        buttons: [BUTTONS.NEW],
      };
      return newState;
    }

    case ACTIONS.MOCK: {
      const { userId, questionId } = action.payload;
      newState[userId] = { ...state[userId] };
      const questionState = (state[userId] === undefined) ? {} : { ...state[userId][questionId] };
      newState[userId][questionId] = {
        ...questionState,
        type: STATES.DEFAULT,
        reply: MOCK_MESSAGE,
        buttons: [BUTTONS.NEW],
      };
      return newState;
    }

    default:
      return newState;
  }
}

module.exports = botReducer;
