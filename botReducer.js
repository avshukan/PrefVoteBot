const { ACTIONS } = require('./action_types');
const { STATES } = require('./state_types');
const { BUTTONS } = require('./button_types');
const { COMMANDS } = require('./command_types');

const { DEEPLINK_TOKEN } = process.env;
const MOCK_MESSAGE = 'Данный функционал находится в разработке';
const ERROR_MESSAGE = 'Извините, произошла ошибка. Что-то пошло не так...';

function botReducer(state, action) {
  switch (action.type) {
    case ACTIONS.CREATE_VOTE: {
      const { userId } = action.payload;
      const newState = { ...state };
      newState[userId] = {
        ...state[userId],
        userId,
        id: userId,
        type: STATES.CREATE_HEADER,
        reply: 'Отправьте заголовок опроса',
        buttons: [BUTTONS.CANCEL],
      };
      return newState;
    }

    case ACTIONS.CREATE_HEADER: {
      const newState = { ...state };
      const {
        userId, questionId, header, userMessageId,
      } = action.payload;
      const reply = `Заголовок: <b>${header}</b>\n\n`
        + 'Отправьте текст вопроса';
      newState[userId] = {
        ...state[userId],
        userId,
        id: userId,
        type: STATES.CREATE_TEXT,
        questionId,
        header,
        clearMessagesQueue: [...(state[userId].clearMessagesQueue || []), userMessageId],
        reply,
        buttons: [BUTTONS.CANCEL],
      };
      return newState;
    }

    case ACTIONS.CREATE_TEXT: {
      const newState = { ...state };
      const { userId, text, userMessageId } = action.payload;
      const reply = `Заголовок: <b>${state[userId].header}</b>\n`
        + `Вопрос: ${text}\n\n`
        + 'Отправьте вариант ответа';
      newState[userId] = {
        ...state[userId],
        userId,
        id: userId,
        type: STATES.CREATE_OPTION,
        text,
        options: [],
        clearMessagesQueue: [...(state[userId].clearMessagesQueue || []), userMessageId],
        reply,
        buttons: [BUTTONS.CANCEL],
      };
      return newState;
    }

    case ACTIONS.CREATE_OPTION: {
      const newState = { ...state };
      const { userId, option, userMessageId } = action.payload;
      const options = [...(state[userId].options || []), option];
      const defaultReply = `Заголовок: <b>${state[userId].header}</b>\n`
        + `Вопрос: ${state[userId].text}\n`
        + 'Варианты ответов:';
      const reply = options.reduce((acc, item) => `${acc}\n - ${item}`, defaultReply);
      const buttons = (options.length > 1) ? [BUTTONS.DONE, BUTTONS.CANCEL] : [BUTTONS.CANCEL];
      newState[userId] = {
        ...state[userId],
        userId,
        id: userId,
        type: STATES.CREATE_OPTION,
        options,
        clearMessagesQueue: [...(state[userId].clearMessagesQueue || []), userMessageId],
        reply: `${reply}\n\nОтправьте вариант ответа`,
        buttons,
      };
      return newState;
    }

    case ACTIONS.CAST_VOTE: {
      const newState = { ...state };
      const {
        userId,
        questionId,
        header,
        text,
        options,
      } = action.payload;
      const reply = `<b>${header}</b>\n${text}`;
      const buttons = [...options.map((option) => option.Name), BUTTONS.CANCEL];
      newState[userId] = {
        ...state[userId],
        userId,
        id: userId,
        type: STATES.ANSWER,
        questionId,
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
      const newState = { ...state };
      const {
        userId,
        options,
        optionsSelected,
      } = action.payload;
      const { header, text } = state[userId];
      let reply;
      let buttons;
      if (options.length === 0) {
        reply = `Вы завершили опрос <b>${header}</b> \nВаш выбор:`;
        optionsSelected.forEach((option, index) => {
          reply += `\n${index + 1}. ${option.Name}`;
        });
        buttons = ['👁 Results'];
      } else {
        reply = `<b>${header}</b>\n${text}\nВы уже выбрали:`;
        optionsSelected.forEach((option, index) => {
          reply += `\n${index + 1}. ${option.Name}`;
        });
        buttons = [...options.map((option) => option.Name), BUTTONS.CANCEL];
      }
      newState[userId] = {
        ...state[userId],
        userId,
        id: userId,
        type: STATES.ANSWER,
        options,
        optionsSelected,
        reply,
        buttons,
      };
      return newState;
    }

    case ACTIONS.GET_WRONG_OPTION: {
      const newState = { ...state };
      const { userId, answer } = action.payload;
      const {
        header, text, options, optionsSelected,
      } = state[userId];
      const isOptionFound = optionsSelected.findIndex((item) => item.Name === answer) === -1;
      const errorExplaination = isOptionFound
        ? `значения "<b>${answer}</b>" нет в списке вариантов`
        : `значение "<b>${answer}</b>" уже было выбрано вами`;
      const defaultReply = `Простите, ${errorExplaination}<b>\n`
        + `${header}</b>\n`
        + `${text}${optionsSelected.length === 0 ? '' : '\nВы уже выбрали:'}`;
      const reply = optionsSelected.reduce((acc, selectedOption, index) => `${acc}\n${index + 1}. ${selectedOption.Name}`, defaultReply);
      const buttons = [...options.map((option) => option.Name), BUTTONS.CANCEL];
      newState[userId] = {
        ...state[userId],
        userId,
        type: STATES.ANSWER,
        reply,
        buttons,
      };
      return newState;
    }

    case ACTIONS.HEARS_CANCEL: {
      const newState = { ...state };
      const { userId } = action.payload;
      let reply;
      switch (state[userId] && state[userId].type) {
        case STATES.CREATE_HEADER:
        case STATES.CREATE_TEXT:
        case STATES.CREATE_OPTION:
          reply = 'Создание опроса отменено';
          break;
        case STATES.ANSWER:
          reply = 'Участие в опросе прервано';
          break;
        default:
          reply = 'Действие отменено';
      }
      newState[userId] = {
        ...state[userId],
        userId,
        id: userId,
        type: STATES.DEFAULT,
        reply,
        buttons: [BUTTONS.NEW],
      };
      return newState;
    }

    case ACTIONS.HEARS_DONE: {
      const newState = { ...state };
      const {
        userId, questionId, header, text, options,
      } = action.payload;
      const reply = `Опрос <b>${header}</b> сформирован!\n`
        + 'Принять участие можно по ссылке\n'
        + `${DEEPLINK_TOKEN}start=${questionId}`;
      newState[userId] = {
        ...state[userId],
        userId,
        id: userId,
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
      const newState = { ...state };
      const { userId, questionId, result } = action.payload;
      newState[userId] = {
        ...state[userId],
        userId,
        id: userId,
        type: STATES.DEFAULT,
        questionId,
        reply: result,
        buttons: [],
      };
      return newState;
    }

    case ACTIONS.APPEND_MESSAGE_TO_QUEUE: {
      const newState = { ...state };
      const { userId, messageId } = action.payload;
      newState[userId] = {
        ...state[userId],
        clearMessagesQueue: [...(state[userId].clearMessagesQueue || []), messageId],
      };
      return newState;
    }

    case ACTIONS.REMOVE_MESSAGE_FROM_QUEUE: {
      const newState = { ...state };
      const { userId } = action.payload;
      newState[userId] = {
        ...state[userId],
        clearMessagesQueue: [],
      };
      return newState;
    }

    case ACTIONS.SHOW_ABOUT: {
      const newState = { ...state };
      const { userId } = action.payload;
      newState[userId] = {
        ...state[userId],
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
        default:
          replyHeader = 'Список найденных опросов:';
      }
      const reply = questions.reduce((acc, item, index) => ((index < 10)
        ? `${`${acc}\n\n`
        + `${index + 1}. <b>${item.header}</b>\n`
        + `${item.text}\n`}${
          item.voters ? `Количество участников: ${item.voters}\n` : ''
        }${DEEPLINK_TOKEN}start=${item.id}`
        : acc), replyHeader);
      return {
        ...state,
        [userId]: {
          ...state[userId],
          type: STATES.DEFAULT,
          reply,
          buttons: [],
        },
      };
    }

    case ACTIONS.ERROR: {
      const newState = { ...state };
      const { userId } = action.payload;
      newState[userId] = {
        ...state[userId],
        type: STATES.DEFAULT,
        reply: ERROR_MESSAGE,
        buttons: [BUTTONS.NEW],
      };
      return newState;
    }

    case ACTIONS.MOCK: {
      const newState = { ...state };
      const { userId } = action.payload;
      newState[userId] = {
        ...state[userId],
        type: STATES.DEFAULT,
        reply: MOCK_MESSAGE,
        buttons: [BUTTONS.NEW],
      };
      return newState;
    }

    default:
      return state;
  }
}

module.exports = botReducer;
