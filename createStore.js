'use strict';
function createStore(storeReducer, storeState = {}) {
  console.log('createStore', this);
  let state = storeState;

  function dispatch(action) {
    console.log('dispatch action', action);
    console.log('dispatch state before', state);
    if (action.type === 'HEARS DONE 2') {
      state = storeReducer(state, action);
      console.log('dispatch state after (hears done 2)', state);
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