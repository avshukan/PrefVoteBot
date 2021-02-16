'use strict';
function createStore(storeReducer, storeState = {}) {
  console.log('createStore', this);
  let state = storeState;

  function dispatch(action) {
    console.log('dispatch action this', this);
    console.log('dispatch state before', state);
    const { updatedState, handler } = storeReducer(state, action);
    state = updatedState;
    console.log('dispatch state after', state);
    return handler;
  };

  function getState() {
    return state;
  }

  return { dispatch, getState };
}

module.exports = createStore;
