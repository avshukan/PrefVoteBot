// const { STATES } = require('./state_types');

function createStore(storeReducer, storeState = {}) {
  let state = storeState;

  function dispatch(action) {
    console.log('state', state);
    console.log('state[149938780][0][buttons]', state && state[149938780] && state[149938780][0] && state[149938780][0].buttons);
    console.log('action', action);
    state = storeReducer(state, action);
    return state;
  }

  function getState() {
    return state;
  }

  function getUserState(userId) {
    if (!state[userId]) {
      return {
        // userId,
        // type: STATES.DEFAULT,
        clearMessagesQueue: [],
      };
    }
    return state[userId];
  }

  function getQuestionState(userId, questionId = 0) {
    const userState = getUserState(userId);
    if (!userState[questionId]) {
      return {};
    }
    return userState[questionId];
  }

  return {
    dispatch,
    getState,
    getUserState,
    getQuestionState,
  };
}

module.exports = createStore;
