'use strict';

function createStore(storeReducer, storeState = {}) {
  let state = storeState;

  function dispatch(action) {
    console.log('dispatch action', action);
    console.log('dispatch state before', state);
    if (
      action.type === 'VOTE' ||
      action.type === 'NEW COMMAND' ||
      action.type === 'HEARS DONE' ||
      action.type === 'HEARS RESULT' ||
      action.type === 'HEARS CANCEL'
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
