const ACTIONS = {
  CREATE_VOTE: 'ACTION_CREATE_VOTE',
  CREATE_HEADER: 'ACTION_CREATE_HEADER',
  CREATE_TEXT: 'ACTION_CREATE_TEXT',
  CREATE_OPTION: 'ACTION_CREATE_OPTION',
  CAST_VOTE: 'ACTION_CAST_VOTE',
  GET_OPTION: 'ACTION_GET_OPTION',
  GET_WRONG_OPTION: 'ACTION_CAST_WRONG_OPTION',
  HEARS_CANCEL: 'ACTION_HEARS_CANCEL',
  HEARS_COMPLETE: 'ACTION_HEARS_COMPLETE',
  HEARS_DONE: 'ACTION_HEARS_DONE',
  HEARS_RESULTS: 'ACTION_HEARS_RESULTS',
  APPEND_MESSAGE_TO_QUEUE: 'ACTION_APPEND_MESSAGE_TO_QUEUE',
  REMOVE_MESSAGE_FROM_QUEUE: 'ACTION_REMOVE_MESSAGE_FROM_QUEUE',
  SHOW_ABOUT: 'ACTION_SHOW_ABOUT',
  GET_QUESTIONS_LIST: 'GET_QUESTIONS_LIST',
  ERROR: 'ACTION_ERROR',
  MOCK: 'ACTION_MOCK',
};

module.exports = { ACTIONS };
