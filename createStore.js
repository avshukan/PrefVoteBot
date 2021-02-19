'use strict';
const { ACTIONS } = require('./action_types');

function createStore(storeReducer, storeState = {}) {
  let state = storeState;

  function dispatch(action) {
    console.log('dispatch action', action);
    console.log('dispatch state before', state);
    if (
      action.type === ACTIONS.CREATE_VOTE ||
      action.type === ACTIONS.CREATE_HEADER ||
      action.type === ACTIONS.CREATE_TEXT ||
      action.type === ACTIONS.CREATE_OPTION ||
      action.type === ACTIONS.CAST_VOTE ||
      action.type === ACTIONS.HEARS_CANCEL ||
      action.type === ACTIONS.HEARS_DONE ||
      action.type === ACTIONS.HEARS_RESULTS
    ) {
      state = storeReducer(state, action);
      console.log('dispatch state after (handler)', state);
    } else {
      const { updatedState, handler } = storeReducer(state, action);
      state = updatedState;
      console.log('dispatch state after (other)', state);
      return handler;
    }
  };

  function getState() {
    return state;
  }

  function getUserState(userId) {
    console.log('getUserState(userId) userId', userId);
    console.log('getUserState(userId) state', state);
    if (!state[userId])
      return { userId };
    return state[userId];
  }

  return { dispatch, getState, getUserState };
}

module.exports = createStore;
