function createStore(storeReducer, storeState = {}) {
  let state = storeState;

  function dispatch(action) {
    state = storeReducer(state, action);
    return state;
  }

  function getState() {
    return state;
  }

  function getUserState(userId) {
    if (!state[userId]) {
      return {
        userId,
        clearMessagesQueue: [],
      };
    }
    return state[userId];
  }

  return { dispatch, getState, getUserState };
}

module.exports = createStore;
