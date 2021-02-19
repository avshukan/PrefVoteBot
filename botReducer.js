// https://medium.com/devschacht/jakob-lind-learn-redux-by-coding-a-mini-redux-d1a58e830514
// https://medium.com/devschacht/jakob-lind-code-your-own-redux-part-2-the-connect-function-d941dc247c58
// https://habr.com/ru/post/439104/
// https://habr.com/ru/post/328152/

'use strict';
const { Markup } = require('telegraf');
const { ACTIONS } = require('./action_types');
const { STATES } = require('./state_types');

function botReducer(state = {}, action) {
  switch (action.type) {
    case ACTIONS.CREATE_VOTE: {
      const { userId, reply } = action.payload;
      state[userId] = { id: userId, type: STATES.CREATE_HEADER, reply };
      return state;
    }

    case ACTIONS.CAST_VOTE: {
      const {
        userId,
        questionId,
        info,
        options,
        optionsSelected,
      } = action.payload;
      console.log('VOTE action', action);
      state[userId] = {
        ...state[userId],
        id: userId,
        type: STATES.ANSWER,
        questionId,
        info,
        options,
        optionsSelected,
      };
      return state;
    }

    case ACTIONS.HEARS_CANCEL: {
      const { userId, reply } = action.payload;
      state[userId] = { id: userId, type: STATES.DEFAULT, reply };
      return state;
    }

    case ACTIONS.HEARS_DONE: {
      const { userId, questionId, header, text, options, reply } = action.payload;
      state[userId] = { id: userId, type: STATES.DEFAULT, questionId, header, text, options, reply };
      return state;
    }

    case ACTIONS.HEARS_RESULTS: {
      const { userId, questionId } = action.payload;
      state[userId] = { id: userId, type: STATES.DEFAULT, questionId };
      return state;
    }

    case ACTIONS.CREATE_HEADER: {
      const { userId, questionId, header, reply } = action.payload;
      state[userId] = {
        ...state[userId],
        id: userId,
        type: STATES.CREATE_TEXT,
        questionId,
        header,
        reply
      };
      return state;
    }

    case ACTIONS.CREATE_TEXT: {
      const { userId, questionId, text, reply } = action.payload;
      state[userId] = {
        ...state[userId],
        id: userId,
        type: STATES.CREATE_OPTION,
        questionId,
        text,
        options: [],
        reply
      };
      return state;
    }

    case ACTIONS.CREATE_OPTION: {
      const { userId, questionId, option, reply } = action.payload;
      const options = [...state[userId].options, option];
      state[userId] = {
        ...state[userId],
        id: userId,
        type: STATES.CREATE_OPTION,
        questionId,
        options,
        reply
      };
      return state;
    }

    default:
      return state;
  }
}

module.exports = botReducer;
