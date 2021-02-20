'use strict';

const { ACTIONS } = require('./action_types');
const { STATES } = require('./state_types');

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
      const { userId, questionId, header } = action.payload;
      state[userId] = {
        ...state[userId],
        userId,
        id: userId,
        type: STATES.CREATE_TEXT,
        questionId,
        header,
        reply: 'Отправьте текст вопроса',
        buttons: ['❌ Cancel'],
      };
      return state;
    }

    case ACTIONS.CREATE_TEXT: {
      const { userId, text } = action.payload;
      state[userId] = {
        ...state[userId],
        userId,
        id: userId,
        type: STATES.CREATE_OPTION,
        text,
        options: [],
        reply: 'Отправьте вариант ответа',
        buttons: ['❌ Cancel'],
      };
      return state;
    }

    case ACTIONS.CREATE_OPTION: {
      const { userId, option } = action.payload;
      const options = [...(state[userId].options || []), option];
      const buttons = (options.length > 1) ? ['✔️ Done', '❌ Cancel'] : ['❌ Cancel'];
      state[userId] = {
        ...state[userId],
        userId,
        id: userId,
        type: STATES.CREATE_OPTION,
        options,
        reply: 'Отправьте вариант ответа',
        buttons,
      };
      return state;
    }

    case ACTIONS.CAST_VOTE: {
      console.log('VOTE action', action);
      const {
        userId,
        questionId,
        info,
        header,
        text,
        options,
        optionsSelected,
      } = action.payload;
      let reply;
      let buttons;
      if (options.length === 0) {
        reply = `Вы завершили опрос <b>${header}</b> \nВаш выбор:`;
        optionsSelected.forEach((option, index) => {
          reply += `\n${index + 1}. ${option.Name}`;
        });
        buttons = ['👁 Results'];
      } else {
        reply = `${header}\n${text}\nВы уже выбрали:`;
        optionsSelected.forEach((option, index) => {
          reply += `\n${index + 1}. ${option.Name}`;
        });
        buttons = [...options.map(option => option.Name), '❌ Cancel'];
      }
      state[userId] = {
        ...state[userId],
        userId,
        id: userId,
        type: STATES.ANSWER,
        questionId,
        info,
        options,
        optionsSelected,
        reply,
        buttons,
      };
      return state;
    }

    case ACTIONS.HEARS_CANCEL: {
      const { userId } = action.payload;
      let reply = 'Действие отменено';
      switch (state[userId].type) {
        case STATES.CREATE_HEADER:
        case STATES.CREATE_TEXT:
        case STATES.CREATE_OPTION:
          reply = 'Создание опроса отменено';
          break;
        case STATES.ANSWER:
          reply = 'Участие в опросе прервано';
          break;
      };
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
      const { userId, questionId, header, text, options } = action.payload;
      const reply = `Опрос <b>${header}</b> сформирован!\n`
        + 'Принять участие можно по ссылке\n'
        + `https://telegram.me/prefVoteBot?start=${questionId}`;
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
      const { userId, message_id } = action.payload;
      console.log('ACTIONS.ADD_MESSAGE_TO_QUEUE state[userId]', state[userId]);
      state[userId] = {
        ...state[userId],
        clear_messages_queue: [...(state[userId].clear_messages_queue || []), message_id],
      };
      console.log('ACTIONS.ADD_MESSAGE_TO_QUEUE state[userId]', state[userId]);
      return state;
    }

    default:
      return state;
  }
}

module.exports = botReducer;
