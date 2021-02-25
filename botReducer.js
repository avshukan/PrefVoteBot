const { ACTIONS } = require('./action_types');
const { STATES } = require('./state_types');

const { DEEPLINK_TOKEN } = process.env;
const MOCK_MESSAGE = 'Данный функционал находится в разработке';

function botReducer(state = {}, action) {
  switch (action.type) {
    case ACTIONS.CREATE_VOTE: {
      const { userId } = action.payload;
      state[userId] = {
        ...state[userId],
        userId,
        id: userId,
        type: STATES.CREATE_HEADER,
        reply: 'Отправьте заголовок опроса',
        buttons: ['❌ Cancel'],
      };
      return state;
    }

    case ACTIONS.CREATE_HEADER: {
      const {
        userId, questionId, header, userMessageId,
      } = action.payload;
      const reply = `Заголовок: <b>${header}</b>\n\n`
      + 'Отправьте текст вопроса';
      state[userId] = {
        ...state[userId],
        userId,
        id: userId,
        type: STATES.CREATE_TEXT,
        questionId,
        header,
        clearMessagesQueue: [...(state[userId].clearMessagesQueue || []), userMessageId],
        reply,
        buttons: ['❌ Cancel'],
      };
      return state;
    }

    case ACTIONS.CREATE_TEXT: {
      const { userId, text, userMessageId } = action.payload;
      const reply = `Заголовок: <b>${state[userId].header}</b>\n`
      + `Вопрос: ${text}\n\n`
      + 'Отправьте вариант ответа';
      state[userId] = {
        ...state[userId],
        userId,
        id: userId,
        type: STATES.CREATE_OPTION,
        text,
        options: [],
        clearMessagesQueue: [...(state[userId].clearMessagesQueue || []), userMessageId],
        reply,
        buttons: ['❌ Cancel'],
      };
      return state;
    }

    case ACTIONS.CREATE_OPTION: {
      const { userId, option, userMessageId } = action.payload;
      const options = [...(state[userId].options || []), option];
      const defaultReply = `Заголовок: <b>${state[userId].header}</b>\n`
      + `Вопрос: ${state[userId].text}\n`
      + 'Варианты ответов:';
      const reply = options.reduce((acc, item) => `${acc}\n - ${item}`, defaultReply);
      const buttons = (options.length > 1) ? ['✔️ Done', '❌ Cancel'] : ['❌ Cancel'];
      state[userId] = {
        ...state[userId],
        userId,
        id: userId,
        type: STATES.CREATE_OPTION,
        options,
        clearMessagesQueue: [...(state[userId].clearMessagesQueue || []), userMessageId],
        reply: `${reply}\n\nОтправьте вариант ответа`,
        buttons,
      };
      return state;
    }

    case ACTIONS.CAST_VOTE: {
      const {
        userId,
        questionId,
        header,
        text,
        options,
      } = action.payload;
      const reply = `<b>${header}</b>\n${text}`;
      const buttons = [...options.map((option) => option.Name), '❌ Cancel'];
      state[userId] = {
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
      return state;
    }

    case ACTIONS.GET_OPTION: {
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
        buttons = [...options.map((option) => option.Name), '❌ Cancel'];
      }
      state[userId] = {
        ...state[userId],
        userId,
        id: userId,
        type: STATES.ANSWER,
        options,
        optionsSelected,
        reply,
        buttons,
      };
      return state;
    }

    case ACTIONS.GET_WRONG_OPTION: {
      const { userId, answer } = action.payload;
      const {
        header, text, options, optionsSelected,
      } = state[userId];
      const errorExplaination = optionsSelected.findIndex((optionSelected) => optionSelected.Name === answer) === -1
        ? `значения "<b>${answer}</b>" нет в списке вариантов`
        : `значение "<b>${answer}</b>" уже было выбрано вами`;
      const defaultReply = `Простите, ${errorExplaination}<b>\n`
        + `${header}</b>\n`
        + `${text}${optionsSelected.length === 0 ? '' : '\nВы уже выбрали:'}`;
      const reply = optionsSelected.reduce((acc, selectedOption, index) => `${acc}\n${index + 1}. ${selectedOption.Name}`, defaultReply);
      const buttons = [...options.map((option) => option.Name), '❌ Cancel'];
      state[userId] = {
        ...state[userId],
        userId,
        type: STATES.ANSWER,
        reply,
        buttons,
      };
      return state;
    }

    case ACTIONS.HEARS_CANCEL: {
      const { userId } = action.payload;
      let reply = 'Действие отменено';
      const type = state[userId] ? state[userId].type : STATES.DEFAULT;
      switch (type) {
        case STATES.CREATE_HEADER:
        case STATES.CREATE_TEXT:
        case STATES.CREATE_OPTION:
          reply = 'Создание опроса отменено';
          break;
        case STATES.ANSWER:
          reply = 'Участие в опросе прервано';
          break;
      }
      state[userId] = {
        ...state[userId],
        userId,
        id: userId,
        type: STATES.DEFAULT,
        reply,
        buttons: ['/new'],
      };
      return state;
    }

    case ACTIONS.HEARS_DONE: {
      const {
        userId, questionId, header, text, options,
      } = action.payload;
      const reply = `Опрос <b>${header}</b> сформирован!\n`
        + 'Принять участие можно по ссылке\n'
        + `${DEEPLINK_TOKEN}start=${questionId}`;
      state[userId] = {
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
      return state;
    }

    case ACTIONS.HEARS_RESULTS: {
      const { userId, questionId, result } = action.payload;
      state[userId] = {
        ...state[userId],
        userId,
        id: userId,
        type: STATES.DEFAULT,
        questionId,
        reply: result,
        buttons: [],
      };
      return state;
    }

    case ACTIONS.APPEND_MESSAGE_TO_QUEUE: {
      const { userId, messageId } = action.payload;
      state[userId] = {
        ...state[userId],
        clearMessagesQueue: [...(state[userId].clearMessagesQueue || []), messageId],
      };
      return state;
    }

    case ACTIONS.REMOVE_MESSAGE_FROM_QUEUE: {
      const { userId } = action.payload;
      state[userId] = {
        ...state[userId],
        clearMessagesQueue: [],
      };
      return state;
    }

    case ACTIONS.SHOW_ABOUT: {
      const { userId } = action.payload;
      state[userId] = {
        ...state[userId],
        type: STATES.DEFAULT,
        reply:
        'В преференциальной системе участник голосования выбирает не один вариант ответа, а расставляет их в порядке приоритета, сначала начиная с наиболее предпочтительного варианта.\n'
        + 'Для подведения итогов ботом используется метод подсчёта, разработанный Маркусом Шульце.\n\n'
+ 'https://ru.wikipedia.org/wiki/Преференциальное_голосование\n'
        + 'https://ru.wikipedia.org/wiki/Метод_Шульце',
        buttons: ['/new'],
      };
      return state;
    }

    case ACTIONS.MOCK: {
      const { userId } = action.payload;
      state[userId] = {
        ...state[userId],
        type: STATES.DEFAULT,
        reply: MOCK_MESSAGE,
        buttons: ['/new'],
      };
      return state;
    }

    default:
      return state;
  }
}

module.exports = botReducer;
