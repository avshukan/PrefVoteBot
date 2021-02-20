'use strict';

function createStore(storeReducer, storeState = {}) {
  let state = storeState;

  function dispatch(action) {
    console.log('dispatch action', action);
    console.log('dispatch state before', state);
    state = storeReducer(state, action);
    console.log('dispatch state after', state);
    return state;
  };

  function getState() {
    return state;
  }

  function getUserState(userId) {
    console.log('getUserState(userId) userId', userId);
    console.log('getUserState(userId) state', state);
    if (!state[userId])
      return {
        userId,
        clear_messages_queue: [],
      };
    return state[userId];
  }

  return { dispatch, getState, getUserState };
}

module.exports = createStore;
