'use strict';
const {
  ACTION_CREATE_VOTE,
  ACTION_CREATE_HEADER,
  ACTION_CREATE_TEXT,
  ACTION_CREATE_OPTION,
  ACTION_CAST_VOTE,
  ACTION_HEARS_CANCEL,
  ACTION_HEARS_DONE,
  ACTION_HEARS_RESULTS,
} = require('./action_types');

function createStore(storeReducer, storeState = {}) {
  let state = storeState;

  function dispatch(action) {
    console.log('dispatch action', action);
    console.log('dispatch state before', state);
    if (
      action.type === ACTION_CREATE_VOTE ||
      action.type === ACTION_CREATE_HEADER ||
      action.type === ACTION_CREATE_TEXT ||
      action.type === ACTION_CREATE_OPTION ||
      action.type === ACTION_CAST_VOTE ||
      action.type === ACTION_HEARS_CANCEL ||
      action.type === ACTION_HEARS_DONE ||
      action.type === ACTION_HEARS_RESULTS
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
